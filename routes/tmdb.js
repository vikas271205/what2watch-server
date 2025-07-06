import express from "express";
import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import fetch from "node-fetch";

const router = express.Router();
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// 🔍 Search for chatbot
router.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === "") {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB Search Error:", err);
    res.status(500).json({ error: "Failed to fetch TMDB search data" });
  }
});

// 🎬 Trending (day or week)
router.get("/trending", async (req, res) => {
  const { time = "day", page = 1 } = req.query;
  try {
    const url = `${BASE_URL}/trending/all/${time}?api_key=${API_KEY}&page=${page}`;
    const data = await fetchWithRetry(url);
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Trending Error:", err);
    res.status(500).json({ error: "Failed to fetch trending data" });
  }
});

// 🎬 Discover Movies (e.g., for Trending Month)
router.get("/discover", async (req, res) => {
  const { page = 1 } = req.query;
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}`;
    const data = await fetchWithRetry(url);
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Discover Error:", err);
    res.status(500).json({ error: "Failed to fetch discovered movies" });
  }
});

// 🎭 Genre List
router.get("/genres", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    const data = await response.json();
    res.json(data.genres);
  } catch (err) {
    console.error("TMDB Genres Error:", err);
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});

// 🎯 Movies by Genre
router.get("/byGenre", async (req, res) => {
  const { genreId } = req.query;
  if (!genreId) return res.status(400).json({ error: "genreId is required" });

  try {
    const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
    const data = await response.json();
    res.json(data.results);
  } catch (err) {
    console.error("TMDB byGenre Error:", err);
    res.status(500).json({ error: "Failed to fetch movies by genre" });
  }
});

// 👤 Person Details
router.get("/person/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${BASE_URL}/person/${id}?api_key=${API_KEY}`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB Person Error:", err);
    res.status(500).json({ error: "Failed to fetch person details" });
  }
});
// 📺 Get TV Show Details
router.get("/tv/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Detail Error:", err);
    res.status(500).json({ error: "Failed to fetch TV details" });
  }
});

// 🎬 TV Show Videos (e.g., trailers)
router.get("/tv/:id/videos", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Videos Error:", err);
    res.status(500).json({ error: "Failed to fetch TV videos" });
  }
});

// 👤 TV Show Cast
router.get("/tv/:id/credits", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Credits Error:", err);
    res.status(500).json({ error: "Failed to fetch TV cast" });
  }
});

// 📺 TV Genres
router.get("/genre/tv", async (req, res) => {
  try {
    const url = `${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=en-US`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Genre Error:", err);
    res.status(500).json({ error: "Failed to fetch TV genres" });
  }
});

// 📺 Discover TV by genre
router.get("/discover/tv", async (req, res) => {
  const genreParam = req.query.with_genres;
  try {
    const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&language=en-US`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB Discover TV Error:", err);
    res.status(500).json({ error: "Failed to fetch TV shows" });
  }
});
// 🎥 Bollywood Movies
router.get("/discover/bollywood", async (req, res) => {
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=hi&sort_by=popularity.desc`;
    const data = await fetchWithRetry(url);
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Bollywood Error:", err);
    res.status(500).json({ error: "Failed to fetch Bollywood movies" });
  }
});
// 🎭 Genre List
router.get("/genres", async (req, res) => {
  try {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`;
    const data = await fetchWithRetry(url);
    res.json(data.genres);
  } catch (err) {
    console.error("TMDB Genres Error:", err);
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});
// 🎬 Hollywood Movies
router.get("/discover/hollywood", async (req, res) => {
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=en&sort_by=popularity.desc`;
    const data = await fetchWithRetry(url);
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Hollywood Error:", err);
    res.status(500).json({ error: "Failed to fetch Hollywood movies" });
  }
});

// 🎥 Person Movie Credits
router.get("/person/:id/movies", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${BASE_URL}/person/${id}/movie_credits?api_key=${API_KEY}`;
    const data = await fetchWithRetry(url);
    res.json(data);
  } catch (err) {
    console.error("TMDB Person Movies Error:", err);
    res.status(500).json({ error: "Failed to fetch person movies" });
  }
});

// WATCHMODE ROUTES
const watchmodeRouter = express.Router();
const WM_API_KEY = process.env.WATCHMODE_API_KEY;

watchmodeRouter.get("/id", async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `https://api.watchmode.com/v1/search/?apiKey=${WM_API_KEY}&search_value=${encodedTitle}&search_type=movie,tv`;
    const response = await fetch(url);
    const data = await response.json();

    const result = data.title_results?.find(
      (item) => !year || item.year == year
    );
    res.json({ id: result?.id || null });
  } catch (err) {
    console.error("Watchmode ID Error:", err);
    res.status(500).json({ error: "Failed to get Watchmode ID" });
  }
});

watchmodeRouter.get("/sources/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(
      `https://api.watchmode.com/v1/title/${id}/sources/?apiKey=${WM_API_KEY}`
    );
    const data = await response.json();

    const filtered = data.filter(
      (s) => ["sub", "free", "tv_everywhere"].includes(s.type) && s.region === "IN"
    );

    const unique = filtered.reduce((acc, item) => {
      if (!acc.some((a) => a.name === item.name)) acc.push(item);
      return acc;
    }, []);

    res.json(unique);
  } catch (err) {
    console.error("Watchmode Sources Error:", err);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

export { router as tmdbRouter, watchmodeRouter };
