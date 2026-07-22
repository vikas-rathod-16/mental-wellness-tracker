import express from "express";
import StressLog from "../models/StressLog.js";

const router = express.Router();

/**
 * POST /stress/log
 * Body: { text, stress, sentimentScore, emotion?, userId? }
 * Saves a stress-check result that was already computed by the AI service.
 */
router.post("/log", async (req, res) => {
  try {
    const { text, stress, sentimentScore, emotion, userId } = req.body;

    if (!text || stress === undefined) {
      return res.status(400).json({ error: "text and stress are required" });
    }

    const log = await StressLog.create({
      text,
      stress,
      sentimentScore,
      emotion,
      userId,
    });

    res.status(201).json({ ok: true, log });
  } catch (err) {
    console.error("Error saving stress log:", err.message);
    res.status(500).json({ error: "Failed to save stress log" });
  }
});

/**
 * GET /stress/history?userId=optional&limit=50
 * Returns the most recent stress logs.
 */
router.get("/history", async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;
    const filter = userId ? { userId } : {};

    const logs = await StressLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ logs });
  } catch (err) {
    console.error("Error fetching stress history:", err.message);
    res.status(500).json({ error: "Failed to fetch stress history" });
  }
});

export default router;
