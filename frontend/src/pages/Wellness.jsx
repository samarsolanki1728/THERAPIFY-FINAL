import { API_BASE_URL } from "../lib/api";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Wind, Moon, Heart, Sparkles, Sun, Leaf,
  ArrowRight, X, Search, Play, Pause, RotateCcw
} from "lucide-react";

const API = API_BASE_URL;

const guidedVideo = {
  id: "ucla-mindfulness",
  title: "Mindful Awareness Practice",
  instructor: "UCLA Health",
  youtubeId: "YFSc7Ck0Ao0",
  category: "Mindfulness",
  description: "An optional guided mindfulness practice. You can stop whenever you like."
};

const activities = [
  {
    id: "breath", icon: Wind, title: "Guided Breathing",
    category: "Breathing", duration: "2–5 min",
    description: "Follow a gentle breathing rhythm at your own pace.",
    steps: [
      "Sit comfortably and relax your shoulders.",
      "Follow the expanding and contracting circle.",
      "Breathe naturally; stop if you feel uncomfortable."
    ]
  },
  {
    id: "box", icon: Wind, title: "Box Breathing",
    category: "Breathing", duration: "4 min",
    description: "An optional structured breathing practice.",
    steps: [
      "Breathe in gently for four counts.",
      "Pause briefly if comfortable.",
      "Breathe out gently for four counts.",
      "Repeat only while comfortable; skip holds if preferred."
    ]
  },
  {
    id: "sleep", icon: Moon, title: "Sleep Ritual",
    category: "Sleep", duration: "10 min",
    description: "A quiet routine to help you wind down.",
    steps: [
      "Dim the lights.",
      "Put your phone aside if possible.",
      "Relax your shoulders and jaw.",
      "Notice a calm, comfortable place."
    ]
  },
  {
    id: "scan", icon: Heart, title: "Body Scan",
    category: "Grounding", duration: "7 min",
    description: "Notice body sensations without judging them.",
    steps: [
      "Sit or lie comfortably.",
      "Notice your feet and legs.",
      "Move attention gently through the rest of your body.",
      "Return attention to your surroundings."
    ]
  },
  {
    id: "gratitude", icon: Sparkles, title: "Gratitude Pause",
    category: "Mindfulness", duration: "3 min",
    description: "Notice a few things you appreciate, without forcing positivity.",
    steps: [
      "Find a quiet moment.",
      "Think of one to three things you appreciate.",
      "Write them down if you like."
    ]
  },
  {
    id: "morning", icon: Sun, title: "Morning Intention",
    category: "Mindfulness", duration: "5 min",
    description: "Choose a small intention for your day.",
    steps: [
      "Ask what would help today.",
      "Pick a simple intention.",
      "Think of one achievable action."
    ]
  },
  {
    id: "ground", icon: Leaf, title: "5-4-3-2-1 Grounding",
    category: "Grounding", duration: "3 min",
    description: "Use your senses to notice the present moment.",
    steps: [
      "Notice five things you see.",
      "Notice four things you feel.",
      "Notice three things you hear.",
      "Notice two things you smell.",
      "Notice one thing you taste, if available."
    ]
  },
  {
    id: "movement", icon: Sun, title: "Gentle Movement Break",
    category: "Movement", duration: "5 min",
    description: "Take a comfortable movement break.",
    steps: [
      "Stand or sit comfortably.",
      "Stretch your arms gently.",
      "Move around at an easy pace.",
      "Rest whenever you need to."
    ]
  }
];

const guidedVideos = {
  breath: {
    youtubeId: "qn9jN1unfc8",
    title: "Guided gentle breathing",
    creator: "Affinity Care / NHS resource"
  },
  box: {
    youtubeId: "G25IR0c-Hj8",
    title: "Guided box breathing",
    creator: "Hampshire and Isle of Wight NHS resource"
  },
  sleep: {
    youtubeId: "3o9etQktCpI",
    title: "Guided sleep wind-down",
    creator: "Headspace"
  },
  scan: {
    youtubeId: "3o9etQktCpI",
    title: "Guided body scan",
    creator: "Headspace"
  },
  gratitude: {
    youtubeId: "4P2SCgwXVxc",
    title: "Guided gratitude meditation",
    creator: "Great Meditation"
  },
  morning: {
    youtubeId: "qPHoTSaZ7yY",
    title: "Setting a morning intention",
    creator: "Great Meditation"
  },
  ground: {
    youtubeId: "30VMIEmA114",
    title: "5-4-3-2-1 grounding",
    creator: "The Partnership in Education"
  },
  movement: {
    youtubeId: "p-RAvYswUGc",
    title: "Gentle seated stretch routine",
    creator: "Dr. Kristie Ennis"
  }
};

const categories = [
  "All",
  ...new Set(activities.map((activity) => activity.category))
];

function BreathingTimer({ onClose }) {
  const [minutes, setMinutes] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const total = minutes * 60;
  const finished = elapsed >= total;
  const inhale = elapsed % 10 < 4;

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setElapsed((previous) => Math.min(previous + 1, total));
    }, 1000);

    return () => clearInterval(timer);
  }, [running, total]);

  useEffect(() => {
    if (finished && running) setRunning(false);
  }, [finished, running]);

  function resetTimer() {
    setRunning(false);
    setElapsed(0);
  }

  return (
    <div className="space-y-5 text-center">
      <p className="text-sm text-muted-foreground">
        Breathe gently. You can pause or stop at any time.
      </p>

      <div className="flex justify-center gap-2">
        {[2, 3, 5].map((m) => (
          <button
            key={m}
            type="button"
            disabled={running}
            onClick={() => {
              setMinutes(m);
              setElapsed(0);
            }}
            className={`px-4 py-2 rounded-full text-xs border ${
              minutes === m
                ? "bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="h-56 flex items-center justify-center" aria-live="polite">
        <div
          className={`rounded-full bg-primary/15 border-4 border-primary/30 flex items-center justify-center transition-all duration-1000 ease-in-out ${
            running && inhale ? "w-48 h-48" : "w-36 h-36"
          }`}
        >
          <div className="text-center">
            <p className="font-display text-xl">
              {finished
                ? "Complete"
                : running
                ? inhale
                  ? "Breathe in"
                  : "Breathe out"
                : "Ready"}
            </p>

            <p className="text-xs text-muted-foreground mt-2">
              {Math.floor(Math.max(0, total - elapsed) / 60)}:
              {String(Math.max(0, total - elapsed) % 60).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm flex items-center gap-2"
          onClick={() => {
            if (finished) {
              setElapsed(0);
              setRunning(true);
            } else {
              setRunning(!running);
            }
          }}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pause" : finished ? "Start again" : "Start / Resume"}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          className="border border-border px-4 py-3 rounded-full text-sm flex items-center gap-2"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-sm text-muted-foreground underline"
      >
        Close exercise
      </button>
    </div>
  );
}

export default function Wellness() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [exerciseMode, setExerciseMode] = useState("read");

  const [videoOpen, setVideoOpen] = useState(false);
  const [preferVideo, setPreferVideo] = useState(true);

  const [feedback, setFeedback] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [consentMoods, setConsentMoods] = useState(true);
  const [consentChats, setConsentChats] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const activityId = searchParams.get("activity");

  function openActivity(activity) {
    setExerciseMode("read");
    setActive(activity);
  }

  function closeActivity() {
    setExerciseMode("read");
    setActive(null);

    if (searchParams.has("activity")) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete("activity");
        return next;
      });
    }
  }

  useEffect(() => {
    if (!activityId) return;

    const selectedActivity = activities.find(
      (activity) => activity.id === activityId
    );

    if (selectedActivity) {
      openActivity(selectedActivity);
    }
  }, [activityId]);

  async function getAIRecommendations(forceRefresh = false) {
    if (aiLoading) return;

    if (!consentMoods && !consentChats) {
      setAiError("Please select at least one data source to generate personalized recommendations.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    if (forceRefresh) setAiResult(null);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please sign in to get personalized recommendations.");
      }

      const response = await fetch(`${API}/api/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          consent: {
            includeMoods: consentMoods,
            includeChats: consentChats,
            includeJournals: false
          },
          refresh: forceRefresh
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to get recommendations.");
      }

      setAiResult(data);
    } catch (error) {
      setAiError(error.message || "Something went wrong.");
    } finally {
      setAiLoading(false);
    }
  }

  async function submitFeedback(value) {
    setFeedback(value);
    setFeedbackMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      setFeedbackMessage("Sign in to save your feedback.");
      return;
    }

    setFeedbackBusy(true);

    try {
      const response = await fetch(`${API}/api/wellness/sessions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          activityId: guidedVideo.id,
          helpfulness: value
        })
      });

      if (!response.ok) {
        throw new Error(`Could not save feedback (${response.status}).`);
      }

      setFeedbackMessage("Your feedback was saved. Thank you for sharing.");
    } catch (error) {
      setFeedbackMessage(error.message);
    } finally {
      setFeedbackBusy(false);
    }
  }

  const filtered = useMemo(() => {
    return activities.filter((activity) => {
      const matchesCategory =
        category === "All" || activity.category === category;

      const matchesSearch =
        `${activity.title} ${activity.description}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <>
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">

          {/* Page Header */}

          <header className="mb-9">
            <span className="text-xs font-medium text-primary uppercase tracking-widest">
              Wellness library
            </span>

            <h1 className="font-display text-4xl font-medium text-foreground mt-2 mb-2">
              Small practices,
              <br />
              <em className="font-normal">meaningful change.</em>
            </h1>

            <p className="text-muted-foreground max-w-lg">
              Explore simple, optional activities at your own pace.
            </p>
          </header>

          {/* Therapify AI Recommendations */}

          <section className="bg-card border border-border rounded-2xl p-6 mb-8">
            <div className="flex gap-2 items-center text-primary">
              <Sparkles size={18} />
              <h2 className="font-medium">
                Recommended by Therapify AI
              </h2>
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              Receive smart, evidence-informed practices matching your recent emotional state,
              mood check-ins, and conversation context.
            </p>

            <div className="mt-3 p-3.5 rounded-xl bg-secondary/30 border border-border/70 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Privacy & Data Consent
              </span>
              <div className="flex flex-wrap gap-4 text-xs text-foreground">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentMoods}
                    onChange={(e) => setConsentMoods(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Include mood logs & check-ins</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChats}
                    onChange={(e) => setConsentChats(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Include recent chat topics</span>
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your private journal is never accessed. Therapify AI only recommends exercises that exist in this library.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => getAIRecommendations(false)}
                disabled={aiLoading}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {aiLoading
                  ? "Therapify AI is reflecting..."
                  : "Get Recommendations from Therapify AI"}
              </button>

              {aiResult && (
                <button
                  type="button"
                  onClick={() => getAIRecommendations(true)}
                  disabled={aiLoading}
                  className="border border-border hover:bg-secondary px-4 py-2.5 rounded-full text-xs font-medium text-foreground transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw size={14} className={aiLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              )}
            </div>

            {aiError && (
              <p role="alert" className="text-sm text-destructive mt-3">
                {aiError}
              </p>
            )}

            {aiResult && (
              <div className="mt-5 space-y-4">
                {aiResult.reflection && (
                  <div className="bg-secondary/40 rounded-xl p-4">
                    <h3 className="text-sm font-medium mb-2">
                      Your Personalized Reflection
                    </h3>

                    <p className="text-sm text-foreground whitespace-pre-line">
                      {aiResult.reflection}
                    </p>
                  </div>
                )}

                {aiResult.message && (
                  <p className="text-sm text-muted-foreground">
                    {aiResult.message}
                  </p>
                )}

                {aiResult.isCrisis ? (
                  <div role="alert" className="rounded-xl border border-border p-4">
                    <p className="text-sm">
                      If you may be in immediate danger, seek human support.
                      In India, call 112 for emergencies or Tele-MANAS
                      at 14416.
                    </p>
                  </div>
                ) : (
                  <>
                    {(aiResult.recommendations || []).length > 0 ? (
                      <div className="grid sm:grid-cols-3 gap-3">
                        {aiResult.recommendations.map((item) => {
                          const activity = activities.find(
                            (a) => a.id === item.id
                          );

                          if (!activity) return null;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openActivity(activity)}
                              className="text-left rounded-xl bg-secondary/60 p-4 hover:bg-secondary transition-colors"
                            >
                              <p className="text-sm font-medium">
                                {activity.title}
                              </p>

                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.duration}
                              </p>

                              {item.reason && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {item.reason}
                                </p>
                              )}

                              <p className="text-xs text-primary mt-3">
                                Start activity →
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      !aiResult.message && (
                        <p className="text-sm text-muted-foreground">
                          No personalized activities available right now.
                          You can explore the activities below.
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Suggestions support everyday wellbeing and are not
              medical advice or a diagnosis.
            </p>
          </section>

          {/* Friend's Guided Wellness Video */}

          <section className="bg-card border border-border rounded-2xl p-6 mb-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex gap-2 items-center text-primary">
                  <Play size={18} />
                  <h2 className="font-medium">
                    A little guidance, from a real person
                  </h2>
                </div>

                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Prefer someone to guide you? Try a curated UCLA Health
                  mindfulness video. It is optional, and you can stop
                  whenever you want.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={preferVideo}
                  onChange={(e) => setPreferVideo(e.target.checked)}
                />
                Show video
              </label>
            </div>

            {preferVideo && (
              <div className="mt-5">
                {!videoOpen ? (
                  <button
                    type="button"
                    onClick={() => setVideoOpen(true)}
                    className="w-full text-left rounded-2xl border border-border bg-secondary/40 p-6 hover:bg-secondary/70 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded-full bg-primary text-primary-foreground p-3">
                        <Play size={20} />
                      </span>

                      <span>
                        <strong className="block text-base">
                          {guidedVideo.title}
                        </strong>
                        <span className="block text-xs text-muted-foreground mt-1">
                          UCLA Health · Guided video · Play when ready
                        </span>
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                      <iframe
                        title={guidedVideo.title}
                        src={`https://www.youtube-nocookie.com/embed/${guidedVideo.youtubeId}?rel=0`}
                        className="w-full h-full"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setVideoOpen(false)}
                      className="text-xs underline text-muted-foreground"
                    >
                      Close video
                    </button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  YouTube may process viewing data when you play this video.
                  Video availability and captions depend on the creator.
                </p>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">
                    If you tried it, how did it feel?
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      ["helped", "Helpful"],
                      ["neutral", "About the same"],
                      ["not_helpful", "Not for me"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={feedbackBusy}
                        onClick={() => submitFeedback(value)}
                        className={`px-4 py-2 rounded-full border text-xs ${
                          feedback === value
                            ? "bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {feedbackMessage && (
                    <p role="status" className="text-xs text-muted-foreground mt-2">
                      {feedbackMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Exercise Search */}

          <div className="relative mb-5">
            <Search className="absolute left-4 top-3 w-4 h-4 text-muted-foreground" />

            <input
              type="text"
              aria-label="Search wellness activities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Categories */}

          <div className="flex gap-2 flex-wrap mb-8">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`text-sm px-4 py-1.5 rounded-full border transition-all ${
                  category === item
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:border-primary/40"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Exercise Library */}

          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((activity) => {
              const Icon = activity.icon;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => openActivity(activity)}
                  className="text-left bg-card rounded-2xl p-6 border border-border hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <h3 className="text-sm font-medium">
                          {activity.title}
                        </h3>

                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {activity.duration}
                        </span>
                      </div>

                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                        {activity.category}
                      </span>

                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        {activity.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 items-center mt-4 text-xs text-primary">
                    Begin exercise
                    <ArrowRight size={13} />
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No matching activities found.
            </p>
          )}

          <p className="mt-10 text-sm text-muted-foreground">
            Wellness activities support everyday wellbeing
            and do not replace professional care.
          </p>
        </div>
      </div>

      {/* Activity Modal */}

      {active && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeActivity();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            className="bg-card rounded-3xl p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl"
          >
            <div className="flex justify-between items-center mb-5 gap-4">
              <div>
                <h2 className="font-display text-xl">
                  {active.title}
                </h2>

                <p className="text-xs text-muted-foreground">
                  {active.duration} · {active.category}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={closeActivity}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Choose the way you feel most comfortable practicing.
            </p>

            <div
              className="grid grid-cols-2 gap-2 mb-6"
              role="tablist"
              aria-label="Exercise guidance format"
            >
              <button
                type="button"
                role="tab"
                aria-selected={exerciseMode === "read"}
                onClick={() => setExerciseMode("read")}
                className={`rounded-xl px-3 py-3 text-sm border ${
                  exerciseMode === "read"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border"
                }`}
              >
                Read & do it yourself
              </button>

              {guidedVideos[active.id] && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={exerciseMode === "video"}
                  onClick={() => setExerciseMode("video")}
                  className={`rounded-xl px-3 py-3 text-sm border flex items-center justify-center gap-2 ${
                    exerciseMode === "video"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border"
                  }`}
                >
                  <Play size={15} />
                  Follow guided video
                </button>
              )}
            </div>

            {exerciseMode === "read" || !guidedVideos[active.id] ? (
              active.id === "breath" ? (
                <BreathingTimer onClose={closeActivity} />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-5">
                    {active.description}
                  </p>

                  <ol className="space-y-3 mb-6">
                    {(active.steps || []).map((step, index) => (
                      <li key={index} className="text-sm flex gap-3">
                        <span className="text-primary font-medium">
                          {index + 1}.
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <button
                    type="button"
                    onClick={closeActivity}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium"
                  >
                    Done
                  </button>
                </>
              )
            ) : (
              <div>
                <h3 className="text-sm font-medium mb-1">
                  {guidedVideos[active.id].title}
                </h3>

                <p className="text-xs text-muted-foreground mb-3">
                  Guided by {guidedVideos[active.id].creator}.
                  Video length may differ from the written activity.
                </p>

                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    key={active.id}
                    title={`${active.title} guided video`}
                    src={`https://www.youtube-nocookie.com/embed/${guidedVideos[active.id].youtubeId}?rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>

                <div className="flex justify-between gap-3 mt-3 text-xs">
                  <span className="text-muted-foreground">
                    YouTube may collect viewing data when played.
                  </span>

                  <a
                    className="text-primary underline shrink-0"
                    href={`https://www.youtube.com/watch?v=${guidedVideos[active.id].youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch on YouTube
                  </a>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  You can pause or stop at any time. If the video does not
                  load, use the YouTube link or switch to written instructions.
                </p>

                <button
                  type="button"
                  onClick={() => setExerciseMode("read")}
                  className="mt-4 w-full border border-border py-3 rounded-full text-sm"
                >
                  Switch to written steps
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
