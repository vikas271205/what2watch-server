// server/routes/reviews.js

import express from "express";
import { body, validationResult } from "express-validator";
import Filter from "bad-words";
import { adminDb } from "../utils/firebaseAdmin.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import admin from "firebase-admin";

const router = express.Router();
const profanityFilter = new Filter();

// GET all reviews for a movie OR tv show (No changes needed here)
router.get("/:mediaType/:id/reviews", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const reviewsRef = adminDb.collection('reviews');
    const snapshot = await reviewsRef.where('mediaType', '==', mediaType).where('mediaId', '==', id).orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

// POST a new review for a movie OR tv show (No changes needed here)
router.post(
    "/:mediaType/:id/review",
    authMiddleware,
    [ body('comment').notEmpty().withMessage('Comment cannot be empty.').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters.').escape() ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }
        try {
            const { mediaType, id } = req.params;
            const { comment } = req.body;
            const { uid, name, picture } = req.user;

            if (profanityFilter.isProfane(comment)) {
                return res.status(400).json({ error: "Comment contains inappropriate language." });
            }

            const newReview = { mediaType, mediaId: id, userId: uid, userName: name || "Anonymous User", userAvatar: picture || null, comment, createdAt: admin.firestore.FieldValue.serverTimestamp() };
            const reviewRef = await adminDb.collection('reviews').add(newReview);
            res.status(201).json({ id: reviewRef.id, ...newReview });
        } catch (error) {
            console.error("Error creating review:", error);
            res.status(500).json({ error: "Failed to create review." });
        }
    }
);

// --- FIX: Updated DELETE route to allow author or admin to delete ---
router.delete("/review/:reviewId", authMiddleware, async (req, res) => {
    const { reviewId } = req.params;
    // req.user is attached by authMiddleware. We assume it contains uid and a custom claim like 'isAdmin'.
    const { uid, isAdmin } = req.user;

    try {
        const reviewRef = adminDb.collection('reviews').doc(reviewId);
        const doc = await reviewRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Review not found." });
        }

        const reviewData = doc.data();

        // Authorization check: User must be the author OR an admin to delete.
        if (reviewData.userId !== uid && !isAdmin) {
            return res.status(403).json({ error: "You are not authorized to delete this review." });
        }

        await reviewRef.delete();
        res.status(200).json({ message: "Review deleted successfully." });

    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({ error: "Failed to delete review." });
    }
});

export default router;
