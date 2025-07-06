// server/routes/tmdbDiscover.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

router.get("/", async (req, res) => {
  try {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=1`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("TMDB Discover Error:", err);
    res.status(500).json({ error: "Failed to fetch TMDB Discover data" });
  }
});

export { router as discoverRouter };
