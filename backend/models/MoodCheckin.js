
const mongoose = require("mongoose");

const MoodCheckinSchema = new mongoose.Schema(
  {
    currentStep: {
    type: Number,
    default: 0,
    min: 0,
    max: 8
  },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    moodEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mood",
      required: true
    },

    ageGroup: {
      type: String,
      enum: ["13-18", "19-21", "22-25"],
      required: true
    },

    questions: [
      {
        question: {
          type: String,
          required: true,
          maxlength: 240
        },
        answer: {
          type: String,
          default: "",
          maxlength: 500
        },
        _id: false
      }
    ],

    reflection: {
      type: String,
      default: "",
      maxlength: 500
    },

    recommendations: [
      {
        id: {
          type: String,
          required: true
        },
        reason: {
          type: String,
          required: true,
          maxlength: 180
        },
        _id: false
      }
    ],

    completed: {
      type: Boolean,
      default: false
    },
    isSynthetic: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

MoodCheckinSchema.index(
  { user: 1, moodEntry: 1 },
  { unique: true }
  
);

module.exports =
  mongoose.models.MoodCheckin ||
  mongoose.model("MoodCheckin", MoodCheckinSchema);
