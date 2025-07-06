import express from "express";
import { fetchWithRetry } from "../utils/fetchWithRetry.js"; // already exists
import fetch from "node-fetch"; // needed for non-retry fetches

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

// 🎬 Trending Movies
router.get("/trending", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
    const data = await response.json();
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Trending Error:", err);
    res.status(500).json({ error: "Failed to fetch trending movies" });
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

export default router;
