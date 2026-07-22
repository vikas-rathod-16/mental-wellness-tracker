// mongo-init.js
// This file automatically runs when MongoDB starts.
// It creates the database, collections, indexes, and admin user.

db = db.getSiblingDB("mental_wellness");

// -------------------------------
// Create Stress Logs Collection
// -------------------------------
db.createCollection("stress_logs");
db.stress_logs.createIndex({ userId: 1 });
db.stress_logs.createIndex({ createdAt: -1 });

// -------------------------------
// Create Chat History Collection
// -------------------------------
db.createCollection("chat_history");
db.chat_history.createIndex({ userId: 1 });
db.chat_history.createIndex({ timestamp: -1 });

// -------------------------------
// Create Users Collection
// -------------------------------
db.createCollection("users");
db.users.createIndex({ email: 1 }, { unique: true });

// Default Admin User (optional, but helpful for dashboard)
db.users.insertOne({
  name: "Admin",
  email: "admin@mentalapp.com",
  role: "admin",
  createdAt: new Date(),
});

// -------------------------------
print("Mental Wellness DB Initialized Successfully 🚀");