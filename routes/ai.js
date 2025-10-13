import express from "express";
import dotenv from "dotenv";
import { getRecommendedMovies } from "../utils/getRecommendedMovies.js";

dotenv.config();
const router = express.Router();

const genrePairs = [
  ["action", 28], ["adventure", 12], ["animation", 16], ["comedy", 35],
  ["crime", 80], ["documentary", 99], ["drama", 18], ["family", 10751],
  ["fantasy", 14], ["history", 36], ["horror", 27], ["music", 10402],
  ["mystery", 9648], ["romance", 10749], ["science fiction", 878], ["sci-fi", 878],
  ["thriller", 53], ["war", 10752], ["western", 37],
];

const languageMap = {
  english: "en", hindi: "hi", spanish: "es", french: "fr",
  japanese: "ja", korean: "ko", tamil: "ta", telugu: "te",
};

const REVERSE_LANGUAGE_MAP = Object.fromEntries(
  Object.entries(languageMap).map(([k,v]) => [v, k.charAt(0).toUpperCase() + k.slice(1)])
);

function extractGenre(text) {
  if (!text) return null;
  text = text.toLowerCase();
  for (const [keyword] of genrePairs) {
    if (text.includes(keyword)) return keyword;
  }
  return null;
}

function extractLanguage(text) {
  if (!text) return null;
  text = text.toLowerCase();
  for (const lang in languageMap) {
    if (text.includes(lang)) return lang;
  }
  return null;
}

function extractYear(text) {
  if (!text) return null;
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ reply: "Message cannot be empty." });

  try {
    const genre = extractGenre(message);
    const language = extractLanguage(message);
    const year = extractYear(message);

    // If at least one meaningful field exists, fetch movies
    if (genre || language || year) {
      const movies = await getRecommendedMovies({ genre, language, year });

      if (!movies || movies.length === 0) {
        return res.json({
          type: "chat",
          reply: "Hmm, I couldn't find any movies matching that. Want to try a different genre or year?",
        });
      }

      // Map for frontend MovieCards
      const mappedMovies = movies.map(m => ({
        ...m,
        genres: m.genres.map(g => g || ""),
        language: REVERSE_LANGUAGE_MAP[m.language] || m.language,
      }));

      return res.json({
        type: "movieList",
        movies: mappedMovies,
        commentary: "Here are some movies you might enjoy!",
      });
    }

    // Fallback friendly chat
    return res.json({
      type: "chat",
      reply: "Hey! I'm Uncle Film Finder. Want me to suggest some movies or just chat?",
    });

  } catch (err) {
    console.error("Chat endpoint error:", err);
    return res.status(500).json({ reply: "❌ Something went wrong." });
  }
});

export default router;

