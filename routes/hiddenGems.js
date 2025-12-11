import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 43200 }); // 12 hours
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ Missing TMDB_API_KEY in env");
}

const hiddenGemLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests. Please try again later.",
});

// ----------------------
// HIDDEN GEMS ROUTE
// ----------------------
router.get("/", hiddenGemLimiter, async (req, res) => {
  console.log("🔎 [HiddenGems] Incoming request from:", req.ip);

  const cacheKey = "hidden_gems_v1";

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    console.log(`🧠 [HiddenGems] Memory cache hit → items: ${cached.length}`);
    return res.json(cached);
  }

  console.log("🟡 [HiddenGems] Cache miss. Fetching from TMDB...");

  try {
    const url =
      `https://api.themoviedb.org/3/discover/movie?` +
      `api_key=${TMDB_API_KEY}` +
      `&sort_by=vote_average.desc` +
      `&vote_average.gte=7` +
      `&vote_count.lte=2000` +
      `&popularity.lte=50` +
      `&include_adult=false` +
      `&language=en-US`;

    const safeUrl = url.replace(TMDB_API_KEY, "HIDDEN_API_KEY");
    console.log("🌐 [HiddenGems] TMDB URL:", safeUrl);

    const response = await fetch(url);
    console.log("📡 [HiddenGems] TMDB status:", response.status);
    console.log(
      "⏳ [HiddenGems] Remaining rate-limit:",
      response.headers.get("x-ratelimit-remaining")
    );

    const raw = await response.text();
    console.log("📄 [HiddenGems] TMDB raw length:", raw.length);
    console.log("📄 [HiddenGems] TMDB raw sample:", raw.slice(0, 200));

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error("❌ [HiddenGems] Invalid JSON:", raw.slice(0, 200));
      return res.status(500).json({ error: "Invalid TMDB JSON" });
    }

    const results = json?.results || [];
    console.log(`📊 [HiddenGems] Results count: ${results.length}`);

    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error("❌ [HiddenGems] Fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch hidden gems" });
  }
});

export { router as hiddenGemsRouter };
