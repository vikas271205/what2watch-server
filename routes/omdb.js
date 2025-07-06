import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const OMDB_API_KEY = process.env.OMDB_API_KEY;

router.get("/", async (req, res) => {
  const { title, year } = req.query;

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const query = encodeURIComponent(title);
  let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
  if (year) url += `&y=${year}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === "True") {
      res.json(data);
    } else {
      res.status(404).json({ error: "Movie not found." });
    }
  } catch (err) {
    console.error("OMDb Error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
