const express = require("express");
const Mood = require("../models/Mood");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Helper to get today's YYYY-MM-DD date string
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// GET all mood entries for the authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const entries = await Mood.find({
      user: req.user.userId,
    }).sort({ dateStr: -1, createdAt: -1 });

    res.status(200).json({ entries });
  } catch (error) {
    console.error("Fetch mood error:", error.message);
    res.status(500).json({
      message: "Could not load mood entries",
    });
  }
});

// GET mood entry for a specific date (YYYY-MM-DD)
router.get("/date/:dateStr", authMiddleware, async (req, res) => {
  try {
    const { dateStr } = req.params;
    const entry = await Mood.findOne({
      user: req.user.userId,
      dateStr,
    });

    res.status(200).json({ entry: entry || null });
  } catch (error) {
    console.error("Fetch mood by date error:", error.message);
    res.status(500).json({
      message: "Could not fetch mood entry",
    });
  }
});

// POST save or update today's/date's mood entry
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { mood, moodLabel, emoji, emotions, note, dateStr } = req.body;

    const numericMood = Number(mood);
    if (!mood || isNaN(numericMood) || numericMood < 1 || numericMood > 5) {
      return res.status(400).json({
        message: "Please select a valid mood score between 1 and 5",
      });
    }

    const targetDateStr = dateStr?.trim() || getTodayStr();

    // Check if an entry already exists for this user and date
    let entry = await Mood.findOne({
      user: req.user.userId,
      dateStr: targetDateStr,
    });

    if (entry) {
      // Update existing entry
      entry.mood = numericMood;
      entry.moodLabel = moodLabel || entry.moodLabel;
      entry.emoji = emoji || entry.emoji;
      entry.emotions = Array.isArray(emotions) ? emotions : [];
      entry.note = typeof note === "string" ? note.trim() : "";
      await entry.save();

      return res.status(200).json({
        message: "Mood entry updated successfully",
        entry,
      });
    } else {
      // Create new entry
      entry = await Mood.create({
        user: req.user.userId,
        mood: numericMood,
        moodLabel: moodLabel || "",
        emoji: emoji || "",
        emotions: Array.isArray(emotions) ? emotions : [],
        note: typeof note === "string" ? note.trim() : "",
        dateStr: targetDateStr,
      });

      return res.status(201).json({
        message: "Mood entry saved successfully",
        entry,
      });
    }
  } catch (error) {
    console.error("Save mood error:", error.message);
    res.status(500).json({
      message: "Could not save mood entry",
    });
  }
});

// PUT update a specific mood entry by ID
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { mood, moodLabel, emoji, emotions, note } = req.body;

    const updateData = {};
    if (mood !== undefined) {
      const numericMood = Number(mood);
      if (isNaN(numericMood) || numericMood < 1 || numericMood > 5) {
        return res.status(400).json({
          message: "Mood score must be between 1 and 5",
        });
      }
      updateData.mood = numericMood;
    }
    if (moodLabel !== undefined) updateData.moodLabel = moodLabel;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (emotions !== undefined && Array.isArray(emotions)) updateData.emotions = emotions;
    if (note !== undefined) updateData.note = typeof note === "string" ? note.trim() : "";

    const entry = await Mood.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!entry) {
      return res.status(404).json({
        message: "Mood entry not found",
      });
    }

    res.status(200).json({
      message: "Mood entry updated successfully",
      entry,
    });
  } catch (error) {
    console.error("Update mood error:", error.message);
    res.status(500).json({
      message: "Could not update mood entry",
    });
  }
});

// DELETE a mood entry by ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const entry = await Mood.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!entry) {
      return res.status(404).json({
        message: "Mood entry not found",
      });
    }

    res.status(200).json({
      message: "Mood entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete mood error:", error.message);
    res.status(500).json({
      message: "Could not delete mood entry",
    });
  }
});

module.exports = router;

