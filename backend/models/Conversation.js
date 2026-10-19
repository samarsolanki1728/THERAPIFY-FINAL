const mongoose = require("mongoose");
const { encryptedString, getEncryptionKey, isEncrypted } = require("../services/chatEncryptionService");

const exerciseSchema = new mongoose.Schema({
  id: String,
  title: encryptedString("exercise.title"),
  reason: encryptedString("exercise.reason"),
  url: encryptedString("exercise.url")
}, { toJSON: { getters: true }, toObject: { getters: false } });

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "ai"],
      required: true
    },
    text: encryptedString("message", { required: true, maxLength: 5000 }),
    isCrisis: {
      type: Boolean,
      default: false
    },
    safetyCategory: {
      type: String,
      maxlength: 40,
      default: null
    },
    awaitingSafetyCheck: {
      type: Boolean,
      default: false
    },
    outOfScope: {
      type: Boolean,
      default: false
    },
    recommendedExercises: [exerciseSchema]
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: false }
  }
);

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: encryptedString("title", { trim: true, default: "New Conversation", maxLength: 120 }),
    messages: [messageSchema],
    isSynthetic: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: { getters: true },
    toObject: { getters: false }
  }
);

conversationSchema.index({ user: 1, updatedAt: -1 });

// Setters encrypt all new assignments. Also encrypt any old plaintext fields when
// an existing document is saved, including legacy messages that were not edited.
function protectLegacyFields() {
  getEncryptionKey();
  function protect(document, field) {
    const stored = document.get(field, null, { getters: false });
    if (stored != null && !isEncrypted(stored)) document.set(field, document.get(field));
  }
  protect(this, "title");
  for (const message of this.messages || []) {
    protect(message, "text");
    for (const exercise of message.recommendedExercises || []) {
      for (const field of ["title", "reason", "url"]) protect(exercise, field);
    }
  }
}
conversationSchema.pre("validate", protectLegacyFields);
conversationSchema.pre("save", protectLegacyFields);

module.exports =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);

