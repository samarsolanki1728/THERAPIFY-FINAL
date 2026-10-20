
const express = require("express");
const cors = require("cors");
require("dotenv").config();
// Fail closed before accepting requests if the server-only chat key is missing.
require("./services/chatEncryptionService").getEncryptionKey();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const journalRoutes = require("./routes/journalRoutes");
const moodRoutes = require("./routes/moodRoutes");
const moodCoachRoutes = require("./routes/moodCoachRoutes");
const chatRoutes = require("./routes/chatRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

const createWellnessRoutes = require("./routes/wellnessRoutes");
const requireAuth = require("./middleware/authMiddleware");

const app = express();

// Allow frontend requests, including authentication cookies.
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Parse incoming JSON request bodies.
app.use(express.json());

// Register API routes.
app.use("/api/auth", authRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/mood-coach", moodCoachRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.use("/api/events", require("./routes/eventRoutes")({}));

// Friend's Wellness API with authentication.
app.use("/api/wellness", createWellnessRoutes(requireAuth));

// Health check.
app.get("/", (req, res) => {
  res.json({
    message: "Therapify API is running"
  });
});

const PORT = process.env.PORT || 5001;

// Accept requests only after the shared Atlas connection is ready.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
