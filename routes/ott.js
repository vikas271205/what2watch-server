import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

const RAPID_KEY = process.env.STREAMING_AVAILABILITY_KEY;
const RAPID_HOST = "streaming-availability.p.rapidapi.com";

router.get("/trending", async (_req, res) => {
  if (!RAPID_KEY) {
    console.error("[OTT] Missing STREAMING_AVAILABILITY_KEY");
    return res.status(500).json({ error: "OTT API key not configured" });
  }

  const cacheKey = "ott_trending_india_hi";

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    const url =
      "https://streaming-availability.p.rapidapi.com/shows/search/filters" +
      "?country=in" +
      "&series_granularity=show" +
      "&order_by=popularity_alltime" +
      "&show_original_language=hi" +
      "&output_language=en" +
      "&catalogs=netflix,prime,hotstar,sonyliv,zee5" +
      "&show_type=series";

    const r = await fetch(url, {
      headers: {
        "x-rapidapi-key": RAPID_KEY,
        "x-rapidapi-host": RAPID_HOST,
      },
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("[OTT] RapidAPI error", r.status, t);
      return res.status(500).json({ error: "Failed to fetch trending OTT titles" });
    }

    const data = await r.json();

    if (!Array.isArray(data?.shows)) {
      return res.json([]);
    }

    const normalized = data.shows.map((s) => ({
      title: s.title,
      tmdbId: s.tmdb_id,
      imdbId: s.imdb_id,
      year: s.releaseYear,
      poster: s.imageSet?.verticalPoster?.w600,
      backdrop: s.imageSet?.horizontalPoster?.w1080,
      platform: Object.keys(s.streamingOptions?.in || {})[0] || null,
      watchUrl:
        Object.values(s.streamingOptions?.in || {})[0]?.[0]?.link || null,
      rating: s.rating,
      type: s.showType,
    }));

    cache.set(cacheKey, normalized);
    res.json(normalized);
  } catch (err) {
    console.error("[OTT TRENDING ERROR]", err);
    res.status(500).json({ error: "Failed to fetch trending OTT titles" });
  }
});

export default router;
