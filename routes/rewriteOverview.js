// server/routes/rewriteOverview.js
import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { adminDb } from "../utils/firebaseAdmin.js";

import admin from "firebase-admin";

dotenv.config();
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function slugify(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

router.post("/ai/rewrite-overview", async (req, res) => {
  const { title, overview, genre, type = "movie", year } = req.body;

  if (!title || !overview) {
    return res.status(400).json({ error: "Missing title or overview" });
  }

  const titleSlug = slugify(title);
  const cacheId = `${type}_${titleSlug}_${year || "unknown"}`;
  const docRef = adminDb.collection("overview_cache").doc(cacheId);

  try {
    // Check Firestore cache
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return res.json({ rewritten: docSnap.data().rewritten });
    }

    // Rewrite via Groq
const prompt = `
You're tasked with creating an irresistible movie hook that makes viewers eager to watch.

First, identify the unique elements of the movie from the overview: the setting, key characters, central conflict, or any twists. For franchise movies, highlight how this installment connects to or differs from previous ones.

Then, craft a hook that is 2-3 sentences long (30-50 words), written in a casual, enthusiastic tone, as if you're recommending the movie to a friend. Include specific details from the overview, like main characters, setting, or conflict, to make it stand out.

To make it memorable, use techniques like:
- Wordplay or puns related to the movie's theme.
- Contrasts or contradictions to create intrigue.
- Rhetorical questions to spark curiosity.
- Highlighting stakes or emotional impact.

Avoid generic phrases like "in a world," "nothing will ever be the same," or "one last chance." Ensure the hook is tailored to this movie.

For inspiration:
- Jurassic Park: "Dinosaurs are back, and they're ready to roar on an island adventure you won't forget."
- The Matrix: "What if reality's a lie? One guy’s about to unplug the truth in a mind-bending fight."
- Alien: "On a distant ship, a deadly creature’s loose. Can the crew survive the ultimate nightmare?"

Aim for a hook that's iconic and specific to this movie.

Title: ${title}
Genre: ${genre || "N/A"}
Original Overview: ${overview}

Provide only the rewritten hook—no explanations, no quotes.
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.95,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim();

    if (rewritten) {
      await docRef.set({
        title,
        overview,
        genre,
        rewritten,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
