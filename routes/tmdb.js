import express from "express";
import { fetchWithRetry } from "../utils/fetchWithRetry.js"; // ✅ Import retry wrapper

const router = express.Router();

router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim() === "") {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&language=en-US&include_adult=false`;

    const data = await fetchWithRetry(url); // ✅ Use retry version
    res.json(data);
  } catch (err) {
    console.error("TMDB Error:", err);
    res.status(500).json({ error: "Failed to fetch TMDB data" });
  }
});

export default router;
