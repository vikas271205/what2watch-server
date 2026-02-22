import express from "express";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { db } from "../utils/firebaseAdmin.js";
import { fetchOmdbRatings } from "./omdb.js";
import fetch from "node-fetch";

const router = express.Router();

// ✅ Admin-only: Add to recommended
router.post("/add", verifyAdmin, async (req, res) => {
  

  try {
    const { id, type } = req.body;


    if (!id || !type) {
      
      return res.status(400).json({ error: "Missing id or type" });
    }

    
    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;

    const tmdbRes = await fetch(tmdbUrl);

    if (!tmdbRes.ok) {
       return res.status(500).json({ error: "Failed to fetch TMDB details" });
    }

    const tmdbData = await tmdbRes.json();


    const title = type === "movie" ? tmdbData.title : tmdbData.name;
    const date =
      type === "movie" ? tmdbData.release_date : tmdbData.first_air_date;

    const year = date ? parseInt(date.split("-")[0]) : null;

    const poster = tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
      : "";

    const tmdbRating =
      tmdbData.vote_average !== undefined
        ? Number(tmdbData.vote_average)
        : null;

    const genre_ids = Array.isArray(tmdbData.genres)
      ? tmdbData.genres.map((g) => g.id)
      : [];

    const language = tmdbData.original_language || null;


    // 🔥 Fetch OMDb ratings
    let imdbRating = null;
    let rtRating = null;



    try {
      const ratings = await fetchOmdbRatings(title, year);

      if (ratings) {
        imdbRating = ratings.imdbRating;
        rtRating = ratings.rtRating;
        
      } else {
        console.log("⚠️ OMDb returned null ratings");
      }
    } catch (err) {
      console.log("⚠️ OMDb fetch failed:", err.message);
    }

    const docId = `${type}_${id}`;

    const data = {
      id: id.toString(),
      type,
      title,
      rating: tmdbRating || 0,
      year,
      poster,
      tmdbRating,
      imdbRating,
      rtRating,
      genre_ids,
      language,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };



    await db.collection("recommended").doc(docId).set(data);

    

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Error in /add route:", err);
    return res.status(500).json({ error: err.message });
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
