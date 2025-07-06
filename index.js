import "dotenv/config";  
import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.js"; // 👈 this is correct
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", aiRoutes); // 👈 route prefix is /api

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
