"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var vite_1 = require("vite");
var axios_1 = require("axios");
var cheerio = require("cheerio");
var node_cache_1 = require("node-cache");
var path_1 = require("path");
var node_cron_1 = require("node-cron");
var uuid_1 = require("uuid");
var cors_1 = require("cors");
var app = (0, express_1.default)();
var PORT = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Cache Setup ---
// Cache matches for 5 minutes
var matchCache = new node_cache_1.default({ stdTTL: 300 });
// --- Helper Functions ---
function fetchWithRetry(url_1, options_1) {
    return __awaiter(this, arguments, void 0, function (url, options, retries) {
        var _loop_1, i, state_1;
        if (retries === void 0) { retries = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (i) {
                        var _b, err_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 4]);
                                    _b = {};
                                    return [4 /*yield*/, axios_1.default.get(url, options)];
                                case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                case 2:
                                    err_1 = _c.sent();
                                    if (i === retries - 1)
                                        throw err_1;
                                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, 1000 * (i + 1)); })];
                                case 3:
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(i)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var OvogoalScraper = /** @class */ (function () {
    function OvogoalScraper() {
        this.name = "Ovogoal";
        // Modular selectors
        this.selectors = {
            matchRow: '.stream-row',
            time: '.stream-time',
            info: '.stream-info',
            categoryAttr: 'data-category',
            watchBtn: '.watch-btn',
            iframe: 'iframe'
        };
    }
    OvogoalScraper.prototype.scrapeMatches = function () {
        return __awaiter(this, void 0, void 0, function () {
            var matches, res, $_1, matchLinks_1, chunkSize, i, chunk, fetchPromises, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        matches = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        console.log("[".concat(this.name, "] Fetching main page..."));
                        return [4 /*yield*/, fetchWithRetry('https://ovogoal.plus/', {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                },
                                timeout: 10000
                            })];
                    case 2:
                        res = _a.sent();
                        $_1 = cheerio.load(res.data);
                        matchLinks_1 = [];
                        $_1(this.selectors.matchRow).each(function (i, el) {
                            var time = $_1(el).find(_this.selectors.time).text().trim();
                            var info = $_1(el).find(_this.selectors.info).text().trim();
                            var category = $_1(el).attr(_this.selectors.categoryAttr) || 'Football';
                            var onclick = $_1(el).find(_this.selectors.watchBtn).attr('onclick');
                            var link = '';
                            if (onclick) {
                                var match = onclick.match(/window\.location\.href='([^']+)'/);
                                if (match)
                                    link = match[1];
                            }
                            if (link) {
                                matchLinks_1.push({ time: time, info: info, category: category, link: link });
                            }
                        });
                        console.log("[".concat(this.name, "] Found ").concat(matchLinks_1.length, " match links."));
                        chunkSize = 5;
                        i = 0;
                        _a.label = 3;
                    case 3:
                        if (!(i < matchLinks_1.length)) return [3 /*break*/, 7];
                        chunk = matchLinks_1.slice(i, i + chunkSize);
                        fetchPromises = chunk.map(function (m) { return __awaiter(_this, void 0, void 0, function () {
                            var matchRes, $m_1, iframes, m3u8Links, htmlContent, m3u8Regex, match, teams, homeTeam, awayTeam, servers_1, err_2;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, fetchWithRetry(m.link, {
                                                headers: {
                                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                                    'Referer': 'https://ovogoal.plus/'
                                                },
                                                timeout: 10000
                                            })];
                                    case 1:
                                        matchRes = _a.sent();
                                        $m_1 = cheerio.load(matchRes.data);
                                        iframes = $m_1(this.selectors.iframe).map(function (_, el) { return $m_1(el).attr('src'); }).get();
                                        m3u8Links = [];
                                        htmlContent = matchRes.data;
                                        m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g;
                                        match = void 0;
                                        while ((match = m3u8Regex.exec(htmlContent)) !== null) {
                                            m3u8Links.push(match[1]);
                                        }
                                        if (iframes.length > 0 || m3u8Links.length > 0) {
                                            teams = m.info.split(' vs ');
                                            homeTeam = teams[0] ? teams[0].trim() : 'Unknown';
                                            awayTeam = teams[1] ? teams[1].trim() : 'Unknown';
                                            servers_1 = [];
                                            iframes.forEach(function (iframeSrc, idx) {
                                                servers_1.push({
                                                    id: (0, uuid_1.v4)(),
                                                    name: "Server ".concat(servers_1.length + 1, " (Iframe)"),
                                                    url: Buffer.from(iframeSrc).toString('base64'),
                                                    type: 'iframe',
                                                    quality: 'Auto',
                                                    status: 'checking',
                                                    source: _this.name
                                                });
                                            });
                                            m3u8Links.forEach(function (m3u8Src, idx) {
                                                servers_1.push({
                                                    id: (0, uuid_1.v4)(),
                                                    name: "Server ".concat(servers_1.length + 1, " (Direct)"),
                                                    url: Buffer.from(m3u8Src).toString('base64'),
                                                    type: 'hls',
                                                    quality: 'Auto',
                                                    status: 'checking',
                                                    source: _this.name
                                                });
                                            });
                                            matches.push({
                                                id: (0, uuid_1.v4)(),
                                                title: m.info,
                                                competition: m.category,
                                                startTime: m.time,
                                                status: 'live',
                                                homeTeam: homeTeam,
                                                awayTeam: awayTeam,
                                                score: "0 - 0",
                                                servers: servers_1,
                                                pageUrl: m.link
                                            });
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        err_2 = _a.sent();
                                        console.error("[".concat(this.name, "] Error fetching match details for ").concat(m.link, ":"), err_2.message);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(fetchPromises)];
                    case 4:
                        _a.sent();
                        if (!(i + chunkSize < matchLinks_1.length)) return [3 /*break*/, 6];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        i += chunkSize;
                        return [3 /*break*/, 3];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _a.sent();
                        console.error("[".concat(this.name, "] Error scraping main page:"), error_1.message);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, matches];
                }
            });
        });
    };
    return OvogoalScraper;
}());
var scrapers = [new OvogoalScraper()];
// --- Stream Validation Layer ---
function validateStream(server) {
    return __awaiter(this, void 0, void 0, function () {
        var decodedUrl, response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (server.type === 'iframe') {
                        // Iframes are hard to validate without a headless browser, assume online for now
                        server.status = 'online';
                        return [2 /*return*/, server];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    decodedUrl = Buffer.from(server.url, 'base64').toString('utf-8');
                    return [4 /*yield*/, axios_1.default.head(decodedUrl, { timeout: 5000 })];
                case 2:
                    response = _a.sent();
                    if (response.status >= 200 && response.status < 400) {
                        server.status = 'online';
                    }
                    else {
                        server.status = 'offline';
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    server.status = 'offline';
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, server];
            }
        });
    });
}
// --- Background Worker ---
function fetchAndValidateMatches() {
    return __awaiter(this, void 0, void 0, function () {
        var allMatches, _i, scrapers_1, scraper, matches, error_3, _a, allMatches_1, match, validationPromises, _b, validMatches;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("[Worker] Starting match scraping cycle...");
                    allMatches = [];
                    _i = 0, scrapers_1 = scrapers;
                    _c.label = 1;
                case 1:
                    if (!(_i < scrapers_1.length)) return [3 /*break*/, 6];
                    scraper = scrapers_1[_i];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    console.log("[Worker] Scraping from ".concat(scraper.name, "..."));
                    return [4 /*yield*/, scraper.scrapeMatches()];
                case 3:
                    matches = _c.sent();
                    allMatches = __spreadArray(__spreadArray([], allMatches, true), matches, true);
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _c.sent();
                    console.error("[Worker] Error scraping ".concat(scraper.name, ":"), error_3.message);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("[Worker] Found ".concat(allMatches.length, " matches. Validating streams..."));
                    _a = 0, allMatches_1 = allMatches;
                    _c.label = 7;
                case 7:
                    if (!(_a < allMatches_1.length)) return [3 /*break*/, 10];
                    match = allMatches_1[_a];
                    validationPromises = match.servers.map(function (server) { return validateStream(server); });
                    _b = match;
                    return [4 /*yield*/, Promise.all(validationPromises)];
                case 8:
                    _b.servers = _c.sent();
                    // Filter out offline servers
                    match.servers = match.servers.filter(function (s) { return s.status === 'online'; });
                    _c.label = 9;
                case 9:
                    _a++;
                    return [3 /*break*/, 7];
                case 10:
                    validMatches = allMatches.filter(function (m) { return m.servers.length > 0; });
                    console.log("[Worker] Validation complete. ".concat(validMatches.length, " matches have active streams."));
                    // Update cache
                    matchCache.set("live_matches", validMatches);
                    return [2 /*return*/];
            }
        });
    });
}
// Schedule the worker to run every 2 minutes
node_cron_1.default.schedule("*/2 * * * *", function () {
    fetchAndValidateMatches();
});
// Run once on startup
fetchAndValidateMatches();
// --- API Endpoints ---
app.get("/api/health", function (req, res) {
    res.json({ status: "ok", uptime: process.uptime() });
});
app.get("/api/matches", function (req, res) {
    var matches = matchCache.get("live_matches") || [];
    if (matches.length === 0) {
        return res.json({
            status: "empty",
            message: "No matches found on the website"
        });
    }
    var formattedMatches = matches.map(function (m) {
        // Format time to HH:MM if it's a valid date string, otherwise keep as is
        var timeStr = m.startTime;
        try {
            var d = new Date(m.startTime);
            if (!isNaN(d.getTime())) {
                timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        catch (e) { }
        return {
            match: m.title,
            league: m.competition,
            status: m.status,
            time: timeStr,
            page_url: m.pageUrl,
            streams: m.servers.map(function (s) { return ({
                server: s.name,
                type: s.type === 'hls' ? 'm3u8' : s.type,
                url: Buffer.from(s.url, 'base64').toString('utf-8'),
                quality: s.quality
            }); })
        };
    });
    res.json({
        status: "success",
        matches: formattedMatches
    });
});
// --- Vite Integration ---
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var vite, distPath_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(process.env.NODE_ENV !== "production")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, vite_1.createServer)({
                            server: { middlewareMode: true },
                            appType: "spa",
                        })];
                case 1:
                    vite = _a.sent();
                    app.use(vite.middlewares);
                    return [3 /*break*/, 3];
                case 2:
                    distPath_1 = path_1.default.join(process.cwd(), "dist");
                    app.use(express_1.default.static(distPath_1));
                    app.get("*", function (req, res) {
                        res.sendFile(path_1.default.join(distPath_1, "index.html"));
                    });
                    _a.label = 3;
                case 3:
                    app.listen(PORT, "0.0.0.0", function () {
                        console.log("Server running on http://localhost:".concat(PORT));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
startServer();
