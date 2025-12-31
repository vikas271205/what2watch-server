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
  // console.log("📥 AI request received:", req.body);

  const { title, overview, tmdbId, type = "movie" } = req.body;

  if (!title || !overview || !tmdbId) {
    return res.status(400).json({ error: "Missing title, overview, or tmdbId" });
  }

  const cacheId = `${type}_${tmdbId}`;
  const docRef = adminDb.collection("overview_cache").doc(cacheId);

  try {
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    const data = docSnap.data();

    // If expired → refresh
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      // console.log(`[Cache] EXPIRED for ${cacheId}, regenerating...`);
    } else {
      // console.log(`[Cache] HIT for ${cacheId}`);
      return res.json(data);
    }
  }


    // console.log(`[Cache] MISS for ${cacheId}`);

    // ---------------- NEW SIMPLE + HONEST PROMPT ----------------
    const prompt = `
Rewrite the overview of this movie in simple, natural English.
Write it the way a friend would explain the movie to someone.
Do NOT use buzzwords, dramatic marketing language, or fancy words.

Rules:
- Keep it short and easy to read.
- No spoilers.
- Be honest about what kind of movie it is.
- Tone should feel friendly and casual, not formal.

Movie Title: ${title}
Overview: ${overview}

Return only JSON:
{
  "summary": "..."
}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    let raw = completion.choices[0]?.message?.content;

    let aiJson;
    try {
      aiJson = JSON.parse(raw);
    } catch {
      aiJson = { summary: overview };
    }

    // Save to Firestore cache
// ---------------- SAVE TO CACHE WITH TTL ----------------
await docRef.set({
  ...aiJson,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  expiresAt: admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days TTL
  ),
});



    return res.json(aiJson);

  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message || err);
    return res.json({ summary: overview });
  }
});



export default router;
