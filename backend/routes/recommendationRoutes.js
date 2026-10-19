const express = require("express");
const { createHash } = require("node:crypto");
const authMiddleware = require("../middleware/authMiddleware");
const { getMoodContext } = require("../services/moodContextService");
const { getPersonalizedRecommendations } = require("../services/recommendationService");
const { getWellnessActivities } = require("../services/wellnessService");
const { generateMoodRecommendations, safetyFromContext } = require("../services/geminiService");
const cache = require("../services/cacheService");
const router = express.Router();

function normalizeConsent(value) {
  if (value === true) return { includeMoods: true, includeChats: true, includeJournals: false };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = {};
  for (const key of ["includeMoods", "includeChats", "includeJournals"]) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") return null;
    result[key] = value[key] === true;
  }
  return Object.values(result).some(Boolean) ? result : null;
}
function recommendationCacheKey(userId, consent, context) {
  // Consent and source content are both part of the key; edits/deletions and
  // changing data permissions cannot return a result generated from older data.
  const version = createHash("sha256").update(JSON.stringify({ consent, context })).digest("hex");
  return "recs_v2_" + userId + "_" + version;
}
router.post("/", authMiddleware, async (req, res) => {
  try {
    const consent = normalizeConsent(req.body?.consent);
    if (!consent) return res.status(403).json({ message: "Choose the data sources you explicitly allow Therapify AI to use." });
    const context = await getMoodContext(req.user.userId, consent);
    const safety = safetyFromContext(context);
    // Safety and consent are evaluated before any cached analysis.
    if (safety) return res.json({ isCrisis: safety.isCrisis, safetyHandled: true, reflection: safety.reply, recommendations: [] });
    const cacheKey = recommendationCacheKey(req.user.userId, consent, context);
    if (req.body?.refresh !== true) {
      const cached = cache.get(cacheKey);
      if (cached) return res.json({ ...cached, fromCache: true });
    }
    const fallback = getPersonalizedRecommendations(context);
    const hasEntries = context.moodEntries.length || context.recentChatThemes.length || context.journalThemes.length;
    if (!hasEntries) return res.json({ source: "default", reflection: "Add a check-in or a conversation to receive suggestions based on what you share.", recommendations: fallback });
    if (process.env.AI_MODE === "mock") {
      const result = { isCrisis: false, source: "rules", reflection: "Here are some optional practices to explore at your own pace.", recommendations: fallback };
      cache.set(cacheKey, result, 900); return res.json(result);
    }
    try {
      const activities = getWellnessActivities();
      const result = await generateMoodRecommendations(context, activities);
      if (result.safetyHandled) return res.json(result);
      const recommendations = result.recommendations.map(item => {
        const activity = activities.find(value => value.id === item.id);
        return activity ? { id: activity.id, title: activity.title, duration: activity.duration, description: activity.description, reason: item.reason, url: "/wellness?activity=" + encodeURIComponent(activity.id) } : null;
      }).filter(Boolean);
      const response = { isCrisis: false, source: "gemini", reflection: result.reflection, recommendations };
      cache.set(cacheKey, response, 900); return res.json(response);
    } catch {
      console.error("AI recommendations unavailable; returning rule-based suggestions.");
      return res.json({ isCrisis: false, source: "rules", reflection: "AI reflection is unavailable right now. These are optional suggestions based on your selected entries.", recommendations: fallback });
    }
  } catch {
    console.error("Recommendation request failed.");
    return res.status(500).json({ message: "Unable to generate recommendations." });
  }
});
module.exports = router;
module.exports.normalizeConsent = normalizeConsent;
module.exports.recommendationCacheKey = recommendationCacheKey;
