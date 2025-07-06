import dotenv from "dotenv";
import { fetchWithRetry } from "./fetchWithRetry.js";
dotenv.config();

const genrePairs = [
  ["action", 28],
  ["adventure", 12],
  ["animation", 16],
  ["comedy", 35],
  ["crime", 80],
  ["documentary", 99],
  ["drama", 18],
  ["family", 10751],
  ["fantasy", 14],
  ["history", 36],
  ["horror", 27],
  ["music", 10402],
  ["mystery", 9648],
  ["romance", 10749],
  ["scifi", 878],
  ["thriller", 53],
  ["war", 10752],
  ["western", 37],
];

const languageMap = {
  english: "en",
  hindi: "hi",
  spanish: "es",
  french: "fr",
  japanese: "ja",
  korean: "ko"
};

const GENRE_MAP = Object.fromEntries(genrePairs);
const REVERSE_GENRE_MAP = Object.fromEntries(
  genrePairs.map(([k, v]) => [v, k])
);

function buildDiscoverUrl({ genre, language, year, minRating }) {
  const TMDB_KEY = process.env.TMDB_API_KEY;
  const genreId = GENRE_MAP[(genre || "").toLowerCase()] || "";
  const langCode = languageMap[(language || "").toLowerCase()] || "en";

  let url =
    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}` +
    `&include_adult=false` +
    `&sort_by=popularity.desc` +
    (genreId ? `&with_genres=${genreId}` : "") +
    `&with_original_language=${langCode}` +
    `&vote_count.gte=100`;

  if (year) url += `&primary_release_year=${year}`;
  if (minRating) url += `&vote_count.gte=50`; // Less restrictive


  return url;
}


export async function getRecommendedMovies(prefs) {
  try {
    const url = buildDiscoverUrl(prefs);
    const data = await fetchWithRetry(url);
    return (data.results || []).slice(0, 6).map((movie) => ({
      id: movie.id,
      title: movie.title,
      imageUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      rating: movie.vote_average,
      language: movie.original_language,
      genres: movie.genre_ids?.map((id) => REVERSE_GENRE_MAP[id] || id)
    }));
  } catch (err) {
    console.error("TMDB fetch error:", err);
    return [];
  }
}
