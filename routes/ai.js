import express from "express";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { getRecommendedMovies } from "../utils/getRecommendedMovies.js";

dotenv.config();
const router = express.Router();
const conversationMemory = {};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ reply: "Session ID is required." });
  }

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ reply: "Message cannot be empty." });
  }

  conversationMemory[sessionId] = conversationMemory[sessionId] || {
    history: [],
    filled: {},
  };

  const memory = conversationMemory[sessionId];
  memory.history.push({ role: "user", content: message });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
  role: "system",
  content: `
You are a helpful movie assistant.

Your job is to recommend movies based on only two user preferences:
1. Genre (e.g., action, romance, horror)
2. Language (e.g., English, Hindi)

Optionally, also support:
- Year (e.g., released last year or in 2023)
- High rating (minimum vote average)

Once you know both, respond strictly in this JSON format:
{
  "intent": "recommend_movie",
  "genre": "action",
  "language": "English",
  "year": 2024,               // optional
  "minRating": 7.5            // optional
}

⚠️ Do NOT include any explanation or extra text around the JSON.
⚠️ Only return the JSON object when you're confident both genre and language are known.
⚠️ Make sure it’s valid JSON (no trailing commas, correct quotes, etc.)

Do not ask about duration or mood. Until both genre and language are known, ask one follow-up question to get the missing info.

If the user already has movie suggestions and asks “which one should I watch?”, choose one from the previous list and explain why it might be a good pick for them.

You may also engage in small talk or answer general queries if the user is not asking about movies.
`

}
,
        ...memory.history
      ],
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content;
    memory.history.push({ role: "assistant", content: reply });

    try {
      const parsed = JSON.parse(reply);
      if (parsed.intent === "recommend_movie") {
  const movies = await getRecommendedMovies(parsed);
  memory.lastMovies = movies; // ✅ store recommended list
  return res.json({ reply: movies });
}
if (
  message.toLowerCase().includes("which one should i watch") &&
  memory.lastMovies &&
  memory.lastMovies.length > 0
) {
  const bestMovie = memory.lastMovies.reduce((a, b) =>
    (a.rating || 0) > (b.rating || 0) ? a : b
  );

  return res.json({
    reply: `I recommend watching **${bestMovie.title}** – it has one of the highest ratings and fits your preferences well!`
  });
}


    } catch (_) {}

    return res.json({ reply });
  } catch (err) {
    console.error("Groq Error:", err);
    return res.status(500).json({ reply: "❌ Sorry, something went wrong." });
  }
});

export default router;
