
const express = require("express");
const mongoose = require("mongoose");
const Mood = require("../models/Mood");
const MoodCheckin = require("../models/MoodCheckin");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

const AGE_GROUPS = ["13-18", "19-21", "22-25"];

const COMMON = [
  {
    id: "feelings",
    question: "How have you been feeling over the past few days?",
    options: ["Good", "Okay", "Low", "Overwhelmed", "Not sure"]
  },
  {
    id: "energy",
    question: "How has your energy been recently?",
    options: ["High", "Normal", "Low", "Changes often"]
  },
  {
    id: "sleep",
    question: "How has your sleep or rest been?",
    options: ["Restful", "Okay", "Not restful", "Not sure"]
  }
];

const QUESTIONS = {
  "13-18": [
    COMMON[0],
    {
      id: "pressure",
      question: "How manageable have school or study demands felt?",
      options: ["Manageable", "Sometimes stressful", "Very stressful", "Not applicable"]
    },
    {
      id: "friends",
      question: "How have your friendships felt lately?",
      options: ["Supportive", "Okay", "Difficult", "Prefer not to say"]
    },
    COMMON[1],
    COMMON[2],
    {
      id: "support",
      question: "How comfortable are you talking to someone you trust?",
      options: ["Comfortable", "Sometimes", "Not comfortable", "Prefer not to say"]
    },
    {
      id: "freeTime",
      question: "Have you had time for hobbies or enjoyable activities?",
      options: ["Often", "Sometimes", "Rarely"]
    },
    {
      id: "concern",
      question: "What has been affecting your mood most?",
      options: ["Studies", "Friends", "Family", "Tiredness", "Something else", "Not sure"]
    },
    {
      id: "goal",
      question: "What would you like help with right now?",
      options: ["Feeling calmer", "Understanding feelings", "Finding motivation", "Resting", "Talking"]
    }
  ],

  "19-21": [
    COMMON[0],
    {
      id: "pressure",
      question: "How manageable have college or work demands felt?",
      options: ["Manageable", "Sometimes stressful", "Very stressful", "Not applicable"]
    },
    {
      id: "direction",
      question: "How have you felt about your current goals?",
      options: ["Confident", "Still exploring", "Uncertain", "Prefer not to say"]
    },
    COMMON[1],
    COMMON[2],
    {
      id: "relationships",
      question: "How have your friendships and relationships felt?",
      options: ["Supportive", "Okay", "Difficult", "Prefer not to say"]
    },
    {
      id: "balance",
      question: "How balanced has your daily routine felt?",
      options: ["Balanced", "Somewhat balanced", "Not balanced"]
    },
    {
      id: "concern",
      question: "What has influenced your mood the most?",
      options: ["College", "Career", "Relationships", "Family", "Tiredness", "Something else"]
    },
    {
      id: "goal",
      question: "What would you like help with right now?",
      options: ["Feeling calmer", "Understanding feelings", "Finding motivation", "Resting", "Talking"]
    }
  ],

  "22-25": [
    COMMON[0],
    {
      id: "pressure",
      question: "How manageable have your responsibilities felt?",
      options: ["Manageable", "Sometimes stressful", "Very stressful", "Not applicable"]
    },
    {
      id: "balance",
      question: "How has your work-life or personal balance felt?",
      options: ["Balanced", "Somewhat balanced", "Not balanced"]
    },
    COMMON[1],
    COMMON[2],
    {
      id: "relationships",
      question: "How supported have you felt in your relationships?",
      options: ["Supported", "Somewhat supported", "Not supported", "Prefer not to say"]
    },
    {
      id: "future",
      question: "How have you felt about your future plans?",
      options: ["Positive", "Still figuring things out", "Uncertain", "Prefer not to say"]
    },
    {
      id: "concern",
      question: "What has affected your mood most recently?",
      options: ["Work", "Finances", "Relationships", "Family", "Tiredness", "Something else"]
    },
    {
      id: "goal",
      question: "What would you like help with right now?",
      options: ["Feeling calmer", "Understanding feelings", "Finding motivation", "Resting", "Talking"]
    }
  ]
};

const REASONS = {
  breathing: "A comfortable breathing pause may help you slow down.",
  grounding: "A grounding activity can help you notice the present moment.",
  mindfulness: "A mindful pause gives you space to check in.",
  journaling: "Writing down your thoughts may help you reflect.",
  movement: "Gentle movement can offer a refreshing break.",
  sleep: "A wind-down routine may support better rest."
};

function recommend(answers) {
  const map = Object.fromEntries(
    answers.map(a => [a.id, a.answer])
  );

  const ranked = [];

  function add(id) {
    if (!ranked.includes(id)) ranked.push(id);
  }

  if (map.sleep === "Not restful" || map.goal === "Resting") {
    add("sleep");
  }

  if (
    map.feelings === "Overwhelmed" ||
    map.pressure === "Very stressful" ||
    map.goal === "Feeling calmer"
  ) {
    add("grounding");
    add("breathing");
  }

  if (
    map.feelings === "Low" ||
    map.energy === "Low" ||
    map.goal === "Finding motivation"
  ) {
    add("movement");
  }

  if (
    map.goal === "Understanding feelings" ||
    map.goal === "Talking"
  ) {
    add("journaling");
  }

  if (
    map.relationships === "Difficult" ||
    map.friends === "Difficult" ||
    map.support === "Not comfortable"
  ) {
    add("journaling");
  }

  ["mindfulness", "journaling", "grounding"].forEach(add);

  return ranked.slice(0, 3).map(id => ({
    id,
    reason: REASONS[id]
  }));
}

function reflect(answers) {
  const map = Object.fromEntries(
    answers.map(a => [a.id, a.answer])
  );

  let opening =
    "Thank you for taking time to reflect on your day.";

  if (map.feelings === "Overwhelmed") {
    opening =
      "It sounds like several things may have felt overwhelming recently.";
  } else if (map.feelings === "Low") {
    opening =
      "You mentioned feeling low recently, and that deserves attention.";
  } else if (map.feelings === "Good") {
    opening =
      "It's good that you've had some positive feelings recently.";
  } else if (map.feelings === "Okay") {
    opening =
      "It sounds like things have felt fairly steady recently.";
  }

  let followUp =
    "You can choose what kind of support feels useful.";

  if (map.pressure === "Very stressful") {
    followUp =
      "You also mentioned that your responsibilities have felt stressful.";
  } else if (map.sleep === "Not restful") {
    followUp =
      "You also mentioned that rest has been difficult lately.";
  } else if (map.goal === "Talking") {
    followUp =
      "You indicated that talking things through might be helpful.";
  }

  return (
    `${opening} ${followUp} ` +
    "You can take your next step at your own pace."
  ).slice(0, 500);
}

router.post("/finish", auth, async (req, res) => {
  try {
    const { moodEntryId, ageGroup, consent } = req.body;

    if (consent !== true) {
      return res.status(400).json({
        message: "Consent is required."
      });
    }

    if (!AGE_GROUPS.includes(ageGroup)) {
      return res.status(400).json({
        message: "Choose a valid age range."
      });
    }

    if (!mongoose.isValidObjectId(moodEntryId)) {
      return res.status(400).json({
        message: "Invalid mood entry."
      });
    }

    const mood = await Mood.findOne({
      _id: moodEntryId,
      user: req.user.userId
    });

    if (!mood) {
      return res.status(404).json({
        message: "Mood entry not found."
      });
    }

    const existing = await MoodCheckin.findOne({
      user: req.user.userId,
      moodEntry: mood._id
    });

    if (existing?.completed) {
      return res.json({
        done: true,
        ageGroup: existing.ageGroup,
        reflection: existing.reflection,
        recommendations: existing.recommendations,
        questions: existing.questions
      });
    }

    const provided = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    const allowed = QUESTIONS[ageGroup];

    // Only accept the predefined questions and options.
    const answers = allowed.map(q => {
      const submitted = provided.find(
        item => item?.id === q.id
      );

      const answer = q.options.includes(
        submitted?.answer
      )
        ? submitted.answer
        : "";

      return {
        id: q.id,
        question: q.question,
        answer
      };
    });

    const reflection = reflect(answers);
    const recommendations = recommend(answers);

    await MoodCheckin.findOneAndUpdate(
      {
        user: req.user.userId,
        moodEntry: mood._id
      },
      {
        ageGroup,
        questions: answers.map(a => ({
          question: a.question,
          answer: a.answer
        })),
        reflection,
        recommendations,
        completed: true
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true
      }
    );

    return res.json({
      done: true,
      ageGroup,
      reflection,
      recommendations,
      questions: answers
    });
  } catch (error) {
    console.error("Mood check-in error:", error.message);

    return res.status(500).json({
      message: "Unable to save the check-in."
    });
  }
  
});

/**
 * GET /api/mood-coach/progress/:moodEntryId
 * Restore saved questionnaire progress.
 */
router.get("/progress/:moodEntryId", auth, async (req, res) => {
  try {
    const { moodEntryId } = req.params;

    if (!mongoose.isValidObjectId(moodEntryId)) {
      return res.status(400).json({
        message: "Invalid mood entry."
      });
    }

    const mood = await Mood.findOne({
      _id: moodEntryId,
      user: req.user.userId
    });

    if (!mood) {
      return res.status(404).json({
        message: "Mood entry not found."
      });
    }

    const checkin = await MoodCheckin.findOne({
      user: req.user.userId,
      moodEntry: mood._id
    });

    if (!checkin) {
      return res.json({ exists: false });
    }

    const definitions = QUESTIONS[checkin.ageGroup] || [];

    const answers = definitions.map(definition => {
      const saved = checkin.questions.find(
        item => item.question === definition.question
      );

      return {
        id: definition.id,
        answer: saved?.answer || ""
      };
    });

    return res.json({
      exists: true,
      ageGroup: checkin.ageGroup,
      answers,
      currentStep: checkin.currentStep || 0,
      completed: checkin.completed,
      reflection: checkin.reflection,
      recommendations: checkin.recommendations,
      questions: checkin.questions
    });
  } catch (error) {
    console.error("Load progress error:", error.message);

    return res.status(500).json({
      message: "Unable to load questionnaire progress."
    });
  }
});

/**
 * PUT /api/mood-coach/progress
 * Save an unfinished questionnaire.
 */
router.put("/progress", auth, async (req, res) => {
  try {
    const {
      moodEntryId,
      ageGroup,
      answers,
      currentStep,
      consent
    } = req.body;

    if (consent !== true) {
      return res.status(400).json({
        message: "Consent is required."
      });
    }

    if (!mongoose.isValidObjectId(moodEntryId)) {
      return res.status(400).json({
        message: "Invalid mood entry."
      });
    }

    if (!AGE_GROUPS.includes(ageGroup)) {
      return res.status(400).json({
        message: "Invalid age group."
      });
    }

    const mood = await Mood.findOne({
      _id: moodEntryId,
      user: req.user.userId
    });

    if (!mood) {
      return res.status(404).json({
        message: "Mood entry not found."
      });
    }

    const existing = await MoodCheckin.findOne({
      user: req.user.userId,
      moodEntry: mood._id
    });

    if (existing?.completed) {
      return res.status(409).json({
        message: "This questionnaire is already completed."
      });
    }

    const definitions = QUESTIONS[ageGroup];
    const submitted = Array.isArray(answers) ? answers : [];

    const validatedAnswers = definitions.map(definition => {
      const item = submitted.find(
        answer => answer?.id === definition.id
      );

      return {
        question: definition.question,
        answer: definition.options.includes(item?.answer)
          ? item.answer
          : ""
      };
    });

    const step = Number.isInteger(currentStep)
      ? Math.max(0, Math.min(8, currentStep))
      : 0;

    const saved = await MoodCheckin.findOneAndUpdate(
      {
        user: req.user.userId,
        moodEntry: mood._id
      },
      {
        $set: {
          ageGroup,
          questions: validatedAnswers,
          currentStep: step,
          completed: false
        }
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true
      }
    );

    return res.json({
      saved: true,
      currentStep: saved.currentStep,
      ageGroup: saved.ageGroup
    });
  } catch (error) {
    console.error("Save progress error:", error.message);

    return res.status(500).json({
      message: "Unable to save questionnaire progress."
    });
  }
});

module.exports = router;
