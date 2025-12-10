// server/routes/rewriteOverview.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { adminDb } from "../utils/firebaseAdmin.js";
import admin from "firebase-admin";

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/ai/rewrite-overview", async (req, res) => {
  console.log("📥 AI request received:", req.body);

  const { title, overview, genre, type = "movie", tmdbId } = req.body;

  if (!title || !overview || !tmdbId) {
    return res.status(400).json({ error: "Missing title, overview, or tmdbId" });
  }

  const cacheId = `${type}_${tmdbId}`;
  const docRef = adminDb.collection("overview_cache").doc(cacheId);

  try {
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log(`[Cache] HIT for ${cacheId}`);
      return res.json(docSnap.data());
    }
    console.log(`[Cache] MISS for ${cacheId}`);

    // ---------- MULTI-STYLE PROMPT ----------
    const prompt = `
You are an expert Hollywood marketing writer.

Generate the following FIVE outputs for the movie/TV show below.

### 1. STANDARD
A polished, clear, cinematic 3–4 sentence synopsis. No spoilers.

### 2. NO-SPOILERS SYNOPSIS
A completely spoiler-safe version. Less detail, more tone.

### 3. ONE-LINE SUMMARY
A 1–2 sentence punchy one-liner (max 22 words). Feels like an elevator pitch.

### 4. TRAILER-STYLE
A dramatic, hype-filled summary like the narration of a movie trailer.

### 5. WHY YOU WILL LIKE THIS
List 3–5 bullets explaining why a viewer would enjoy this title.
Avoid generic reasons—be specific to the film/show.

------------------------------------------------
Title: ${title}
Genres: ${genre || "Unknown"}
TMDB Overview: ${overview}
------------------------------------------------

Return strictly in JSON using this structure:
{
  "standard": "...",
  "noSpoilers": "...",
  "oneLine": "...",
  "trailerStyle": "...",
  "whyYouWillLike": ["...", "...", "..."]
}
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
    });
    console.log("📡 Groq Raw Response:", completion);

    let aiRaw = completion.choices[0]?.message?.content;

    let aiJson;
    try {
      aiJson = JSON.parse(aiRaw);
    } catch {
      // fallback: wrap AI output safely
      aiJson = {
        standard: overview,
        noSpoilers: overview,
        oneLine: overview.split(".")[0],
        trailerStyle: overview,
        whyYouWillLike: ["Unique story", "Strong themes", "Great visuals"],
      };
    }

    // Save to cache
    await docRef.set({
      ...aiJson,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json(aiJson);

  } catch (err) {
    console.error("AI Error:", err.message);

    return res.json({
      standard: overview,
      noSpoilers: overview,
      oneLine: overview.split(".")[0],
      trailerStyle: overview,
      whyYouWillLike: ["Strong storytelling", "Engaging pacing", "Good performances"],
    });
  }
});

router.get("/ai/rewrite-overview-test", (req, res) => {
  res.json({ status: "Backend AI route is reachable" });
});


export default router;
