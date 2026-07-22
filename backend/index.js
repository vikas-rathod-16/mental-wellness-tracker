import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import stressRoutes from "./routes/stress.js";
import chatRoutes from "./routes/chat.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ------------------ DB CONNECT ------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
  }
}
connectDB();

// ------------------ ROUTES ------------------
app.use("/stress", stressRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({ message: "MindEase Backend Running..." });
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});