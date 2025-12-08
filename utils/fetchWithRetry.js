import fetch from "node-fetch";

/**
 * A robust HTTP fetch wrapper with:
 * - Timeout support
 * - AbortController cancellation
 * - Retry logic with exponential backoff
 * - Retryable status detection (429, 5xx)
 */
export async function fetchWithRetry(
  url,
  retries = 3,
  timeout = 8000
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { signal: controller.signal });

      clearTimeout(timer);

      // Retry only if TMDB/OMDB/Watchmode responds with retryable codes
      const retryableStatus = [429, 500, 502, 503, 504];

      if (!res.ok) {
        // Retryable error → throw to retry
        if (retryableStatus.includes(res.status)) {
          throw new Error(`Retryable HTTP status: ${res.status}`);
        }

        // Non-retryable → return immediately
        return await res.json();
      }

      // Successful response
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      const isLastAttempt = attempt === retries;

      // Handle timeout
      if (err.name === "AbortError") {
        console.warn(`Timeout on attempt ${attempt + 1} for: ${url}`);
        if (isLastAttempt) throw new Error(`Request timed out: ${url}`);
      }
      // Network or retryable failure
      else {
        console.warn(`Retry ${attempt + 1} failed: ${err.message}`);

        if (isLastAttempt) {
          console.error("Final fetch failure:", err.message);
          throw err;
        }
      }

      // Exponential backoff delay (1s, 2s, 4s…)
      const backoff = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

