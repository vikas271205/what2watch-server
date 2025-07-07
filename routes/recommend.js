import express from "express";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { db } from "../utils/firebaseAdmin.js";

const router = express.Router();

// Add to recommended (admin-only)
router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const { id, type, title, rating, year, poster, tmdbRating, imdbRating, rtRating, genre_ids = [], language } = req.body;

    if (!id || !type || !title) {
      return res.status(400).json({ error: "Missing required fields: id, type, title" });
    }

    if (!["movie", "tv"].includes(type)) {
      return res.status(400).json({ error: "Invalid type: must be 'movie' or 'tv'" });
    }

    const docId = `${type}_${id}`;
    const data = {
      id: id.toString(), // Ensure id is a string
      type,
      title,
      rating: Number(rating) || 0,
      year: year ? Number(year) : null,
      poster: poster || "",
      tmdbRating: tmdbRating || null,
      imdbRating: imdbRating || null,
      rtRating: rtRating || null,
      genre_ids: Array.isArray(genre_ids) ? genre_ids.map(id => Number(id)) : [],
      language: language || null,
      createdAt: Date.now(),
    };

    console.log(`Attempting to add ${docId} to recommended:`, data); // Debug log

    // Validate Firestore write permissions
    try {
      await db.collection("recommended").doc(docId).set(data);
    } catch (firestoreErr) {
      console.error("Firestore write error:", firestoreErr);
      return res.status(403).json({ error: `Firestore error: ${firestoreErr.message}` });
    }

    console.log(`Successfully added ${docId} to recommended`);
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding to recommended:", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// Get all recommended (public)
router.get("/all", async (req, res) => {
  try {
    const snapshot = await db.collection("recommended").get();
    const data = snapshot.docs.map(doc => doc.data());
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch recommended:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete recommended by ID (admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const docId = req.params.id;
    console.log("Deleting doc:", docId);
    await db.collection("recommended").doc(docId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete recommendation:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export { router as recommendRouter };