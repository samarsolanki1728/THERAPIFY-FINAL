const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mood: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    moodLabel: {
      type: String,
      default: "",
    },
    emoji: {
      type: String,
      default: "",
    },
    emotions: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    dateStr: {
      type: String,
      required: true,
      index: true,
    },
    isSynthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

moodSchema.index({ user: 1, dateStr: 1 });

module.exports = mongoose.model("Mood", moodSchema);

