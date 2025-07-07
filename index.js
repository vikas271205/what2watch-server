import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import aiRoutes from "./routes/ai.js";
import { omdbRouter } from "./routes/omdb.js";
import { tmdbRouter } from "./routes/tmdb.js";
import { watchmodeRouter } from "./routes/watchMode.js";
import { discoverRouter } from "./routes/tmdbDiscover.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


const allowedOrigins = [
  'http://localhost:3000',
  'https://what2watch-271205.web.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use("/api", aiRoutes);
app.use("/api/omdb", omdbRouter);
app.use("/api/tmdb", tmdbRouter);
app.use("/api/watchmode", watchmodeRouter);
app.use("/api/tmdb/discover", discoverRouter);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
