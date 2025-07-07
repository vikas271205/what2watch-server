import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const cache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // Cache for 24 hours

// Rate limiter: max 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Rate limit exceeded. Try again later." },
});

router.use(limiter);

// 📽️ GET OMDb data by title (and optional year)
router.get("/", async (req, res) => {
  const { title, year } = req.query;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  const cacheKey = `omdb_${title}_${year || ""}`;
  try {
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }
    const query = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log(`OMDB API response for title "${title}"${year ? ` year ${year}` : ""}:`, data);

    if (data.Response === "False") {
      return res.status(404).json({ error: data.Error || "Movie not found" });
    }

    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("OMDb API Error:", err);
    res.status(500).json({ error: "Failed to fetch OMDb data" });
  }
});

export { router as omdbRouter };