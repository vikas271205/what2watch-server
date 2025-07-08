router.get("/", async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.status(400).json({ error: "title is required" });

  const cacheKey = `omdb_${title}_${year || ""}`;

  // ✅ Serve cached result if exists
if (cache.has(cacheKey)) {
  console.log(`🧠 OMDb cache hit: ${cacheKey}`);
  return res.json(cache.get(cacheKey));
}


  try {
    const query = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${query}`;
    if (year) url += `&y=${encodeURIComponent(year)}`;

    console.log("🌐 Fetching OMDb:", url);
    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Invalid JSON from OMDb:", text.slice(0, 100));
      // Cache failed response
      cache.set(cacheKey, { error: "Invalid JSON response" }, 3600);
      return res.status(500).json({ error: "Invalid response from OMDb" });
    }

    if (data.Response === "False") {
      console.warn(`⚠️ OMDb: ${data.Error} for "${title}" (${year})`);
      cache.set(cacheKey, { error: data.Error }, 3600); // ⛔ Cache failure for 1h
      return res.status(404).json({ error: data.Error });
    }

    // ✅ Cache valid response
    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("OMDb API Error:", err);
    res.status(500).json({ error: "Failed to fetch OMDb data" });
  }
});
