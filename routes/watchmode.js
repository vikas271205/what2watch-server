import express from "express";
import fetch from "node-fetch";
const router = express.Router();

const API_KEY = process.env.WATCHMODE_API_KEY;

// Get Watchmode ID by title + optional year
router.get("/id", async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_value=${encodedTitle}&search_type=movie,tv`;
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

// Get streaming sources by Watchmode ID
router.get("/sources/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(
      `https://api.watchmode.com/v1/title/${id}/sources/?apiKey=${API_KEY}`
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

export default router;
