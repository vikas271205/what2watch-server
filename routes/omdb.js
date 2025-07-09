import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 86400 }); // 1 day cache
const OMDB_API_KEY = process.env.OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error("❌ Missing OMDB_API_KEY in env");
}

const omdbLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many requests. Please try again later.",
});

router.get("/", omdbLimiter, async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.status(400).json({ error: "title is required" });

  const cacheKey = `omdb_${title}_${year || ""}`;

  if (cache.has(cacheKey)) {
    console.log(`🧠 OMDb cache hit: ${cacheKey}`);
    return res.json(cache.get(cacheKey));
  }

  try {
    const query = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    console.log("🌐 Fetching OMDb:", url);
    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Invalid JSON from OMDb:", text.slice(0, 100));
      cache.set(cacheKey, { error: "Invalid JSON response" }, 3600);
      return res.status(500).json({ error: "Invalid response from OMDb" });
    }

    if (data.Response === "False") {
      console.warn(`⚠️ OMDb: ${data.Error} for "${title}" (${year})`);
      cache.set(cacheKey, { error: data.Error }, 3600);
      return res.status(404).json({ error: data.Error });
    }

    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("OMDb API Error:", err);
    res.status(500).json({ error: "Failed to fetch OMDb data" });
  }
});

export { router as omdbRouter };