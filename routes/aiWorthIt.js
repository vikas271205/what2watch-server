// routes/aiWorthIt.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { adminDb } from "../utils/firebaseAdmin.js";
import admin from "firebase-admin";

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// safe value helper
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
      rtRating,
      popularity,
      genres,
      type = "movie",
    } = req.body;

    if (!tmdbId) return res.status(400).json({ error: "tmdbId is required" });

    const cacheRef = adminDb.collection("worthIt_cache").doc(`${type}_${tmdbId}`);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists) {
      return res.json(cacheSnap.data());
    }

    const clean = {
      title: safe(title, "Unknown Title"),
      overview: safe(overview, "No overview available"),
      tmdbRating: Number(safe(tmdbRating, 0)),
      imdbRating: Number(safe(imdbRating, 0)),
      rtRating: safe(rtRating, null),
      popularity: Number(safe(popularity, 0)),
      genres: safe(genres, ["Unknown"]),
    };

    // ---- STRICT CRITIC PROMPT (NEW) ----
    const prompt = `
You are a harsh and brutally honest film critic.
Your job is to evaluate movies realistically — NOT kindly.

RULES FOR SCORING:
• Scores MUST range between 1–100.
• If ratings are weak (TMDB < 6 or IMDb < 6), the score must drop significantly.
• If ratings are strong (TMDB > 7.5 AND IMDb > 7.5), score may rise.
• Popularity matters only slightly.
• If overview sounds generic, penalize.
• Never give high scores unless data strongly supports it.
• Never inflate scores — stay strict and skeptical.

DATA:
- Title: ${clean.title}
- Overview: ${clean.overview}
- TMDB: ${clean.tmdbRating}
- IMDb: ${clean.imdbRating}
- Rotten Tomatoes: ${clean.rtRating}
- Popularity: ${clean.popularity}
- Genres: ${clean.genres.join(", ")}

OUTPUT RULES:
Return ONLY valid JSON:
{
  "score": 72,
  "badge": "Decent"
}

BADGE RULES:
- 85–100 → "Must Watch"
- 70–84 → "Great"
- 55–69 → "Decent"
- 40–54 → "Mixed"
- 0–39 → "Skip"
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // very strict, less random
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "";

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // Hard fallback to avoid crashes
      result = { score: 50, badge: "Mixed" };
    }

    await cacheRef.set({
      ...result,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),

    });

    return res.json(result);

  } catch (err) {
    console.error("WorthIt API Error:", err);
    return res.json({ score: 50, badge: "Mixed" });
  }
});

export default router;
