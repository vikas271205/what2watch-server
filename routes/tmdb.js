// server/routes/tmdb.js

import express from "express";
import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const router = express.Router();
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Apply rate limit ONLY to search route (autocomplete-heavy)
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit to 100 search requests per 15 min per IP
  message: { error: "Rate limit exceeded for search. Try again later." },
});

const tmdbLimiter= rateLimit({
	windowMs:60*1000,
	max:60,
	message: {error :"Too many requests. Please slow down.."},
});

router.use(tmdbLimiter);

const getCachedOrFetch = async (cacheKey, url,ttl=3600) => {
  if (cache.has(cacheKey)) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return cache.get(cacheKey);
  }
  console.log(`❌ Cache miss: ${cacheKey}`);
  const data = await fetchWithRetry(url);
  cache.set(cacheKey, data,ttl);
  return data;
};

// ------------------------------------------------------
// 🔍 Search (used by chatbot autocomplete)
// ------------------------------------------------------
router.get("/search", searchLimiter, async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === "") {
    return res.status(400).json({ error: "Search query is required" });
  }
  const cacheKey = `search_${query}`;
  try {
    const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
    const data = await getCachedOrFetch(cacheKey, url,300);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Search Error:", err);
    res.status(500).json({ error: "Failed to fetch TMDB search data" });
  }
});

// ------------------------------------------------------
// 🔥 Trending & Discover
// ------------------------------------------------------
router.get("/trending", async (req, res) => {
  const { time = "day", page = 1 } = req.query;
  const cacheKey = `trending_${time}_${page}`;
  try {
    const url = `${BASE_URL}/trending/all/${time}?api_key=${API_KEY}&page=${page}`;
    const data = await getCachedOrFetch(cacheKey, url,900);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Trending Error:", err);
    res.status(500).json({ error: "Failed to fetch trending data" });
  }
});

router.get("/discover", async (req, res) => {
  const { page = 1 } = req.query;
  const cacheKey = `discover_${page}`;
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}`;
    const data = await getCachedOrFetch(cacheKey, url,1800);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Discover Error:", err);
    res.status(500).json({ error: "Failed to fetch discovered movies" });
  }
});

router.get("/discover/bollywood", async (req, res) => {
  const { page = 1 } = req.query;
  const cacheKey = `discover_bollywood_${page}`;
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=hi&sort_by=popularity.desc&page=${page}`;
    const data = await getCachedOrFetch(cacheKey, url,1800);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Bollywood Discover Error:", err);
    res.status(500).json({ error: "Failed to fetch Bollywood movies" });
  }
});

router.get("/discover/hollywood", async (req, res) => {
  const { page = 1 } = req.query;
  const cacheKey = `discover_hollywood_${page}`;
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&region=US&sort_by=popularity.desc&page=${page}`;
    const data = await getCachedOrFetch(cacheKey, url,1800);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB Hollywood Discover Error:", err);
    res.status(500).json({ error: "Failed to fetch Hollywood movies" });
  }
});

// ------------------------------------------------------
// 🎭 Genres & By‑Genre
// ------------------------------------------------------
router.get("/genres", async (_req, res) => {
  const cacheKey = "genres";
  try {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.genres);
  } catch (err) {
    console.error("TMDB Genres Error:", err);
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});


router.get("/byGenre", async (req, res) => {
  const { genreId, page } = req.query;
  if (!genreId) return res.status(400).json({ error: "genreId is required" });

  const pageNumber = page ? Number(page) : Math.floor(Math.random() * 20) + 1;

  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&include_adult=false&language=en-US&page=${pageNumber}`;

    const data = await getCachedOrFetch(`genre_${genreId}_p${pageNumber}`, url, 1800);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch (err) {
    console.error("TMDB byGenre Error:", err);
    res.status(500).json({ error: "Failed to fetch movies by genre" });
  }
});


// ------------------------------------------------------
// 🎬 MOVIE ROUTES
// ------------------------------------------------------
router.get("/movie/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_${id}`;
  try {
    const url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Movie Detail Error:", err);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

router.get("/movie/:id/videos", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_videos_${id}`;
  try {
    const url = `${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,3600);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Movie Videos Error:", err);
    res.status(500).json({ error: "Failed to fetch movie videos" });
  }
});

router.get("/movie/:id/credits", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_credits_${id}`;
  try {
    const url = `${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,3600);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Movie Credits Error:", err);
    res.status(500).json({ error: "Failed to fetch movie credits" });
  }
});

router.get("/movie/:id/similar", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_similar_${id}`;
  try {
    const url = `${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,3600);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Similar Movies Error:", err);
    res.status(500).json({ error: "Failed to fetch similar movies" });
  }
});

// ------------------------------------------------------
// 👤 PERSON ROUTES
// ------------------------------------------------------
router.get("/person/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `person_${id}`;
  try {
    const url = `${BASE_URL}/person/${id}?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Person Error:", err);
    res.status(500).json({ error: "Failed to fetch person details" });
  }
});

// --- ADDED: New route for combined credits, as requested by the redesigned CastDetail page ---
router.get("/person/:id/combined_credits", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `person_combined_credits_${id}`;
  try {
    const url = `${BASE_URL}/person/${id}/combined_credits?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Person Combined Credits Error:", err);
    res.status(500).json({ error: "Failed to fetch person's combined credits" });
  }
});

// --- REMOVED: This route is replaced by combined_credits and is no longer used by the frontend ---
// router.get("/person/:id/movies", async (req, res) => {
//   ...
// });

// ------------------------------------------------------
// 📺 TV ROUTES
// ------------------------------------------------------
router.get("/tv/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `tv_${id}`;
  try {
    const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Detail Error:", err);
    res.status(500).json({ error: "Failed to fetch TV details" });
  }
});

router.get("/tv/:id/videos", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `tv_videos_${id}`;
  try {
    const url = `${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,3600);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Videos Error:", err);
    res.status(500).json({ error: "Failed to fetch TV videos" });
  }
});

router.get('/tv/:id/similar', async (req, res) => {
  const { id } = req.params;
  const cacheKey= `tv_similar_${id}`;
  try {
    const url = `https://api.themoviedb.org/3/tv/${id}/similar?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`;
    const data = await getCachedOrFetch(cacheKey,url,1800);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data.results);
  } catch(err){
  	console.error("TMDB Similar movie error: ",err);
  	res.status(500).json({error :"Failed to fetch similar movies from TMDB"});  	
  }
});

router.get("/tv/:id/credits", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `tv_credits_${id}`;
  try {
    const url = `${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Credits Error:", err);
    res.status(500).json({ error: "Failed to fetch TV credits" });
  }
});

// --- THIS IS THE NEW ROUTE FOR SEASONS/EPISODES ---
router.get("/tv/:id/season/:season_number", async (req, res) => {
  const { id, season_number } = req.params;
  const cacheKey = `tv_season_${id}_${season_number}`;
  try {
    const url = `${BASE_URL}/tv/${id}/season/${season_number}?api_key=${API_KEY}&language=en-US`;
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Season Detail Error:", err);
    res.status(500).json({ error: "Failed to fetch TV season details" });
  }
});
// --- END NEW ROUTE ---

router.get("/genre/tv", async (_req, res) => {
  const cacheKey = "tv_genres";
  try {
    const url = `${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=en-US`;
    const data = await getCachedOrFetch(cacheKey, url);
    if(!data){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB TV Genre Error:", err);
    res.status(500).json({ error: "Failed to fetch TV genres" });
  }
});

router.get("/discover/tv", async (req, res) => {
  const genreParam = req.query.with_genres;
  const language = req.query.language;
  const year = req.query.year;
  const page = req.query.page || 1;

  let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}&language=en-US`;

  if (genreParam) url += `&with_genres=${genreParam}`;
  if (language && language !== "all") url += `&with_original_language=${language}`;
  if (year && year !== "all") url += `&first_air_date_year=${year}`;

  const cacheKey = `discover_tv_${genreParam || "all"}_${language || "all"}_${year || "all"}_${page}`;

  try {
    const data = await getCachedOrFetch(cacheKey, url,86400);
    if(!data || !data.results){
    	return res.status(500).json({error :"Invalid response from TMDB"});
    }
    res.json(data);
  } catch (err) {
    console.error("TMDB Discover TV Error:", err);
    res.status(500).json({ error: "Failed to fetch TV shows" });
  }
});

export { router as tmdbRouter };
