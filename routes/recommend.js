import express from "express";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { db } from "../utils/firebaseAdmin.js";

const router = express.Router();

// ✅ Admin-only: Add to recommended
router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const {
      id,
      type,
      title,
      rating,
      year,
      poster,
      tmdbRating,
      imdbRating,
      rtRating,
      genre_ids = [],
      language,
    } = req.body;

    if (!id || !type || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const docId = `${type}_${id}`;
    const data = {
      id: id.toString(),
      type,
      title,
      rating: Number(rating) || 0,
      year: year ? Number(year) : null,
      poster: poster || "",
      tmdbRating: tmdbRating || null,
      imdbRating: imdbRating || null,
      rtRating: rtRating || null,
      genre_ids: Array.isArray(genre_ids) ? genre_ids.map((id) => Number(id)) : [],
      language: language || null,
      createdAt: Date.now(),
    };

    await db.collection("recommended").doc(docId).set(data);
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding to recommended:", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// ✅ Public: Get all recommendations
router.get("/all", async (req, res) => {
  try {
    const snapshot = await db.collection("recommended").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch recommended:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin-only: Delete
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const docId = req.params.id;
    await db.collection("recommended").doc(docId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete recommendation:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export { router as recommendRouter };
