import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 6 * 60 * 60 });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";
const CURRENT_YEAR = new Date().getFullYear();

const ALLOWED_LANGUAGES = ["en", "hi", "ko", "ja", "es", "fr"];

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // lowered to protect TMDB + Render
});

/* ---------- Safe fetch with timeout ---------- */
async function fetchWithTimeout(url, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

router.get("/", limiter, async (_req, res) => {
  const cacheKey = "hidden_gems_rotating_v6";

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    const moviePages = [1, 2];
    const tvPages = [1, 2];

    const movieResults = [];
    const tvResults = [];

    /* ---------- MOVIES ---------- */
    for (const p of moviePages) {
      try {
        const r = await fetchWithTimeout(
          `${BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
            `&sort_by=vote_average.desc` +
            `&vote_average.gte=7` +
            `&vote_count.gte=200` +
            `&include_adult=false` +
            `&page=${p}`
        );

        if (!r.ok) continue;
        const data = await r.json();
        if (Array.isArray(data?.results)) {
          movieResults.push(...data.results);
        }
      } catch (e) {
        console.warn("[HiddenGems] Movie page failed:", p);
      }
    }

    /* ---------- TV ---------- */
    for (const p of tvPages) {
      try {
        const r = await fetchWithTimeout(
          `${BASE}/discover/tv?api_key=${TMDB_API_KEY}` +
            `&sort_by=vote_average.desc` +
            `&vote_average.gte=7` +
            `&vote_count.gte=150` +
            `&page=${p}`
        );

        if (!r.ok) continue;
        const data = await r.json();
        if (Array.isArray(data?.results)) {
          tvResults.push(...data.results);
        }
      } catch (e) {
        console.warn("[HiddenGems] TV page failed:", p);
      }
    }

    /* ---------- NORMALIZATION ---------- */
    const normalize = (item, type) => {
      const rating = item.vote_average ?? 0;
      const popularity = item.popularity ?? 0;
      const votes = item.vote_count ?? 0;
      const language = item.original_language;

      const releaseYear =
        type === "movie"
          ? Number(item.release_date?.slice(0, 4))
          : Number(item.first_air_date?.slice(0, 4));

      if (
        rating < 7.2 ||
        votes < 300 ||
        votes > 6000 ||
        popularity > 90 ||
        !releaseYear ||
        releaseYear >= CURRENT_YEAR - 1 ||
        !ALLOWED_LANGUAGES.includes(language) ||
        !item.poster_path
      ) {
        return null;
      }

      const score =
        rating * 2.1 +
        Math.log(votes) -
        popularity * 0.5;

      return {
        id: item.id,
        title: type === "movie" ? item.title : item.name,
        poster_path: item.poster_path,
        vote_average: rating,
        vote_count: votes,
        popularity,
        hiddenGemScore: score,
        type,
        original_language: language,
      };
    };

    const pool = [
      ...movieResults.map(m => normalize(m, "movie")),
      ...tvResults.map(t => normalize(t, "tv")),
    ].filter(Boolean);

    /* ---------- SHUFFLE ---------- */
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const final = pool.slice(0, 15);

    cache.set(cacheKey, final);
    res.json(final);
  } catch (err) {
    console.error("Hidden Gems error:", err);
    res.status(500).json({ error: "Failed to compute hidden gems" });
  }
});

export { router as hiddenGemsRouter };
