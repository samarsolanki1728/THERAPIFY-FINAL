const express = require("express");
const { createHash } = require("node:crypto");
const Journal = require("../models/Journal");
const authMiddleware = require("../middleware/authMiddleware");
const { generateJournalAnalysis } = require("../services/geminiService");
const { getWellnessActivities } = require("../services/wellnessService");
const { checkMessageSafety } = require("../services/safetyService");
const cache = require("../services/cacheService");

const router = express.Router();
const ANALYSIS_VERSION = "scope-v2";
const analysisCacheKey = entry => `journal_${ANALYSIS_VERSION}_${entry._id}_${createHash("sha256").update(JSON.stringify([entry.title, entry.body])).digest("hex")}`;

// Save a journal entry
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, body, mood, tag, allowAIAnalysis } = req.body;

    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({
        message: "Journal content is required",
      });
    }

    if (allowAIAnalysis !== undefined && typeof allowAIAnalysis !== "boolean") {
      return res.status(400).json({ message: "AI analysis consent must be true or false." });
    }
    const entry = new Journal({
      user: req.user.userId,
      title: title?.trim() || "Untitled entry",
      body: body.trim(),
      mood: mood || "Not specified",
      tag: tag || "Personal",
      allowAIAnalysis: allowAIAnalysis === true,
    });

    // If user explicitly consented and requested AI analysis upon saving
    if (allowAIAnalysis === true) {
        try {
          const activities = getWellnessActivities();
          const analysis = await generateJournalAnalysis(
            body.trim(),
            entry.title,
            activities
          );
          entry.aiAnalysis = {
            ...analysis,
            policyVersion: ANALYSIS_VERSION,
            analyzedAt: new Date(),
          };
          cache.set(analysisCacheKey(entry), entry.aiAnalysis, 1800);
        } catch (analysisErr) {
          console.error("Auto journal analysis unavailable.");
        }
    }

    await entry.save();

    res.status(201).json({
      message: "Journal entry saved successfully",
      entry,
    });
  } catch (error) {
    console.error("Save journal error:", error.message);
    res.status(500).json({
      message: "Could not save journal entry",
    });
  }
});

// Get the signed-in user's journal entries
router.get("/", authMiddleware, async (req, res) => {
  try {
    const entries = await Journal.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({ entries });
  } catch (error) {
    console.error("Fetch journal error:", error.message);
    res.status(500).json({
      message: "Could not load journal entries",
    });
  }
});

// Get a single journal entry
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const entry = await Journal.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.status(200).json({ entry });
  } catch (error) {
    console.error("Get journal entry error:", error.message);
    res.status(500).json({ message: "Could not load journal entry" });
  }
});

// Update a journal entry
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, body, mood, tag, allowAIAnalysis } = req.body;

    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({
        message: "Journal content is required",
      });
    }

    const updateFields = {
      title: title?.trim() || "Untitled entry",
      body: body.trim(),
      mood: mood || "Not specified",
      tag: tag || "Personal",
    };

    if (allowAIAnalysis !== undefined) {
      if (typeof allowAIAnalysis !== "boolean") return res.status(400).json({ message: "AI analysis consent must be true or false." });
      updateFields.allowAIAnalysis = allowAIAnalysis;
    }

    // Invalidate cache if content changed
    cache.delete(`journal_${req.params.id}`);

    const entry = await Journal.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      { $set: updateFields, $unset: { aiAnalysis: 1 } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!entry) {
      return res.status(404).json({
        message: "Journal entry not found",
      });
    }

    res.status(200).json({
      message: "Journal entry updated successfully",
      entry,
    });
  } catch (error) {
    console.error("Update journal error:", error.message);
    res.status(500).json({
      message: "Could not update journal entry",
    });
  }
});

// Delete a journal entry
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    cache.delete(`journal_${req.params.id}`);

    const entry = await Journal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!entry) {
      return res.status(404).json({
        message: "Journal entry not found",
      });
    }

    res.status(200).json({
      message: "Journal entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete journal error:", error.message);
    res.status(500).json({
      message: "Could not delete journal entry",
    });
  }
});

/**
 * Intelligent Gemini-Powered Emotional Analysis for a Journal Entry
 * Requires explicit user consent before sending journal text to Gemini
 */
router.post("/:id/analyze", authMiddleware, async (req, res) => {
  try {
    const { consent, forceRefresh } = req.body;

    if (consent !== true) {
      return res.status(403).json({
        message:
          "Your explicit consent is required before analyzing your private journal with Therapify AI.",
      });
    }

    const entry = await Journal.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    // Safety is checked on the current body before any cached/stored reflection.
    const safety = checkMessageSafety(entry.body);
    if (safety.intercept) {
      return res.json({
        isCrisis: safety.isCrisis,
        analysis: { emotionalPatterns: safety.reply.replace(/\*\*/g, ""), stressTriggers: [], positiveDevelopments: [], recurringConcerns: [], recommendedExercise: null, crisisGuidance: safety.reply }
      });
    }
    if (entry.body.length > 20000) return res.status(400).json({ message: "AI analysis supports entries up to 20,000 characters." });
    const cacheKey = analysisCacheKey(entry);

    // Return cached analysis if available and not forcing refresh
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          analysis: cached,
          fromCache: true,
        });
      }
      if (entry.aiAnalysis?.policyVersion === ANALYSIS_VERSION && entry.aiAnalysis.emotionalPatterns) {
        cache.set(cacheKey, entry.aiAnalysis, 1800);
        return res.status(200).json({
          analysis: entry.aiAnalysis,
          fromCache: true,
        });
      }
    }

    const activities = getWellnessActivities();
    const analysis = await generateJournalAnalysis(
      entry.body,
      entry.title,
      activities
    );

    const savedAnalysis = {
      ...analysis,
      policyVersion: ANALYSIS_VERSION,
      analyzedAt: new Date(),
    };
    const saved = await Journal.findOneAndUpdate(
      { _id: entry._id, user: req.user.userId, body: entry.body, title: entry.title, updatedAt: entry.updatedAt },
      { $set: { aiAnalysis: savedAnalysis, allowAIAnalysis: true } },
      { returnDocument: "after", runValidators: true }
    );
    if (!saved) return res.status(409).json({ message: "This journal changed during analysis. Reopen it and try again." });
    cache.set(cacheKey, saved.aiAnalysis, 1800);

    res.status(200).json({
      analysis: saved.aiAnalysis,
      fromCache: false,
    });
  } catch (error) {
    console.error("Journal analysis unavailable.");
    res.status(500).json({
      message: "Unable to analyze journal entry right now. Please try again.",
    });
  }
});

module.exports = router;
