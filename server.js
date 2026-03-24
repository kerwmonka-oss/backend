// server.js
import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cheerio from "cheerio";
import NodeCache from "node-cache";
import path from "path";
import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Cache Setup ---
const matchCache = new NodeCache({ stdTTL: 300 });

// --- Helper Functions ---
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
}

// --- Scraper Class ---
class OvogoalScraper {
  constructor() {
    this.name = "Ovogoal";
    this.selectors = {
      matchRow: ".stream-row",
      time: ".stream-time",
      info: ".stream-info",
      categoryAttr: "data-category",
      watchBtn: ".watch-btn",
      iframe: "iframe",
    };
  }

  async scrapeMatches() {
    const matches = [];
    try {
      console.log(`[${this.name}] Fetching main page...`);
      const res = await fetchWithRetry("https://ovogoal.plus/", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);
      const matchLinks = [];

      $(this.selectors.matchRow).each((i, el) => {
        const time = $(el).find(this.selectors.time).text().trim();
        const info = $(el).find(this.selectors.info).text().trim();
        const category = $(el).attr(this.selectors.categoryAttr) || "Football";
        const onclick = $(el).find(this.selectors.watchBtn).attr("onclick");

        let link = "";
        if (onclick) {
          const match = onclick.match(/window\.location\.href='([^']+)'/);
          if (match) link = match[1];
        }
        if (link) matchLinks.push({ time, info, category, link });
      });

      console.log(`[${this.name}] Found ${matchLinks.length} match links.`);
      const chunkSize = 5;

      for (let i = 0; i < matchLinks.length; i += chunkSize) {
        const chunk = matchLinks.slice(i, i + chunkSize);
        const fetchPromises = chunk.map(async m => {
          try {
            const matchRes = await fetchWithRetry(m.link, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Referer: "https://ovogoal.plus/",
              },
              timeout: 10000,
            });

            const $m = cheerio.load(matchRes.data);
            const iframes = $m(this.selectors.iframe).map((_, el) => $m(el).attr("src")).get();

            const m3u8Links = [];
            const htmlContent = matchRes.data;
            const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g;
            let match;
            while ((match = m3u8Regex.exec(htmlContent)) !== null) {
              m3u8Links.push(match[1]);
            }

            if (iframes.length > 0 || m3u8Links.length > 0) {
              const teams = m.info.split(" vs ");
              const homeTeam = teams[0]?.trim() || "Unknown";
              const awayTeam = teams[1]?.trim() || "Unknown";

              const servers = [];

              iframes.forEach(iframeSrc => {
                servers.push({
                  id: uuidv4(),
                  name: `Server ${servers.length + 1} (Iframe)`,
                  url: Buffer.from(iframeSrc).toString("base64"),
                  type: "iframe",
                  quality: "Auto",
                  status: "checking",
                  source: this.name,
                });
              });

              m3u8Links.forEach(m3u8Src => {
                servers.push({
                  id: uuidv4(),
                  name: `Server ${servers.length + 1} (Direct)`,
                  url: Buffer.from(m3u8Src).toString("base64"),
                  type: "hls",
                  quality: "Auto",
                  status: "checking",
                  source: this.name,
                });
              });

              matches.push({
                id: uuidv4(),
                title: m.info,
                competition: m.category,
                startTime: m.time,
                status: "live",
                homeTeam,
                awayTeam,
                score: "0 - 0",
                servers,
                pageUrl: m.link,
              });
            }
          } catch (err) {
            console.error(`[${this.name}] Error fetching match details for ${m.link}:`, err.message);
          }
        });

        await Promise.all(fetchPromises);
        if (i + chunkSize < matchLinks.length) await new Promise(res => setTimeout(res, 1000));
      }
    } catch (err) {
      console.error(`[${this.name}] Error scraping main page:`, err.message);
    }

    return matches;
  }
}

const scrapers = [new OvogoalScraper()];

// --- Stream Validation Layer ---
async function validateStream(server) {
  if (server.type === "iframe") {
    server.status = "online";
    return server;
  }

  try {
    const decodedUrl = Buffer.from(server.url, "base64").toString("utf-8");
    const response = await axios.head(decodedUrl, { timeout: 5000 });
    server.status = response.status >= 200 && response.status < 400 ? "online" : "offline";
  } catch {
    server.status = "offline";
  }
  return server;
}

// --- Background Worker ---
async function fetchAndValidateMatches() {
  console.log("[Worker] Starting match scraping cycle...");
  let allMatches = [];

  for (const scraper of scrapers) {
    try {
      console.log(`[Worker] Scraping from ${scraper.name}...`);
      const matches = await scraper.scrapeMatches();
      allMatches = [...allMatches, ...matches];
    } catch (err) {
      console.error(`[Worker] Error scraping ${scraper.name}:`, err.message);
    }
  }

  console.log(`[Worker] Found ${allMatches.length} matches. Validating streams...`);

  for (const match of allMatches) {
    const validationPromises = match.servers.map(s => validateStream(s));
    match.servers = await Promise.all(validationPromises);
    match.servers = match.servers.filter(s => s.status === "online");
  }

  const validMatches = allMatches.filter(m => m.servers.length > 0);
  console.log(`[Worker] Validation complete. ${validMatches.length} matches have active streams.`);
  matchCache.set("live_matches", validMatches);
}

// Schedule worker every 2 minutes
cron.schedule("*/2 * * * *", fetchAndValidateMatches);
// Run once on startup
fetchAndValidateMatches();

// --- API Endpoints ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/matches", (req, res) => {
  const matches = matchCache.get("live_matches") || [];
  if (matches.length === 0) return res.json({ status: "empty", message: "No matches found on the website" });

  const formattedMatches = matches.map(m => {
    let timeStr = m.startTime;
    try {
      const d = new Date(m.startTime);
      if (!isNaN(d.getTime())) timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {}

    return {
      match: m.title,
      league: m.competition,
      status: m.status,
      time: timeStr,
      page_url: m.pageUrl,
      streams: m.servers.map(s => ({
        server: s.name,
        type: s.type === "hls" ? "m3u8" : s.type,
        url: Buffer.from(s.url, "base64").toString("utf-8"),
        quality: s.quality,
      })),
    };
  });

  res.json({ status: "success", matches: formattedMatches });
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
