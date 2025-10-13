import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { recommendRouter } from "./routes/recommend.js";
import aiRoutes from "./routes/ai.js";
import { omdbRouter } from "./routes/omdb.js";
import { tmdbRouter } from "./routes/tmdb.js";
import { watchmodeRouter } from "./routes/watchMode.js";
import { discoverRouter } from "./routes/tmdbDiscover.js";
import rewriteOverviewRouter from "./routes/rewriteOverview.js";
import reviewsRouter from "./routes/reviews.js";
import ratingsRouter from "./routes/ratings.js";
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
  // --- FIX: Explicitly allow DELETE, PUT, POST, and GET methods ---
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
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
app.use("/api", reviewsRouter);
app.use("/api", ratingsRouter);

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per window
	standardHeaders: true,
	legacyHeaders: false,
});
app.use('/api', limiter);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
