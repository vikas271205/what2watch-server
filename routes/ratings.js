// server/routes/ratings.js

import express from "express";
import { adminDb, auth } from "../utils/firebaseAdmin.js";
import admin from "firebase-admin";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET a user's specific rating for a movie OR tv show
router.get("/:mediaType/:id/my-rating", authMiddleware, async (req, res) => {
    try {
        const { mediaType, id } = req.params;
        const { uid: userId } = req.user;

        const ratingDocId = `${userId}_${mediaType}_${id}`;
        const ratingRef = adminDb.collection('ratings').doc(ratingDocId);

        const docSnap = await ratingRef.get();

        if (docSnap.exists) {
            res.status(200).json({ rating: docSnap.data().rating });
        } else {
            res.status(200).json({ rating: 0 });
        }
    } catch (error) {
        console.error("Error fetching user rating:", error);
        res.status(500).json({ error: "Failed to fetch user rating." });
    }
});

// POST or UPDATE a user's rating for a movie OR tv show
router.post("/:mediaType/:id/rate", authMiddleware, async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const { rating } = req.body;
    const { uid } = req.user;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 10) {
      return res.status(400).json({ error: "A valid rating between 1 and 10 is required." });
    }

    const ratingDocId = `${uid}_${mediaType}_${id}`;
    const ratingRef = adminDb.collection('ratings').doc(ratingDocId);

    const newRating = {
      mediaType,
      mediaId: id,
      userId: uid,
      rating,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await ratingRef.set(newRating, { merge: true });

    res.status(200).json({ success: true, message: "Rating saved successfully.", rating: newRating });

  } catch (error) {
    console.error("Error saving rating:", error);
    res.status(500).json({ error: "Failed to save rating." });
  }
});

export default router;
