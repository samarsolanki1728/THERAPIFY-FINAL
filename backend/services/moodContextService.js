const Mood = require("../models/Mood");
const MoodCheckin = require("../models/MoodCheckin");
const Conversation = require("../models/Conversation");
const Journal = require("../models/Journal");

const CONTEXT_DAYS = 30;

async function getMoodContext(userId, consent = {}, excludeConversationId) {
  const includeMoods = consent?.includeMoods === true;
  const includeChats = consent?.includeChats === true;
  const includeJournals = consent?.includeJournals === true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONTEXT_DAYS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const result = {
    moodEntries: [],
    recentChatThemes: [],
    journalThemes: []
  };

  // Fetch mood logs and completed check-ins only when consented.
  if (includeMoods) {
    const recentMoods = await Mood.find({
      user: userId,
      isSynthetic: { $ne: true },
      $or: [
        { dateStr: { $gte: cutoffDate } },
        { createdAt: { $gte: cutoff } }
      ]
    })
      .sort({ dateStr: -1, createdAt: -1 })
      .limit(7)
      .select("mood moodLabel emotions note dateStr")
      .lean();

    const moodIds = recentMoods.map((entry) => entry._id);

    const checkins = moodIds.length
      ? await MoodCheckin.find({
          user: userId,
          moodEntry: { $in: moodIds },
          completed: true,
          isSynthetic: { $ne: true }
        })
          .select("moodEntry ageGroup questions reflection")
          .lean()
      : [];

    const checkinMap = new Map(
      checkins.map((checkin) => [String(checkin.moodEntry), checkin])
    );

    result.moodEntries = recentMoods.map((entry) => {
      const checkin = checkinMap.get(String(entry._id));
      return {
        date: entry.dateStr,
        moodScore: entry.mood,
        moodLabel: entry.moodLabel,
        emotions: entry.emotions,
        note: (entry.note || "").slice(0, 300),
        answers: checkin
          ? checkin.questions
              .filter((item) => item.answer?.trim())
              .slice(0, 6)
              .map((item) => ({
                question: (item.question || "").slice(0, 160),
                answer: item.answer.trim().slice(0, 240)
              }))
          : []
      };
    });
  }

  // Fetch other conversations only when the user explicitly opts in.
  if (includeChats) {
    const conversationQuery = {
      user: userId,
      isSynthetic: { $ne: true },
      updatedAt: { $gte: cutoff }
    };
    if (excludeConversationId) {
      conversationQuery._id = { $ne: excludeConversationId };
    }

    const recentConversations = await Conversation.find(conversationQuery)
      .sort({ updatedAt: -1 })
      .limit(3)
      .select("title messages updatedAt");

    const themes = [];
    for (const conv of recentConversations) {
      const userMsgs = (conv.messages || [])
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => (m.text || "").slice(0, 300));
      if (userMsgs.length > 0) {
        themes.push({
          date: conv.updatedAt?.toISOString(),
          conversationTitle: (conv.title || "").slice(0, 100),
          recentUserNotes: userMsgs
        });
      }
    }
    result.recentChatThemes = themes;
  }

  // Include only journal entries that also have their own saved AI-analysis consent.
  if (includeJournals) {
    const recentJournals = await Journal.find({
      user: userId,
      allowAIAnalysis: true,
      isSynthetic: { $ne: true },
      createdAt: { $gte: cutoff }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title body mood tag aiAnalysis createdAt")
      .lean();

    result.journalThemes = recentJournals.map((j) => ({
      date: j.createdAt?.toISOString(),
      title: (j.title || "").slice(0, 100),
      mood: (j.mood || "").slice(0, 60),
      snippet: (j.body || "").slice(0, 400),
      patterns: (j.aiAnalysis?.emotionalPatterns || "").slice(0, 240),
      triggers: (j.aiAnalysis?.stressTriggers || []).slice(0, 5),
      positiveDevelopments: (j.aiAnalysis?.positiveDevelopments || []).slice(0, 5)
    }));
  }

  return result;
}

module.exports = { getMoodContext };
