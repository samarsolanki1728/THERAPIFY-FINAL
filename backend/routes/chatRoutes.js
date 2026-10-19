const express = require("express");
const mongoose = require("mongoose");
const { rateLimit } = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { generateChatResponse } = require("../services/geminiService");
const { checkMessageSafety } = require("../services/safetyService");
const { checkTopicScope } = require("../services/scopeService");
const { getMoodContext } = require("../services/moodContextService");

const router = express.Router();

// Rate limiter for chat messages: 60 requests per 15 minutes per user
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => String(req.user?.userId || "user"),
  skip: (req) => req.chatSafety?.intercept === true,
  message: {
    message: "Chat limit reached. Please take a mindful breath and try again shortly."
  }
});

/**
 * 1. GET /api/chat/conversations
 * Fetch all conversations for the authenticated user, newest first.
 */
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({ user: userId })
      .sort({ updatedAt: -1 })
      .select("title messages createdAt updatedAt isSynthetic");

    const formatted = conversations.map((conv) => {
      const msgs = conv.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

      return {
        _id: conv._id,
        title: conv.title || "New Conversation",
        messageCount: msgs.length,
        lastMessageSnippet: lastMsg ? lastMsg.text.slice(0, 80) : "",
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        isSynthetic: Boolean(conv.isSynthetic)
      };
    });

    res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Fetch conversations failed.");
    res.status(500).json({ message: "Could not load chat history." });
  }
});

/**
 * 2. POST /api/chat/conversations
 * Explicitly create a new conversation for the authenticated user.
 */
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const title =
      typeof req.body.title === "string" && req.body.title.trim()
        ? req.body.title.trim().slice(0, 100)
        : "New Conversation";

    const conversation = await Conversation.create({
      user: userId,
      title,
      messages: [
        {
          role: "ai",
          text: "Hello, and welcome. I'm here whenever you're ready to talk. How are you feeling today?"
        }
      ]
    });

    res.status(201).json({
      message: "Conversation created successfully",
      conversation
    });
  } catch (error) {
    console.error("Create conversation failed.");
    res.status(500).json({ message: "Could not create conversation." });
  }
});

/**
 * 3. GET /api/chat/conversations/:id
 * Retrieve a specific conversation with all messages (user isolation enforced).
 */
router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      user: userId
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error("Get conversation failed.");
    res.status(500).json({ message: "Could not retrieve conversation." });
  }
});

/**
 * 4. PATCH /api/chat/conversations/:id
 * Rename conversation title (user isolation enforced).
 */
router.patch("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const newTitle = req.body?.title;

    if (!newTitle || typeof newTitle !== "string" || !newTitle.trim()) {
      return res.status(400).json({ message: "Title cannot be empty." });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { title: newTitle.trim().slice(0, 100) }, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.status(200).json({
      message: "Conversation renamed successfully",
      conversation
    });
  } catch (error) {
    console.error("Rename conversation failed.");
    res.status(500).json({ message: "Could not rename conversation." });
  }
});

/**
 * 5. DELETE /api/chat/conversations/:id
 * Delete a conversation (user isolation enforced).
 */
router.delete("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const deleted = await Conversation.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!deleted) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.status(200).json({
      message: "Conversation deleted successfully",
      id
    });
  } catch (error) {
    console.error("Delete conversation failed.");
    res.status(500).json({ message: "Could not delete conversation." });
  }
});

/**
 * Helper to generate a clean title from the user's first message
 */
function deriveConversationTitle(message) {
  const cleaned = message
    .replace(/[#*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 36) {
    return cleaned;
  }
  return cleaned.slice(0, 36) + "…";
}

/**
 * POST /api/chat: history comes only from the authenticated user's database
 * conversation. Client-supplied history and model/system roles are never trusted.
 */
router.post(
  "/",
  authMiddleware,
  async (req, res, next) => {
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim() || message.length > 3000) {
      return res.status(400).json({ message: "Please enter a message between 1 and 3000 characters." });
    }
    if (req.body.contextConsent !== undefined && typeof req.body.contextConsent !== "boolean") {
      return res.status(400).json({ message: "Personalization consent must be true or false." });
    }
    try {
      const id = req.body.conversationId;
      if (id != null && !mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid conversation ID." });
      req.conversation = id ? await Conversation.findOne({ _id: id, user: req.user.userId }) : null;
      if (id && !req.conversation) return res.status(404).json({ message: "Conversation not found." });
      req.chatHistory = (req.conversation?.messages || []).slice(-200).map(item => ({
        role: item.role, text: item.text, isCrisis: item.isCrisis, safetyCategory: item.safetyCategory,
        awaitingSafetyCheck: item.awaitingSafetyCheck, outOfScope: item.outOfScope
      }));
      req.chatSafety = checkMessageSafety(message, req.chatHistory);
      req.chatScope = checkTopicScope(message, req.chatHistory);
      next();
    } catch {
      return res.status(500).json({ message: "Could not load conversation context." });
    }
  },
  chatLimiter,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const userText = req.body.message.trim();
      const conversation = req.conversation || new Conversation({ user: userId, title: deriveConversationTitle(userText), messages: [] });
      const needsAIContext = !req.chatSafety.intercept && req.chatScope.inScope;
      const consent = req.body.contextConsent === true;
      const [userDoc, wellnessContext] = needsAIContext ? await Promise.all([
        User.findById(userId).select("name").lean(),
        consent ? getMoodContext(userId, { includeMoods: true, includeChats: true, includeJournals: true }, conversation._id) : Promise.resolve(null)
      ]) : [null, null];
      const result = await generateChatResponse(userText, req.chatHistory, {
        name: userDoc?.name || "", contextConsent: consent, wellnessContext
      });
      if (result.source === "unavailable") return res.status(503).json({ message: result.reply });
      if (conversation.title === "New Conversation" && conversation.messages.length <= 1) conversation.title = deriveConversationTitle(userText);
      conversation.messages.push(
        { role: "user", text: userText },
        { role: "ai", text: result.reply, isCrisis: Boolean(result.isCrisis), safetyCategory: result.safetyCategory || null,
          awaitingSafetyCheck: Boolean(result.awaitingSafetyCheck), outOfScope: Boolean(result.outOfScope) }
      );
      await conversation.save();
      return res.json({
        reply: result.reply, isCrisis: Boolean(result.isCrisis), outOfScope: Boolean(result.outOfScope),
        safetyCategory: result.safetyCategory || null,
        conversationId: conversation._id, conversationTitle: conversation.title, messages: conversation.messages
      });
    } catch (error) {
      const encryptionSetupError = typeof error?.message === "string" && error.message.startsWith("CHAT_ENCRYPTION_KEY");
      if (encryptionSetupError) {
        console.error("Therapify chat save failed: CHAT_ENCRYPTION_KEY is missing or invalid.");
      } else {
        console.error("Therapify AI request failed:", error?.name || "UnknownError", error?.code || "");
      }
      return res.status(error.name === "VersionError" ? 409 : 500).json({
        message: error.name === "VersionError"
          ? "This conversation changed while you were sending. Reload it and try again."
          : encryptionSetupError
            ? "Chat encryption is not configured. Set CHAT_ENCRYPTION_KEY in the backend environment and restart the server."
            : "Therapify AI is temporarily unavailable. Please try again in a moment."
      });
    }
  }
);

module.exports = router;
