import fetch from "node-fetch";

export async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`TMDB responded with ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn(`Retry ${attempt + 1} failed: ${err.message}`);

      if (attempt === retries) {
        console.error("Final TMDB fetch failed:", err.message);
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1))); // Exponential-ish backoff
    }
  }
}
