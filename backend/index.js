import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import stressRoutes from "./routes/stress.js";
import chatRoutes from "./routes/chat.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());

// ------------------ AI SERVICE REVERSE PROXY ------------------
// Mounted before express.json() to allow seamless streaming of multipart/form-data webcam frames
let AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";
const rawTarget = AI_SERVICE_URL.replace(/^https?:\/\//, "");
if (!rawTarget.includes(".") && !rawTarget.includes("localhost") && !rawTarget.includes("127.0.0.1")) {
  AI_SERVICE_URL = `https://${rawTarget}.onrender.com`;
} else if (!AI_SERVICE_URL.startsWith("http://") && !AI_SERVICE_URL.startsWith("https://")) {
  AI_SERVICE_URL = `https://${rawTarget}`;
}
console.log(`📡 AI Service proxy target configured to: ${AI_SERVICE_URL}`);

app.use(
  "/ai",
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/ai": "" },
    timeout: 60000,
    proxyTimeout: 60000,
    onError: (err, req, res) => {
      console.warn("AI Proxy Notice (service warming up):", err.message);
      res.status(502).json({
        error: "AI Service is waking up from sleep mode (~30s). Please retry in a few seconds.",
        details: err.message,
      });
    },
  })
);

// Keep-alive warm-up ping for Render free tier so calmmind-ai stays awake
if (AI_SERVICE_URL && AI_SERVICE_URL.startsWith("http")) {
  setInterval(() => {
    fetch(`${AI_SERVICE_URL}/health`).catch(() => {});
  }, 9 * 60 * 1000); // every 9 minutes (before 15m sleep timeout)
}

app.use(express.json());

// ------------------ DB CONNECT ------------------
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log("⚠️ MONGO_URI not set. Running in stateless mode (chat fallback active).");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed:", err.message);
    console.warn("Continuing server startup — features will continue working with local fallbacks.");
  }
}
connectDB();

// ------------------ API ROUTES ------------------
app.use("/stress", stressRoutes);
app.use("/chat", chatRoutes);

// Health check endpoint for monitoring & deployment platforms
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CalmMind Unified Backend",
    timestamp: new Date().toISOString(),
  });
});

// ------------------ SERVE FRONTEND STATICS ------------------
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Fallback to index.html for root or unknown static paths
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/chat") || req.path.startsWith("/stress") || req.path.startsWith("/ai")) {
    return next();
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 CalmMind server live on http://localhost:${PORT}`);
});