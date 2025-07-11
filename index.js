import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { recommendRouter } from "./routes/recommend.js";
import aiRoutes from "./routes/ai.js";
import { omdbRouter } from "./routes/omdb.js";
import { tmdbRouter } from "./routes/tmdb.js";
import { watchmodeRouter } from "./routes/watchMode.js";
import { discoverRouter } from "./routes/tmdbDiscover.js";
import streamingRouter from "./routes/streamingRouter.js";
import rewriteOverviewRouter from "./routes/rewriteOverview.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://what2watch-271205.web.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Use CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Your routes
app.use("/api", aiRoutes);
app.use("/api/omdb", omdbRouter);
app.use("/api/tmdb", tmdbRouter);
app.use("/api/watchmode", watchmodeRouter);
app.use("/api/tmdb/discover", discoverRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api", rewriteOverviewRouter);
app.use("/api/streaming", streamingRouter);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
