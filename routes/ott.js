import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 1800 });

const RAPID_KEY = process.env.STREAMING_AVAILABILITY_KEY;
const RAPID_HOST = "streaming-availability.p.rapidapi.com";
const TMDB_KEY = process.env.TMDB_API_KEY;

router.get("/trending", async (_req, res) => {

  if (!RAPID_KEY) {
    console.error("[OTT] ❌ Missing STREAMING_AVAILABILITY_KEY");
    return res.status(500).json({ error: "OTT API key not configured" });
  }

  const cacheKey = "ott_trending_india_hi_debug";

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



    const rawText = await r.text();
 
    if (!r.ok) {
      console.error("[OTT] ❌ RapidAPI failed");
      return res.status(500).json({ error: "Failed to fetch OTT titles" });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("[OTT] ❌ JSON parse failed");
      return res.json([]);
    }

    if (!Array.isArray(data?.shows)) {
      console.warn("[OTT] ❌ data.shows missing");
      return res.json([]);
    }

const results = [];

for (const s of data.shows.slice(0, 20)) {


  if (!s.tmdbId || !s.tmdbId.includes("/")) {
    console.warn("  ⤷ skipped (invalid tmdbId)");
    continue;
  }

  // ✅ Parse tmdbId like "tv/124411"
  const [tmdbType, tmdbIdRaw] = s.tmdbId.split("/");
  const tmdbId = Number(tmdbIdRaw);

  if (!tmdbId || tmdbType !== "tv") {
    console.warn("  ⤷ skipped (not TV)");
    continue;
  }

  let tmdb = null;

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}`;
 

    const tmdbRes = await fetch(tmdbUrl);
   
    if (tmdbRes.ok) {
      tmdb = await tmdbRes.json();
    }
  } catch {
    console.warn("  ⤷ TMDB fetch failed");
  }

  results.push({
    id: tmdbId,                 // ✅ REQUIRED for /tv/:id
    title: tmdb?.name || s.title,
    year:
      tmdb?.first_air_date?.slice(0, 4) ||
      s.releaseYear ||
      null,
    rating:
      tmdb?.vote_average?.toFixed(1) ||
      s.rating ||
      null,
    poster:
      tmdb?.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
        : s.imageSet?.verticalPoster?.w600 ||
          null,
    backdrop:
      tmdb?.backdrop_path
        ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`
        : s.imageSet?.horizontalPoster?.w1080 ||
          null,
    platform:
      Object.keys(s.streamingOptions?.in || {})[0] || null,
    watchUrl:
      Object.values(s.streamingOptions?.in || {})[0]?.[0]?.link || null,
    isTV: true,
    type: "tv",
  });
}


    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error("[OTT] ❌ UNCAUGHT ERROR", err);
    return res.status(500).json({ error: "Failed to fetch trending OTT titles" });
  }
});

export default router;
