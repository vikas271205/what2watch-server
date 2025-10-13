// server/routes/rewriteOverview.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { adminDb } from "../utils/firebaseAdmin.js";
import admin from "firebase-admin";

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Using a more robust slugify function
function slugify(text = "") {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}


router.post("/ai/rewrite-overview", async (req, res) => {
  const { title, overview, genre, type = "movie", year, tmdbId } = req.body; // Added tmdbId for a perfect cache key

  if (!title || !overview || !tmdbId) {
    return res.status(400).json({ error: "Missing title, overview, or tmdbId" });
  }

  // A perfect unique key using the content type and TMDB ID
  const cacheId = `${type}_${tmdbId}`;
  const docRef = adminDb.collection("overview_cache").doc(cacheId);

  try {
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log(`[Cache] HIT for ${cacheId}`);
      return res.json({ rewritten: docSnap.data().rewritten });
    }
    console.log(`[Cache] MISS for ${cacheId}`);

    // --- REFINED PROMPT ---
    // Focuses on creating a short, punchy "hook"
    const prompt = `
      You are a movie marketing expert who writes punchy, exciting hooks.
      Your task is to take the provided movie details and create a 1-2 sentence hook (max 30 words).
      This hook should grab attention and make someone instantly want to know more.
      Focus on the core conflict, the unique premise, or the emotional stakes.
      Do not explain or summarize. Just provide the hook.

      Title: ${title}
      Genre: ${genre || "N/A"}
      Original Overview: ${overview}

      Provide ONLY the rewritten hook. No quotes, no preamble.
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Switched to a faster model, great for this task
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim();

    if (rewritten) {
      await docRef.set({
        title,
        rewritten,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ rewritten });
    } else {
      // If AI fails, gracefully fall back to a shortened original overview
      const fallback = overview.split('. ')[0] + '.';
      return res.json({ rewritten: fallback });
    }
  } catch (err) {
    console.error(`[Groq Error for ${title}]:`, err.message);
    // Gracefully fallback on error
    const fallback = overview.split('. ')[0] + '.';
    return res.json({ rewritten: fallback });
  }
});

export default router;
