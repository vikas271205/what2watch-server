import "dotenv/config";  
import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.js"; // 👈 this is correct
import dotenv from "dotenv";
import omdbRoutes from "./routes/omdb.js";
import tmdbRoutes from "./routes/tmdb.js";
import watchmodeRoutes from "./routes/watchmode.js";
import tmdbDiscoverRoute from "./routes/tmdbDiscover.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", aiRoutes); // 👈 route prefix is /api
app.use("/api/omdb", omdbRoutes);
app.use("/api/tmdb", tmdbRoutes);
app.use("/api/watchmode", watchmodeRoutes);
app.use("/api/tmdb/discover", tmdbDiscoverRoute);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
