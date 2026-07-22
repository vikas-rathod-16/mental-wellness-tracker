import express from "express";
import axios from "axios";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

const SYSTEM_PROMPT =
  "You are CalmMind, a warm and supportive wellness companion. " +
  "Keep replies short (2-4 sentences), kind, and non-clinical. " +
  "You are not a therapist and do not diagnose — for serious distress, " +
  "gently encourage the person to reach out to a mental health professional " +
  "or a crisis line.";

/**
 * Very small fallback so the demo still works with no OPENAI_API_KEY set.
 */
function fallbackReply(message) {
  const text = message.toLowerCase();
  if (/(sad|down|depress|upset)/.test(text)) {
    return "I'm sorry you're feeling that way. Do you want to tell me a bit more about what's going on?";
  }
  if (/(anxious|worried|stress|overwhelm|nervous)/.test(text)) {
    return "That sounds stressful. Try taking a slow breath in for 4 counts, hold for 4, and out for 6 — I'm here if you want to talk it through.";
  }
  if (/(happy|great|good|excited)/.test(text)) {
    return "That's wonderful to hear! What's been going well for you?";
  }
  return "Thanks for sharing that. I'm here to listen — tell me more about how you're feeling.";
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

  let reply;

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      reply = response.data.choices[0].message.content.trim();
    } catch (err) {
      console.error("OpenAI error:", err.response?.data || err.message);
      reply = fallbackReply(message);
    }
  } else {
    reply = fallbackReply(message);
  }

  try {
    await ChatMessage.create({ message, reply, userId });
  } catch (err) {
    // Don't fail the chat response just because logging failed
    console.error("Error saving chat message:", err.message);
  }

  res.json({ reply });
});

export default router;
