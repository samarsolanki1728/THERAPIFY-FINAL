import { API_BASE_URL } from "../lib/api";
import { useState, useEffect, useMemo } from "react";
import AdaptiveMoodCheckin from "../app/components/AdaptiveMoodCheckin";
import { Link } from "react-router";
import { CheckCircle, MessageCircle, AlertCircle, Pencil, Trash2, Lock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar
} from "recharts";

const API_URL = `${API_BASE_URL}/api/moods`;

const emotionsList = [
  "Calm", "Anxious", "Hopeful", "Sad", "Grateful",
  "Irritable", "Energised", "Tired", "Content", "Overwhelmed"
];

const moodsList = [
  { emoji: "😔", label: "Low", value: 1 },
  { emoji: "😐", label: "Okay", value: 2 },
  { emoji: "🙂", label: "Good", value: 3 },
  { emoji: "😊", label: "Great", value: 4 },
  { emoji: "😄", label: "Excellent", value: 5 }
];

// Helper to get local date string YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Mood() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [note, setNote] = useState("");
  const [logged, setLogged] = useState(false);
  const [tab, setTab] = useState("week");

  // API State
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const token = localStorage.getItem("token");

  // Fetch all mood entries on mount
  useEffect(() => {
    const fetchMoodEntries = async () => {
      const savedToken = localStorage.getItem("token");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load mood entries.");
        }

        const fetchedEntries = data.entries || [];
        setEntries(fetchedEntries);

        // Check if there is an entry for today
        const todayStr = getLocalDateStr();
        const existingToday = fetchedEntries.find((e) => e.dateStr === todayStr);

        if (existingToday) {
          setTodayEntry(existingToday);
          setSelectedMood(existingToday.mood);
          setSelectedEmotions(existingToday.emotions || []);
          setNote(existingToday.note || "");
          setLogged(true);
        }
      } catch (err) {
        console.error("Fetch moods error:", err);
        setError(err.message || "Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchMoodEntries();
  }, []);

  const toggleEmotion = (emotion) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((x) => x !== emotion)
        : [...prev, emotion]
    );
  };

  const handleLog = async () => {
    if (!selectedMood) return;

    if (!token) {
      setError("Please sign in to log your mood.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const selectedMoodObj = moodsList.find((m) => m.value === selectedMood);
      const payload = {
        mood: selectedMood,
        moodLabel: selectedMoodObj?.label || "",
        emoji: selectedMoodObj?.emoji || "",
        emotions: selectedEmotions,
        note: note.trim(),
        dateStr: getLocalDateStr(),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save mood entry.");
      }

      const savedEntry = data.entry;
      setTodayEntry(savedEntry);

      // Update local entries state (upsert)
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.dateStr !== savedEntry.dateStr);
        return [savedEntry, ...filtered];
      });

      setLogged(true);
      setSuccessMsg("Mood logged successfully!");
    } catch (err) {
      console.error("Save mood error:", err);
      setError(err.message || "Could not save mood. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteToday = async () => {
    if (!todayEntry) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete today's mood entry?"
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_URL}/${todayEntry._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete mood entry.");
      }

      setEntries((prev) => prev.filter((e) => e._id !== todayEntry._id));
      setTodayEntry(null);
      setSelectedMood(null);
      setSelectedEmotions([]);
      setNote("");
      setLogged(false);
      setSuccessMsg("Mood entry deleted.");
    } catch (err) {
      console.error("Delete mood error:", err);
      setError(err.message || "Could not delete mood entry.");
    } finally {
      setDeleting(false);
    }
  };

  // --- Dynamic Trend Calculations ---

  // 1. Weekly Trends (Mon - Sun of current week)
  const weekData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const entriesMap = new Map();
    entries.forEach((e) => {
      if (e.dateStr) entriesMap.set(e.dateStr, e);
    });

    return dayNames.map((dayName, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const dateStr = getLocalDateStr(d);
      const entry = entriesMap.get(dateStr);
      return {
        day: dayName,
        mood: entry ? entry.mood : null,
        dateStr,
      };
    });
  }, [entries]);

  const weekAvg = useMemo(() => {
    const validScores = weekData.filter((d) => d.mood !== null).map((d) => d.mood);
    if (validScores.length === 0) return null;
    return validScores.reduce((a, b) => a + b, 0) / validScores.length;
  }, [weekData]);

  // 2. Monthly Trends (Wk 1 to Wk 4 of current month)
  const monthData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const weekBuckets = [
      { week: "Wk 1", minDay: 1, maxDay: 7, scores: [] },
      { week: "Wk 2", minDay: 8, maxDay: 14, scores: [] },
      { week: "Wk 3", minDay: 15, maxDay: 21, scores: [] },
      { week: "Wk 4", minDay: 22, maxDay: 31, scores: [] },
    ];

    entries.forEach((e) => {
      if (!e.dateStr) return;
      const [y, m, d] = e.dateStr.split("-").map(Number);
      if (y === currentYear && m === currentMonth + 1) {
        const bucket = weekBuckets.find((b) => d >= b.minDay && d <= b.maxDay);
        if (bucket && typeof e.mood === "number") {
          bucket.scores.push(e.mood);
        }
      }
    });

    return weekBuckets.map((b) => ({
      week: b.week,
      avg: b.scores.length > 0
        ? Number((b.scores.reduce((sum, s) => sum + s, 0) / b.scores.length).toFixed(1))
        : null,
    }));
  }, [entries]);

  const monthAvg = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthScores = entries
      .filter((e) => {
        if (!e.dateStr) return false;
        const [y, m] = e.dateStr.split("-").map(Number);
        return y === currentYear && m === currentMonth && typeof e.mood === "number";
      })
      .map((e) => e.mood);

    if (monthScores.length === 0) return null;
    return monthScores.reduce((a, b) => a + b, 0) / monthScores.length;
  }, [entries]);

  // 3. Streak Calculation (Consecutive days ending today or yesterday)
  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const dateSet = new Set(entries.map((e) => e.dateStr));
    let count = 0;
    let checkDate = new Date();
    let checkStr = getLocalDateStr(checkDate);

    if (!dateSet.has(checkStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = getLocalDateStr(checkDate);
    }

    while (dateSet.has(checkStr)) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = getLocalDateStr(checkDate);
    }
    return count;
  }, [entries]);

  // 4. Trend Calculation (% change of current week vs previous week)
  const trendPercent = useMemo(() => {
    if (weekAvg === null) return "--";

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToPrevMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) - 7;
    const prevMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToPrevMonday);

    const prevWeekSet = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate() + i);
      prevWeekSet.add(getLocalDateStr(d));
    }

    const prevScores = entries
      .filter((e) => prevWeekSet.has(e.dateStr) && typeof e.mood === "number")
      .map((e) => e.mood);

    if (prevScores.length === 0) return "--";

    const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
    const diff = ((weekAvg - prevAvg) / prevAvg) * 100;

    if (diff > 0) return `↑ ${Math.round(diff)}%`;
    if (diff < 0) return `↓ ${Math.abs(Math.round(diff))}%`;
    return "0%";
  }, [entries, weekAvg]);

  // Current displayed average based on active tab
  const activeAvg = tab === "week" ? weekAvg : monthAvg;
  const displayAvgText = activeAvg !== null ? `${activeAvg.toFixed(1)} / 5` : "N/A";

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <span className="text-xs font-medium text-primary uppercase tracking-widest">
            Today's check-in
          </span>
          <h1 className="font-display text-4xl font-medium text-foreground mt-2 mb-2">
            How are you feeling?
          </h1>
          <p className="text-muted-foreground">
            Takes 30 seconds. Builds a picture over time.
          </p>
        </div>

        {!token && (
          <div className="flex items-center gap-3 p-4 bg-muted/80 rounded-2xl mb-8 text-sm text-muted-foreground border border-border">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span>
              Please{" "}
              <Link to="/signin" className="text-primary font-medium underline">
                sign in
              </Link>{" "}
              to save your mood entries and track your trends.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-600 rounded-2xl mb-6 text-sm border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl mb-6 text-sm border border-emerald-200">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-10 text-center">
            <p className="text-sm text-muted-foreground">Loading your mood data...</p>
          </div>
        ) : !logged ? (
          <div className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-10">
            <p className="text-sm font-medium text-foreground mb-4">Overall mood</p>
            <div className="flex gap-3 mb-8">
              {moodsList.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMood(m.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl text-2xl transition-all ${
                    selectedMood === m.value
                      ? "bg-primary/20 ring-2 ring-primary/40 scale-105"
                      : "bg-secondary hover:bg-muted"
                  }`}
                >
                  {m.emoji}
                  <span className="text-xs text-muted-foreground font-medium">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-foreground mb-3">
              What emotions are present?
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {emotionsList.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEmotion(e)}
                  className={`text-sm px-3.5 py-1.5 rounded-full border transition-all ${
                    selectedEmotions.includes(e)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-foreground mb-3">
              Anything you want to note?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's been on your mind today…"
              rows={3}
              className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-6"
            />

            <button
              type="button"
              onClick={handleLog}
              disabled={!selectedMood || saving || !token}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? "Saving..."
                : todayEntry
                ? "Update today's mood"
                : "Log today's mood"}
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-10 text-center">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-medium text-foreground mb-2">
              Mood logged for today
            </h3>
            {todayEntry && (
              <div className="mb-5 p-4 bg-secondary/50 rounded-2xl max-w-md mx-auto text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{todayEntry.emoji}</span>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {todayEntry.moodLabel} ({todayEntry.mood}/5)
                  </span>
                </div>
                {todayEntry.emotions && todayEntry.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {todayEntry.emotions.map((emo) => (
                      <span
                        key={emo}
                        className="text-xs px-2.5 py-0.5 bg-background rounded-full text-foreground border border-border"
                      >
                        {emo}
                      </span>
                    ))}
                  </div>
                )}
                {todayEntry.note && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    "{todayEntry.note}"
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Thanks for checking in. Keep it up — consistency is what creates insight.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setLogged(false)}
                className="flex items-center gap-1.5 text-sm border border-border px-5 py-2.5 rounded-full hover:bg-secondary/60 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit today's entry
              </button>
              <button
                type="button"
                onClick={handleDeleteToday}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-5 py-2.5 rounded-full hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "Deleting..." : "Delete entry"}
              </button>
              <Link
                to="/chat"
                className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Talk it through
              </Link>
            </div>
          </div>
        )}

        {todayEntry && <AdaptiveMoodCheckin moodEntryId={todayEntry._id} />}

        {/* Section 2: Mood Trends */}
        <div className="bg-card rounded-3xl p-7 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-medium text-foreground">
              Your mood trends
            </h2>
            <div className="flex gap-1 bg-muted rounded-full p-1 text-xs font-medium">
              {["week", "month"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full transition-all capitalize ${
                    tab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12 px-4 bg-secondary/30 rounded-2xl border border-dashed border-border mb-6">
              <p className="text-sm font-medium text-foreground mb-1">
                No mood entries yet
              </p>
              <p className="text-xs text-muted-foreground">
                Start logging your mood to see your trends.
              </p>
            </div>
          ) : tab === "week" ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart id="mood-week" data={weekData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(90,80,65,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#7A7570" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[1, 5]} />
                <Tooltip
                  formatter={(value) => [`Score: ${value}/5`, "Mood"]}
                  contentStyle={{
                    background: "#FDFAF5",
                    border: "1px solid rgba(90,80,65,0.12)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#5B8A87"
                  strokeWidth={2.5}
                  connectNulls={true}
                  dot={{ fill: "#5B8A87", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#B5A8D9" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart id="mood-month" data={monthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(90,80,65,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#7A7570" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  formatter={(value) => [value ? `${value}/5` : "No data", "Avg Mood"]}
                  contentStyle={{
                    background: "#FDFAF5",
                    border: "1px solid rgba(90,80,65,0.12)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avg" fill="#5B8A87" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Avg mood", value: displayAvgText },
              { label: "Streak", value: `${streak} ${streak === 1 ? "day" : "days"}` },
              { label: "Trend", value: trendPercent },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-secondary/60 rounded-xl p-3 text-center"
              >
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-sm font-medium text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}