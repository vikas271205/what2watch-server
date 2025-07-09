// server/routes/rewriteOverview.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { db } from "../firebase.js"; // <-- make sure this exists
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Utility to slugify title
function slugify(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100); // Firestore ID limit
}

router.post("/ai/rewrite-overview", async (req, res) => {
  const { title, overview, genre, type = "movie", year } = req.body;

  if (!title || !overview) {
    return res.status(400).json({ error: "Missing title or overview" });
  }

  const titleSlug = slugify(title);
  const cacheId = `${type}_${titleSlug}_${year || "unknown"}`;
  const docRef = doc(db, "overview_cache", cacheId);

  try {
    // 1. Check if cached
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return res.json({ rewritten: docSnap.data().rewritten });
    }

    // 2. If not cached, rewrite via Groq
    const prompt = `
Rewrite the following ${type} description to be breathtaking, eye-catching, and spark intense curiosity.
Keep it short (max 3 lines), mysterious, cinematic, and emotionally gripping. Avoid spoilers.

Title: ${title}
Genre: ${genre || "N/A"}
Original Overview: ${overview}

Return only the rewritten version, no explanation.
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.95,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim();

    if (rewritten) {
      // 3. Save to Firestore
      await setDoc(docRef, {
        title,
        overview,
        genre,
        rewritten,
        timestamp: serverTimestamp(),
      });

      return res.json({ rewritten });
    } else {
      return res.status(500).json({ error: "No rewritten content returned." });
    }
  } catch (err) {
    console.error("Groq Rewrite Error:", err.message);
    return res.status(500).json({ error: "Failed to rewrite overview" });
  }
});

export default router;
