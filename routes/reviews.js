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

// GET all reviews for a movie OR tv show
router.get("/:mediaType/:id/reviews", async (req, res) => {
  try {
    const { mediaType, id } = req.params;
    const reviewsRef = adminDb.collection('reviews');
    // NOTE: This query now needs a composite index on mediaType, mediaId, and createdAt
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

// POST a new review for a movie OR tv show
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

// Admin-only route to DELETE a review (this route is generic and needs no changes)
router.delete("/review/:reviewId", authMiddleware, verifyAdmin, async (req, res) => { /* ... same code */ });

export default router;
