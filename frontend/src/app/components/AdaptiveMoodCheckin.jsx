import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Leaf
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// Update these if your React Router uses different paths.
const AI_CHAT_PATH = "/chat";
const WELLNESS_PATH = "/wellness";
const QUESTIONS = {
  "13-18": [
    {
      id: "feelings",
      question: "How have you been feeling over the past few days?",
      options: ["Good", "Okay", "Low", "Overwhelmed", "Not sure"]
    },
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
    {
      id: "energy",
      question: "How has your energy been recently?",
      options: ["High", "Normal", "Low", "Changes often"]
    },
    {
      id: "sleep",
      question: "How has your sleep or rest been?",
      options: ["Restful", "Okay", "Not restful", "Not sure"]
    },
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
    {
      id: "feelings",
      question: "How have you been feeling over the past few days?",
      options: ["Good", "Okay", "Low", "Overwhelmed", "Not sure"]
    },
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
    {
      id: "energy",
      question: "How has your energy been recently?",
      options: ["High", "Normal", "Low", "Changes often"]
    },
    {
      id: "sleep",
      question: "How has your sleep or rest been?",
      options: ["Restful", "Okay", "Not restful", "Not sure"]
    },
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
    {
      id: "feelings",
      question: "How have you been feeling over the past few days?",
      options: ["Good", "Okay", "Low", "Overwhelmed", "Not sure"]
    },
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
    {
      id: "energy",
      question: "How has your energy been recently?",
      options: ["High", "Normal", "Low", "Changes often"]
    },
    {
      id: "sleep",
      question: "How has your sleep or rest been?",
      options: ["Restful", "Okay", "Not restful", "Not sure"]
    },
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

export default function AdaptiveMoodCheckin({
  moodEntryId,
  token: tokenProp
}) {
  const [ageGroup, setAgeGroup] = useState("");
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Hooks must be declared inside the React component.
  const [restoring, setRestoring] = useState(true);
  const saveQueue = useRef(Promise.resolve());

  const questions = QUESTIONS[ageGroup] || [];
  const current = questions[step];

  const token =
    tokenProp || localStorage.getItem("token");

  const progress = result
    ? 100
    : started
    ? Math.round((step / questions.length) * 100)
    : 0;

  function selectAge(value) {
    setAgeGroup(value);
    setStep(0);
    setAnswers({});
    setError("");
  }

  async function updateAnswer(value) {
  const nextAnswers = {
    ...answers,
    [current.id]: value
  };

  setAnswers(nextAnswers);
  setError("");

  try {
    await saveProgress(nextAnswers, step);
  } catch (error) {
    setError(error.message);
  }
}

  function collectAnswers() {
    return questions.map(question => ({
      id: question.id,
      question: question.question,
      answer: answers[question.id] || ""
    }));
  }

  async function finishCheckin() {
    setLoading(true);
    setError("");

    try {
      await saveQueue.current;

      const response = await fetch(
        `${API_URL}/api/mood-coach/finish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          credentials: "include",
          body: JSON.stringify({
            moodEntryId,
            ageGroup,
            consent: true,
            answers: collectAnswers()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save check-in."
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function nextQuestion() {
  if (loading) return;

  setLoading(true);
  setError("");

  try {
    await saveQueue.current;
    if (step === questions.length - 1) {
      await finishCheckin();
      return;
    }

    const nextStep = step + 1;

    await saveProgress(answers, nextStep);
    setStep(nextStep);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}

async function previousQuestion() {
  if (loading || step === 0) return;

  setLoading(true);
  setError("");

  try {
    await saveQueue.current;

    const nextStep = step - 1;

    await saveProgress(answers, nextStep);
    setStep(nextStep);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}


  // DATABASE PERSISTENCE: progress and restoration
  // Requires GET/PUT progress routes and POST finish route on the backend.

function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {})
  };
}

// Saves requests in order, preventing older answers
// from overwriting newer ones.
function saveProgress(nextAnswers, nextStep, group = ageGroup) {
  const payload = {
    moodEntryId,
    ageGroup: group,
    consent: true,
    currentStep: nextStep,
    answers: (QUESTIONS[group] || []).map(question => ({
      id: question.id,
      answer: nextAnswers[question.id] || ""
    }))
  };

  const task = saveQueue.current
    .catch(() => {})
    .then(async () => {
      const response = await fetch(
        `${API_URL}/api/mood-coach/progress`,
        {
          method: "PUT",
          headers: getHeaders(),
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message || "Unable to save progress."
        );
      }

      return response.json();
    });

  saveQueue.current = task;
  return task;
}

// Restore questionnaire when page loads.
useEffect(() => {
  let cancelled = false;

  async function restoreProgress() {
    setRestoring(true);

  if (!moodEntryId) {
      setRestoring(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/mood-coach/progress/${moodEntryId}`,
        {
          headers: getHeaders(),
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Unable to restore questionnaire.");
      }

      const data = await response.json();

      if (cancelled || !data.exists) return;

      const restoredAnswers = {};

      for (const item of data.answers || []) {
        restoredAnswers[item.id] = item.answer;
      }

      setAgeGroup(data.ageGroup);
      setAnswers(restoredAnswers);
      setStep(data.currentStep || 0);
      setConsent(true);
      setStarted(true);

      if (data.completed) {
        setResult(data);
      }
    } catch (error) {
      if (!cancelled) {
        setError(error.message);
      }
    } finally {
      if (!cancelled) {
        setRestoring(false);
      }
    }
  }

  restoreProgress();

  return () => {
    cancelled = true;
  };
}, [moodEntryId, token]);

  // Do not show the age-selection screen until restoration finishes.
  if (restoring) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-gray-600">
          Loading your saved questionnaire...
        </p>
      </div>
    );
  }

  if (!moodEntryId) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-gray-600">
          Save your mood first to begin the questionnaire.
        </p>
      </div>
    );
  }

  // AGE SELECTION SCREEN
  if (!started) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="text-teal-600" />
          <h2 className="text-xl font-semibold">
            Personal Wellness Check-in
          </h2>
        </div>

        <p className="text-gray-600 mb-5">
          Start by selecting your age range.
          You'll receive a short questionnaire
          tailored to your stage of life.
        </p>

        <h3 className="font-medium mb-3">
          Question 1: What is your age range?
        </h3>

        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {[
            { id: "13-18", label: "13–18 years" },
            { id: "19-21", label: "19–21 years" },
            { id: "22-25", label: "22–25 years" }
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectAge(option.id)}
              className={`rounded-xl border p-4 text-center transition ${
                ageGroup === option.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-start gap-3 mb-5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={event =>
              setConsent(event.target.checked)
            }
            className="mt-1"
          />

          <span>
            I agree to save my questionnaire responses
            to my Therapify account for personalized
            wellness suggestions.
          </span>
        </label>

        <button
          type="button"
          disabled={!ageGroup || !consent || loading}
          onClick={async () => {
  setLoading(true);
  setError("");

  try {
    await saveProgress({}, 0, ageGroup);
    setStarted(true);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}}
          className="w-full rounded-xl bg-teal-600 px-5 py-3 text-white disabled:opacity-50"
        >
          Start Questionnaire
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // COMPLETION SCREEN
  if (result) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-teal-600" size={28} />

          <div>
            <h2 className="text-xl font-semibold">
              Check-in Complete
            </h2>

            <p className="text-sm text-gray-500">
              Age group: {result.ageGroup || ageGroup}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-teal-50 p-5">
          <h3 className="font-semibold mb-2">
            Your Personal Reflection
          </h3>

          <p className="text-gray-700 leading-relaxed">
            {result.reflection}
          </p>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-semibold mb-4">
            What would you like to do next?
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                window.location.assign(AI_CHAT_PATH)
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 p-4 text-white"
            >
              <MessageCircle size={20} />
              Continue with AI Chat
            </button>

            <button
              type="button"
              onClick={() =>
                window.location.assign(WELLNESS_PATH)
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-teal-600 p-4 text-teal-700"
            >
              <Leaf size={20} />
              Explore Wellness Exercises
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          This reflection supports everyday wellness
          and is not a medical assessment.
        </p>
      </div>
    );
  }
  // QUESTIONNAIRE SCREEN
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">
          Wellness Questionnaire
        </h2>

        <span className="text-sm text-gray-500">
          Question {step + 2} of {questions.length + 1}
        </span>
      </div>

      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-6">
        <div
          className="h-full bg-teal-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-teal-700 mb-2">
        Age group: {ageGroup}
      </p>

      <h3 className="text-xl font-semibold mb-5">
        {current.question}
      </h3>

      <div className="space-y-3 mb-6">
        {current.options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => updateAnswer(option)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              answers[current.id] === option
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={previousQuestion}
          disabled={step === 0 || loading}
          className="flex items-center gap-2 rounded-xl border px-4 py-3 disabled:opacity-40"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={finishCheckin}
            disabled={loading}
            className="rounded-xl px-3 py-3 text-gray-600 disabled:opacity-50"
          >
            Finish Early
          </button>

          <button
            type="button"
            onClick={nextQuestion}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : step === questions.length - 1
              ? "Finish"
              : answers[current.id]
              ? "Next"
              : "Skip"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        All questions are optional. You may skip any
        question or finish early.
      </p>
    </div>
  );
}

