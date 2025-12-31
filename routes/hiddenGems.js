import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 6 * 60 * 60 }); // 6 hours

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";
const CURRENT_YEAR = new Date().getFullYear();

/* ---------- STRICT FILTERS ---------- */

const ALLOWED_LANGUAGES = ["en", "hi", "ko", "ja", "es", "fr"];

const EXCLUDED_GENRES = new Set([
  99,     // Documentary
  16,     // Animation
  10764,  // Reality
  10767,  // Talk
  10763,  // News
]);

/* ---------- ROTATION / DECAY ---------- */

const DECAY_WINDOW_HOURS = 24;
const DECAY_PENALTY = 3.5;
const SEEN_CACHE_KEY = "hidden_gems_seen_map";

/* ---------- RATE LIMIT ---------- */

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});

/* ---------- ROUTE ---------- */

router.get("/", limiter, async (_req, res) => {
  const cacheKey = "hidden_gems_rotating_v6";

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    /* ---------- FETCH ---------- */

    const moviePages = [1, 2];
    const tvPages = [1, 2];

    const movieFetches = moviePages.map((p) =>
      fetch(
        `${BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
          `&sort_by=vote_average.desc` +
          `&vote_average.gte=7` +
          `&vote_count.gte=200` +
          `&include_adult=false` +
          `&page=${p}`,
        { timeout: 8000 }
      )
    );

    const tvFetches = tvPages.map((p) =>
      fetch(
        `${BASE}/discover/tv?api_key=${TMDB_API_KEY}` +
          `&sort_by=vote_average.desc` +
          `&vote_average.gte=7` +
          `&vote_count.gte=150` +
          `&page=${p}`,
        { timeout: 8000 }
      )
    );

    const movieResponses = await Promise.allSettled(movieFetches);
    const tvResponses = await Promise.allSettled(tvFetches);

    const movieResults = [];
    const tvResults = [];

    for (const r of movieResponses) {
      if (r.status === "fulfilled" && r.value.ok) {
        const d = await r.value.json();
        if (d?.results) movieResults.push(...d.results);
      }
    }

    for (const r of tvResponses) {
      if (r.status === "fulfilled" && r.value.ok) {
        const d = await r.value.json();
        if (d?.results) tvResults.push(...d.results);
      }
    }

    /* ---------- NORMALIZATION ---------- */

    const normalize = (item, type) => {
      const rating = item.vote_average ?? 0;
      const popularity = item.popularity ?? 0;
      const votes = item.vote_count ?? 0;
      const language = item.original_language;
      const genres = item.genre_ids || [];

      if (genres.some((g) => EXCLUDED_GENRES.has(g))) return null;

      const year =
        type === "movie"
          ? Number(item.release_date?.slice(0, 4))
          : Number(item.first_air_date?.slice(0, 4));

      if (
        rating < 7.2 ||
        votes < 300 ||
        votes > 6000 ||
        popularity > 90 ||
        !year ||
        year >= CURRENT_YEAR - 1 ||
        !ALLOWED_LANGUAGES.includes(language) ||
        !item.poster_path
      ) {
        return null;
      }

      const baseScore =
        rating * 2.1 +
        Math.log(votes) -
        popularity * 0.5;

      return {
        id: item.id,
        type,
        title: type === "movie" ? item.title : item.name,
        poster_path: item.poster_path,
        vote_average: rating,
        vote_count: votes,
        popularity,
        original_language: language,
        baseScore,
      };
    };

    const pool = [
      ...movieResults.map((m) => normalize(m, "movie")),
      ...tvResults.map((t) => normalize(t, "tv")),
    ].filter(Boolean);

    /* ---------- DECAY / ROTATION ---------- */

    const seenMap = cache.get(SEEN_CACHE_KEY) || {};
    const now = Date.now();

    const scored = pool.map((item) => {
      const key = `${item.type}_${item.id}`;
      const lastSeen = seenMap[key] || 0;
      const hoursAgo = (now - lastSeen) / (1000 * 60 * 60);

      const decay =
        hoursAgo < DECAY_WINDOW_HOURS
          ? DECAY_PENALTY * (1 - hoursAgo / DECAY_WINDOW_HOURS)
          : 0;

      return {
        ...item,
        hiddenGemScore: item.baseScore - decay,
      };
    });

    scored.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore);

    const final = scored.slice(0, 15);

    final.forEach((i) => {
      seenMap[`${i.type}_${i.id}`] = now;
    });

    cache.set(SEEN_CACHE_KEY, seenMap, 24 * 60 * 60);
    cache.set(cacheKey, final);

    res.json(final);
  } catch (err) {
    console.error("Hidden Gems error:", err);
    res.status(500).json({ error: "Failed to compute hidden gems" });
  }
});

export { router as hiddenGemsRouter };
