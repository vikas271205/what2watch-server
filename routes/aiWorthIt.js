// routes/aiWorthIt.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { adminDb } from "../utils/firebaseAdmin.js";
import admin from "firebase-admin";

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Clean fallback formatting
function safe(n, fallback = null) {
  return n !== undefined && n !== null && n !== "" ? n : fallback;
}

router.post("/ai/worth-it", async (req, res) => {
  try {
    const {
      title,
      overview,
      tmdbId,
      tmdbRating,
      imdbRating,
      popularity,
      genres,
      type = "movie"
    } = req.body;

    if (!tmdbId) {
      return res.status(400).json({ error: "tmdbId is required" });
    }

    const cacheRef = adminDb.collection("worthIt_cache").doc(`${type}_${tmdbId}`);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists) {
      return res.json(cacheSnap.data());
    }

    // Prepare fields safely
    const cleanData = {
      title: safe(title, "Unknown Title"),
      overview: safe(overview, "No overview available"),
      tmdbRating: safe(tmdbRating, "N/A"),
      imdbRating: safe(imdbRating, "N/A"),
      popularity: safe(popularity, "N/A"),
      genres: safe(genres, ["Unknown"])
    };

    // GROQ prompt handles missing fields gracefully
    const prompt = `
You are a professional content analyst.

Goal: Assign a single *Worth Watching Score* from 1–100 based ONLY on whatever info is provided.
If some fields are missing, ignore them and use what exists. Do NOT mention missing data.

Inputs:
- Title: ${cleanData.title}
- Overview: ${cleanData.overview}
- TMDB Rating: ${cleanData.tmdbRating}
- IMDb Rating: ${cleanData.imdbRating}
- Popularity: ${cleanData.popularity}
- Genres: ${cleanData.genres.join(", ")}

Return ONLY JSON in this format:
{
  "score": 87,
  "badge": "Must Watch"
}
Badge rules:
- 85–100 → "Must Watch"
- 70–84  → "Great"
- 55–69  → "Decent"
- 40–54  → "Mixed"
- 0–39   → "Skip"
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "";

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      // guaranteed fallback
      json = {
        score: 70,
        badge: "Decent"
      };
    }

    await cacheRef.set({
      ...json,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json(json);

  } catch (err) {
    console.error("WorthIt API Error:", err);

    return res.json({
      score: 70,
      badge: "Decent"
    });
  }
});

export default router;
