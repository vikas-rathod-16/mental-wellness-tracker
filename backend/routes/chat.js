import express from "express";
import axios from "axios";
import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

const SYSTEM_PROMPT =
  "You are CalmMind, a compassionate, emotionally intelligent mental wellness and stress-relief companion. " +
  "When users ask questions or share feelings, provide genuine empathy, thoughtful perspective, and practical, actionable techniques (such as deep breathing, cognitive reframing, grounding exercises, mindfulness habits, or small manageable action steps). " +
  "Be supportive, warm, structured, and easy to read. " +
  "You are not a clinical doctor and do not diagnose medical conditions; for acute crisis or self-harm concerns, gently provide crisis helpline resources.";

/**
 * Fallback reply if external LLM API is ever unreachable or GROQ_API_KEY is not configured yet.
 */
function fallbackReply(message) {
  const text = message.toLowerCase();
  if (/(sad|down|depress|upset)/.test(text)) {
    return "I'm sorry you're going through this. Remember that feelings come in waves. Would you like to try a gentle 3-step breathing exercise, or talk about what brought this on?";
  }
  if (/(anxious|worried|stress|overwhelm|nervous)/.test(text)) {
    return "That sounds overwhelming. Let's take a slow breath together: inhale for 4 counts, hold for 4, and exhale slowly for 6. Focus on what is directly in your control right now.";
  }
  if (/(happy|great|good|excited)/.test(text)) {
    return "That's wonderful to hear! Celebrating these positive moments reinforces emotional resilience. What contributed to this feeling?";
  }
  return "I hear you. Taking a step back and acknowledging your feelings is a great first step. What is one small thing that would help you feel more grounded right now?";
}

/**
 * POST /chat
 * Body: { message, userId? }
 * Returns: { reply }
 */
router.post("/", async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  let reply;

  if (apiKey) {
    try {
      let recentHistory = [];
      if (userId && mongoose.connection.readyState === 1) {
        try {
          recentHistory = await ChatMessage.find({ userId })
            .sort({ timestamp: -1 })
            .limit(6);
          recentHistory.reverse();
        } catch (dbErr) {
          console.warn("Could not fetch chat history:", dbErr.message);
        }
      }

      const conversationMessages = [];
      for (const entry of recentHistory) {
        conversationMessages.push({ role: "user", content: entry.message });
        conversationMessages.push({ role: "assistant", content: entry.reply });
      }
      conversationMessages.push({ role: "user", content: message });

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationMessages,
          ],
          temperature: 0.7,
          max_tokens: 600,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );
      reply = response.data.choices[0].message.content.trim();
    } catch (err) {
      console.error("Groq error:", err.response?.data || err.message);
      reply = fallbackReply(message);
    }
  } else {
    reply = fallbackReply(message);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await ChatMessage.create({ message, reply, userId });
    } catch (err) {
      console.error("Error saving chat message:", err.message);
    }
  }

  res.json({ reply });
});

export default router;