// ai.js
import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { getRecommendedMovies } from "../utils/getRecommendedMovies.js";

dotenv.config();
const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// session store: { sessionId: { genre, language, year, mode, lastMovie } }
const conversationState = {};

// extractor: returns JSON with optional fields genre, language, year
const extractorPrompt = `
You are an extractor. Given a short user message about movies return a JSON object ONLY.
Fields (optional): "genre" (string), "language" (string), "year" (integer).
If a field is not present in the message return it absent or null.
Examples:
Input: "action movie in Hindi from 2025"
Output: {"genre":"action","language":"Hindi","year":2025}
Input: "Find me a sci-fi"
Output: {"genre":"sci-fi"}
Respond with only the JSON object and nothing else.
`;

// friendly responder prompt (natural, short)
const friendPrompt = `
You are "Uncle Film Finder", a friendly movie buddy. Keep replies short, casual, and helpful.
When asked a follow-up question, ask one concise question only.
When summarizing known preferences, be friendly and brief.
`;

// helper: try parse JSON, fallback to regex year extraction
function safeParseExtraction(raw) {
  if (!raw) return {};
  raw = raw.trim();
  // try JSON first
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    // attempt to extract genre/language/year via simple regex heuristics
    const result = {};
    // year: four digits 1900-2099
    const yearMatch = raw.match(/(19|20)\d{2}/);
    if (yearMatch) result.year = parseInt(yearMatch[0], 10);
    // language guess: common languages capitalized or 'hindi', 'english'
    const langMatch = raw.match(/\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Marathi|Bengali)\b/i);
    if (langMatch) result.language = langMatch[0];
    // genre guess: common genres
    const genreMatch = raw.match(/\b(action|comedy|drama|sci-?fi|horror|thriller|romance|documentary|animation)\b/i);
    if (genreMatch) result.genre = genreMatch[0].toLowerCase().replace("scifi", "sci-fi");
    return result;
  }
}

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ reply: "Session ID is required." });
  if (!message || typeof message !== "string" || message.trim() === "")
    return res.status(400).json({ reply: "Message cannot be empty." });

  const msg = message.trim();
  const state = conversationState[sessionId] || { genre: null, language: null, year: null, mode: "collecting", lastMovie: null };
  conversationState[sessionId] = state;

  try {
    // Special-case: user asks for more/details about last recommendation
    if (state.mode === "recommending" && /^(more|details|tell me more|info|i want to know more)/i.test(msg)) {
      if (state.lastMovie) {
        const details = state.lastMovie.overview || state.lastMovie.description || "No extra details available.";
        return res.json({ reply: `More on ${state.lastMovie.title}: ${details}` });
      }
    }

    // 1) Run extractor
    let extracted = {};
    try {
      const extractionResp = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: extractorPrompt },
          { role: "user", content: msg }
        ],
        temperature: 0,
        max_tokens: 200,
      });
      const raw = extractionResp.choices?.[0]?.message?.content || "";
      extracted = safeParseExtraction(raw);
    } catch (e) {
      // fallback: attempt heuristic extraction on the raw user message
      extracted = safeParseExtraction(msg);
    }

    // 2) Update state with extracted values (year optional)
    if (extracted.genre) state.genre = extracted.genre;
    if (extracted.language) state.language = extracted.language;
    if (extracted.year) {
      // sanitize year: must be between 1888 and 2100
      const y = parseInt(extracted.year, 10);
      if (!Number.isNaN(y) && y >= 1888 && y <= 2100) state.year = y;
    }

    // 3) If we have both genre and language, call recommender
    if (state.genre && state.language) {
      // pass year only if present
      const query = { genre: state.genre, language: state.language };
      if (state.year) query.year = state.year;

      const movies = await getRecommendedMovies(query);
      // store first movie for follow-ups
      state.mode = "recommending";
      state.lastMovie = Array.isArray(movies) && movies.length ? movies[0] : null;

      // clear state so next user search starts fresh
      delete conversationState[sessionId];

      return res.json({ reply: movies });
    }

    // 4) Determine missing pieces and ask friendly question
    const missing = [];
    if (!state.genre) missing.push("genre");
    if (!state.language) missing.push("language");

    // create a short friendly context summary
    const contextParts = [];
    if (state.genre) contextParts.push(`genre: ${state.genre}`);
    if (state.language) contextParts.push(`language: ${state.language}`);
    if (state.year) contextParts.push(`year: ${state.year}`);

    const contextSummary = contextParts.length ? `I know ${contextParts.join(", ")}.` : "";

    // friendly prompt to produce a natural follow-up
    const friendMessages = [
      { role: "system", content: friendPrompt },
      { role: "assistant", content: contextSummary },
      { role: "user", content: msg }
    ];

    const friendlyResp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: friendMessages,
      temperature: 0.8,
      max_tokens: 150,
    });

    const friendlyReply = friendlyResp.choices?.[0]?.message?.content || "Nice — tell me a bit more so I can help.";
    return res.json({ reply: friendlyReply });

  } catch (err) {
    console.error("Groq API Error:", err);
    return res.status(500).json({ reply: "❌ Sorry, something went wrong with the AI." });
  }
});

export default router;

