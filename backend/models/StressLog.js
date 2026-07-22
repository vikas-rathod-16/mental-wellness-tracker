import mongoose from "mongoose";

const stressLogSchema = new mongoose.Schema({
  userId: { type: String, default: "anonymous" },
  text: { type: String, required: true },
  stress: { type: Number, required: true },
  sentimentScore: { type: Number },
  emotion: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.StressLog ||
  mongoose.model("StressLog", stressLogSchema, "stress_logs");
