import express from "express";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 86400 }); // 1 day
const OMDB_API_KEY = process.env.OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error("❌ Missing OMDB_API_KEY in env");
}

const omdbLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: "Too many requests. Please try again later.",
});

router.get("/", omdbLimiter, async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.status(400).json({ error: "title is required" });

  const db = getFirestore();

  const safeTitle = (title || "").trim().replace(/\s+/g, "_").toLowerCase();
  const safeYear = (year || "").toString().trim();
  if (!safeTitle) return res.status(400).json({ error: "Invalid title" });

  const docId = safeYear ? `${safeTitle}_${safeYear}` : safeTitle;
  const cacheKey = `omdb_${docId}`;

  // Check in-memory cache first
  if (cache.has(cacheKey)) {
    console.log(`🧠 OMDb memory cache hit: ${cacheKey}`);
    return res.json(cache.get(cacheKey));
  }

  try {
    const docRef = db.collection("omdbRatings").doc(docId);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      console.log(`🔥 Firestore cache hit: ${docId}`);
      const data = snapshot.data();
      cache.set(cacheKey, data);
      return res.json(data);
    }

    // Fetch from OMDb
    const query = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    console.log("🌐 Fetching OMDb:", url);
    const response = await fetch(url);
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Invalid JSON from OMDb:", raw.slice(0, 100));
      cache.set(cacheKey, { error: "Invalid JSON response" }, 3600);
      return res.status(500).json({ error: "Invalid response from OMDb" });
    }

    if (data.Response === "False") {
      console.warn(`⚠️ OMDb: ${data.Error} for "${title}" (${year})`);
      cache.set(cacheKey, { error: data.Error }, 3600);
      return res.status(404).json({ error: data.Error });
    }

    // Save to Firestore and cache
    await docRef.set(data, { merge: true });
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (err) {
    console.error("OMDb API Error:", err);
    return res.status(500).json({ error: "Failed to fetch OMDb data" });
  }
});

export { router as omdbRouter };
