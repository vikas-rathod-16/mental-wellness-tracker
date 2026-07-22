import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, default: "anonymous" },
  message: { type: String, required: true },
  reply: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema, "chat_history");
