import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// 📽️ GET OMDb data by title (and optional year)
router.get("/", async (req, res) => {
  const { title, year } = req.query;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const query = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === "False") {
      return res.status(404).json({ error: data.Error || "Movie not found" });
    }

    res.json(data);
  } catch (err) {
    console.error("OMDb API Error:", err);
    res.status(500).json({ error: "Failed to fetch OMDb data" });
  }
});

export { router as omdbRouter };
