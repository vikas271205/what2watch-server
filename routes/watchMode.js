import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
const router = express.Router();

const API_KEY = process.env.WATCHMODE_API_KEY;
const cache = new NodeCache({ stdTTL: 6 * 60 * 60 }); // 6 hours

// === Route to get Watchmode ID ===
router.get("/id", async (req, res) => {
  const { title, year, tmdbId } = req.query;
  const cacheKey = `watchmode_id_${title}_${year}_${tmdbId}`;

  if (cache.has(cacheKey)) {
    console.log(`[Watchmode ID] ✅ Cache hit for: ${cacheKey}`);
    return res.json({ id: cache.get(cacheKey) });
  }

  console.log(`[Watchmode ID] ❌ Cache miss for: ${cacheKey}`);
  const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_value=${encodeURIComponent(
    title
  )}&search_field=name&search_type=movie`;

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.title_results || data.title_results.length === 0)
      return res.status(404).json({ id: null });

    const cleanedTitle = title.toLowerCase().trim();
    let result;

    if (tmdbId) {
      result = data.title_results.find(
        (item) => item.tmdb_id?.toString() === tmdbId
      );
    }

    if (!result && year) {
      result = data.title_results.find(
        (item) =>
          item.name?.toLowerCase().trim() === cleanedTitle &&
          item.year?.toString() === year
      );
    }

    if (!result) {
      result = data.title_results.find(
        (item) => item.name?.toLowerCase().trim() === cleanedTitle
      );
    }

    if (!result) {
      result = data.title_results.find((item) =>
        item.name?.toLowerCase().includes(cleanedTitle)
      );
    }

    if (!result) {
      result = data.title_results[0];
    }

    if (result) {
      cache.set(cacheKey, result.id);
      return res.json({ id: result.id });
    } else {
      return res.status(404).json({ id: null });
    }
  } catch (err) {
    console.error("Error fetching Watchmode ID:", err);
    return res.status(500).json({ error: "Failed to fetch Watchmode ID" });
  }
});

// === Route to get streaming sources ===
router.get("/sources/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `watchmode_sources_${id}`;

  if (cache.has(cacheKey)) {
    console.log(`[Watchmode Sources] ✅ Cache hit for ID: ${id}`);
    return res.json(cache.get(cacheKey));
  }

  console.log(`[Watchmode Sources] ❌ Cache miss for ID: ${id}`);

  try {
    const url = `https://api.watchmode.com/v1/title/${id}/sources/?apiKey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const preferredPlatforms = [
      "Netflix",
      "Amazon",
      "Prime Video",
      "JioCinema",
      "Hotstar",
      "Disney+ Hotstar",
      "Zee5",
      "SonyLiv",
      "Hungama Play",
      "AppleTV",
      "Amazon Video",
    ];

    const filtered = data
      .filter(
        (s) =>
          s.region === "IN" &&
          s.web_url &&
          preferredPlatforms.includes(s.name) &&
          ["sub", "buy", "rent"].includes(s.type)
      )
      .reduce((acc, curr) => {
        if (!acc.some((s) => s.name === curr.name && s.type === curr.type)) {
          acc.push(curr);
        }
        return acc;
      }, []);

    cache.set(cacheKey, filtered);
    return res.json(filtered);
  } catch (err) {
    console.error("Error fetching streaming sources:", err);
    return res.status(500).json({ error: "Failed to fetch streaming sources" });
  }
});

export { router as watchmodeRouter };