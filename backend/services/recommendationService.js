const { getWellnessActivities } = require("./wellnessService");

function getPersonalizedRecommendations(moodContextData = []) {
  const activities = getWellnessActivities();

  // Support both array and object formats
  const moodEntries = Array.isArray(moodContextData)
    ? moodContextData
    : moodContextData.moodEntries || [];

  const chatThemes = Array.isArray(moodContextData?.recentChatThemes)
    ? moodContextData.recentChatThemes
    : [];

  const journalThemes = Array.isArray(moodContextData?.journalThemes) ? moodContextData.journalThemes : [];
  if (!moodEntries.length && !chatThemes.length && !journalThemes.length) {
    return activities.slice(0, 3).map((activity) => ({
      id: activity.id,
      title: activity.title,
      duration: activity.duration,
      description: activity.description,
      reason: "A gentle, grounding practice to support your daily wellness.",
      url: `/wellness?activity=${encodeURIComponent(activity.id)}`
    }));
  }

  const latest = moodEntries[0] || {};

  const contextText = [
    ...(latest.emotions || []),
    latest.note || "",
    ...(latest.answers || []).map((item) => item.answer || ""),
    ...chatThemes.flatMap((t) => t.recentUserNotes || []),
    ...journalThemes.map((entry) => entry.snippet || "")
  ]
    .join(" ")
    .toLowerCase();

  const scored = activities.map((activity) => {
    let score = 0;

    // Match exercise tags with user-reported concerns
    for (const tag of activity.suitableFor || []) {
      if (contextText.includes(tag.toLowerCase())) {
        score += 3;
      }
    }

    // Mood-based weighting
    const moodPreferences = {
      1: ["ground", "scan", "breath"],
      2: ["breath", "ground", "sleep"],
      3: ["morning", "scan", "movement"],
      4: ["gratitude", "movement", "morning"],
      5: ["gratitude", "morning", "movement"]
    };

    if (
      (moodPreferences[Number(latest.moodScore)] || []).includes(activity.id)
    ) {
      score += 2;
    }

    // Tailored fallback reason
    let defaultReason = "Designed to support calm and mindful focus.";
    if (activity.id === "breath" || activity.id === "box") {
      defaultReason = "Helps slow down physical tension and center breathing.";
    } else if (activity.id === "sleep") {
      defaultReason = "Gentle wind-down to quiet an active mind.";
    } else if (activity.id === "ground" || activity.id === "scan") {
      defaultReason = "Connects you to physical senses when feeling overwhelmed.";
    } else if (activity.id === "gratitude") {
      defaultReason = "Cultivates positive perspective without forced optimism.";
    } else if (activity.id === "morning" || activity.id === "movement") {
      defaultReason = "Encourages gentle momentum and fresh energy.";
    }

    return {
      id: activity.id,
      title: activity.title,
      duration: activity.duration,
      description: activity.description,
      reason: defaultReason,
      url: `/wellness?activity=${encodeURIComponent(activity.id)}`,
      score
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...activity }) => activity);
}

module.exports = { getPersonalizedRecommendations };
