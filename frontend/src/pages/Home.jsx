import LandingLayout from "./LandingLayout";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  MessageCircle, TrendingUp, BookOpen, Sparkles, ChevronRight,
  ArrowRight, Shield, Moon, Sun, Wind, Heart, CheckCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/moods`;

const moodsList = [
  { emoji: "😔", label: "Low", value: 1 },
  { emoji: "😐", label: "Okay", value: 2 },
  { emoji: "🙂", label: "Good", value: 3 },
  { emoji: "😊", label: "Great", value: 4 },
  { emoji: "😄", label: "Excellent", value: 5 }
];

const features = [
  {
    icon: MessageCircle,
    title: "AI Companion Chat",
    description: "Reflect and process feelings anytime with a compassionate AI trained in evidence-based therapeutic approaches. Available 24/7, no wait time.",
    color: "bg-accent/20 text-accent-foreground",
    to: "/chat"
  },
  {
    icon: TrendingUp,
    title: "Mood Tracking",
    description: "Log how you feel each day and discover patterns over time. Gentle weekly check-ins help you stay aware of your emotional landscape.",
    color: "bg-primary/15 text-primary",
    to: "/mood"
  },
  {
    icon: BookOpen,
    title: "Private Journal",
    description: "A personal space to write freely. Optional AI-generated reflections help you explore your thoughts at your own pace.",
    color: "bg-secondary text-secondary-foreground",
    to: "/journal"
  },
  {
    icon: Sparkles,
    title: "Wellness Exercises",
    description: "Breathing practices, grounding exercises, and mindfulness cards curated to your current mood and goals.",
    color: "bg-destructive/15 text-destructive",
    to: "/wellness"
  },
  {
    icon: Shield,
    title: "Safety First",
    description: "Thoughtfully designed crisis pathways that feel like care, not a warning label. Your wellbeing is always the priority.",
    color: "bg-primary/10 text-primary",
    to: "/crisis"
  }
];

const steps = [
  {
    number: "01",
    title: "Tell us about yourself",
    body: "A brief, gentle onboarding helps Therapify understand your goals — whether that's managing stress, processing grief, or simply having a space to think out loud."
  },
  {
    number: "02",
    title: "Start at your pace",
    body: "Chat with the AI, log a mood, or write a journal entry. There's no right way to begin. The app adapts to how you show up each day."
  },
  {
    number: "03",
    title: "Build self-awareness",
    body: "Over time, your mood trends and journal patterns reveal what helps and what doesn't. You grow at your own rhythm, with gentle guidance."
  }
];

// Helper to get local date string YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [todayEntry, setTodayEntry] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const token = localStorage.getItem("token");

  // Load User, User Count & Mood Entries
  useEffect(() => {
    // Fetch registered user count from backend
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/count`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === "number") {
          setUserCount(data.count);
        }
      })
      .catch((err) => console.error("Fetch user count error:", err));

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("User parse error:", e);
      }
    } else {
      setUser(null);
    }

    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
      setEntries([]);
      setTodayEntry(null);
      setSelectedMood(null);
      return;
    }

    const fetchMoodEntries = async () => {
      try {
        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          const fetched = data.entries || [];
          setEntries(fetched);

          const todayStr = getLocalDateStr();
          const existingToday = fetched.find((e) => e.dateStr === todayStr);
          if (existingToday) {
            setTodayEntry(existingToday);
            setSelectedMood(existingToday.mood);
          }
        }
      } catch (err) {
        console.error("Home mood fetch error:", err);
      }
    };

    fetchMoodEntries();
  }, []);

  // Calculate dynamic date string (e.g. Saturday, October 10)
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Time-based greeting calculation
  const { greetingText, TimeIcon } = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    let Icon = Sun;

    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
      Icon = Sun;
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = "Good evening";
      Icon = Moon;
    } else if (hour >= 21 || hour < 5) {
      timeGreeting = "Good night";
      Icon = Moon;
    }

    const firstName = user?.name ? user.name.trim().split(" ")[0] : "";
    const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

    return { greetingText: greeting, TimeIcon: Icon };
  }, [user]);

  // Handle mood selection from homepage preview card
  const handleSelectMood = async (moodValue) => {
    if (!token) {
      setError("Please sign in to log your mood.");
      return;
    }

    setSelectedMood(moodValue);
    setSaving(true);
    setError("");
    setSuccessMsg("");

    const moodObj = moodsList.find((m) => m.value === moodValue);
    const payload = {
      mood: moodValue,
      moodLabel: moodObj?.label || "",
      emoji: moodObj?.emoji || "",
      emotions: todayEntry?.emotions || [],
      note: todayEntry?.note || "",
      dateStr: getLocalDateStr(),
    };

    try {
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
        throw new Error(data.message || "Could not save mood.");
      }

      const savedEntry = data.entry;
      setTodayEntry(savedEntry);
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.dateStr !== savedEntry.dateStr);
        return [savedEntry, ...filtered];
      });
      setSuccessMsg("Mood logged!");
    } catch (err) {
      console.error("Save mood home error:", err);
      setError(err.message || "Could not save mood.");
    } finally {
      setSaving(false);
    }
  };

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

  const hasWeekData = useMemo(() => {
    return weekData.some((d) => d.mood !== null);
  }, [weekData]);

  const weekAvg = useMemo(() => {
    const validScores = weekData.filter((d) => d.mood !== null).map((d) => d.mood);
    if (validScores.length === 0) return null;
    return validScores.reduce((a, b) => a + b, 0) / validScores.length;
  }, [weekData]);

  // Dynamic Insight Message based on saved history
  const insightMessage = useMemo(() => {
    if (!token) {
      return "Sign in to log your mood and see personalized wellness insights.";
    }
    if (entries.length === 0) {
      return "Log your first mood to start seeing your weekly trends and insights.";
    }

    const validScores = weekData.filter((d) => d.mood !== null).map((d) => d.mood);
    if (validScores.length === 0) {
      return "Log your mood today to update your weekly trends and insights.";
    }

    if (validScores.length === 1) {
      return "Thanks for checking in today! Consistency builds a deeper picture over time.";
    }

    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const first = validScores[0];
    const last = validScores[validScores.length - 1];

    if (avg >= 4) {
      return "I noticed your mood has been elevated recently. Exploring what supports your positive energy can help sustain it.";
    } else if (avg <= 2) {
      return "It looks like things have been a bit heavy lately. Remember to take gentle care of yourself today.";
    } else if (last > first) {
      return "Your mood has been trending upward this week. It's wonderful to notice these positive shifts!";
    } else if (last < first) {
      return "Your mood had a slight dip recently. Be kind to yourself as you navigate your week.";
    } else {
      return "Your mood has been steady and balanced recently. Consistency is a great foundation for well-being.";
    }
  }, [token, entries, weekData]);

  // Streak & Trend calculations for summary card
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

  const displayAvgText = weekAvg !== null ? `${weekAvg.toFixed(1)} / 5` : "N/A";

  return <LandingLayout {...{ user, formattedDate, greetingText, moodsList, selectedMood, handleSelectMood, saving, error, successMsg, hasWeekData, weekData, insightMessage }} />;
}
