import express from "express";
import fetch from "node-fetch";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const router = express.Router();

const API_KEY = process.env.WATCHMODE_API_KEY;

// === Route to get Watchmode ID ===
router.get("/id", async (req, res) => {
  const { title, year, tmdbId } = req.query;
  const cacheKey = `watchmode_id_${title}_${year}_${tmdbId}`;
  console.log(`[Watchmode ID] Fetching: ${cacheKey}`);

  const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${API_KEY}&search_value=${encodeURIComponent(
    title
  )}&search_field=name&search_type=movie`; // Can also be TV

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.title_results || data.title_results.length === 0)
      return res.status(404).json({ id: null });

    const cleanedTitle = title.toLowerCase().trim();
    let result;

    if (tmdbId) {
      result = data.title_results.find(
        (item) => item.tmdb_id?.toString() === tmdbId
      );
    }

    if (!result && year) {
      result = data.title_results.find(
        (item) =>
          item.name?.toLowerCase().trim() === cleanedTitle &&
          item.year?.toString() === year
      );
    }

    if (!result) {
      result = data.title_results.find(
        (item) => item.name?.toLowerCase().trim() === cleanedTitle
      );
    }

    if (!result) {
      result = data.title_results.find((item) =>
        item.name?.toLowerCase().includes(cleanedTitle)
      );
    }

    if (!result) {
      result = data.title_results[0];
    }

    if (result) {
      return res.json({ id: result.id });
    } else {
      return res.status(404).json({ id: null });
    }
  } catch (err) {
    console.error("Error fetching Watchmode ID:", err);
    return res.status(500).json({ error: "Failed to fetch Watchmode ID" });
  }
});

// === Route to get streaming sources for movie or show ===
router.get("/sources/:id", async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("streaming_sources").doc(id);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    console.log(`🟢 Firestore cache hit for Watchmode ID: ${id}`);
    const data = docSnap.data();
    return res.json(data.sources || []);
  }

  console.log(`🟡 Firestore cache miss for Watchmode ID: ${id}, fetching from API...`);

  try {
    const url = `https://api.watchmode.com/v1/title/${id}/sources/?apiKey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // 🌍 Group by platform name
    const grouped = data
      .filter((s) => s.web_url && s.type === "sub")
      .reduce((acc, curr) => {
        const key = curr.name.toLowerCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {});

    // 🇮🇳 Prefer Indian region if available
    const selected = Object.values(grouped).map((entries) => {
      const india = entries.find((e) => e.region === "IN");
      return india || entries[0];
    });

    await docRef.set({
      sources: selected,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Stored India-prioritized sources for ID ${id}`, selected.map(s => `${s.name} (${s.region})`));
    return res.json(selected);
  } catch (err) {
    console.error("❌ Error fetching streaming sources:", err);
    return res.status(500).json({ error: "Failed to fetch streaming sources" });
  }
});

export { router as watchmodeRouter };
