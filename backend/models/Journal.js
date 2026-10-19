const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "Untitled entry",
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    mood: {
      type: String,
      default: "Not specified",
    },

    tag: {
      type: String,
      default: "Personal",
    },

    // AI Emotional Analysis (populated with opt-in consent)
    allowAIAnalysis: {
      type: Boolean,
      default: false,
    },

    aiAnalysis: {
      policyVersion: { type: String, default: "" },
      emotionalPatterns: { type: String, default: "" },
      stressTriggers: { type: [String], default: [] },
      positiveDevelopments: { type: [String], default: [] },
      recurringConcerns: { type: [String], default: [] },
      recommendedExercise: {
        id: String,
        title: String,
        reason: String,
        url: String,
      },
      analyzedAt: Date,
    },

    // Flag for synthetic test seed data
    isSynthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

journalSchema.index({ user: 1, createdAt: -1 });

module.exports =
  mongoose.models.Journal || mongoose.model("Journal", journalSchema);
