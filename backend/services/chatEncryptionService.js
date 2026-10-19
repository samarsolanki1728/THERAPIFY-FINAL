const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

const PREFIX = 'tfenc:v1:';

function getEncryptionKey() {
  const value = process.env.CHAT_ENCRYPTION_KEY;
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error('CHAT_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Run npm run chat:key:init.');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw new Error('CHAT_ENCRYPTION_KEY is invalid. Do not replace an existing key without migrating the data.');
  }
  return key;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

// Always encrypt incoming plaintext, even when a user types text resembling an envelope.
function encryptChatText(value, purpose) {
  if (value == null) return value;
  if (typeof value !== 'string') throw new Error('Chat content must be text.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(`therapify:chat:${purpose}:v1`));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function decryptChatText(value, purpose) {
  if (value == null) return value;
  if (typeof value !== 'string') throw new Error('Invalid stored chat content.');
  // Legacy plaintext is readable during migration. New model writes always encrypt.
  if (!value.startsWith('tfenc:')) return value;
  const key = getEncryptionKey();
  try {
    if (!isEncrypted(value)) throw new Error();
    const encoded = value.slice(PREFIX.length);
    const bytes = Buffer.from(encoded, 'base64url');
    if (bytes.length < 28 || bytes.toString('base64url') !== encoded) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(`therapify:chat:${purpose}:v1`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    // Never expose stored content, key material, or unauthenticated plaintext in errors.
    throw new Error('Stored chat content could not be decrypted. Check the encryption key and data integrity.');
  }
}

function encryptedString(purpose, { maxLength, trim = false, ...options } = {}) {
  return {
    type: String,
    ...options,
    set(value) { return encryptChatText(trim && typeof value === 'string' ? value.trim() : value, purpose); },
    get(value) { return decryptChatText(value, purpose); },
    validate: {
      validator(value) {
        if (value == null) return !options.required;
        const plain = decryptChatText(value, purpose);
        return (!options.required || plain.length > 0) && (maxLength == null || plain.length <= maxLength);
      },
      message: 'Invalid chat field length.'
    }
  };
}

// Operates on raw database objects, never on Mongoose objects with decryption getters.
// Used both by the migration and the document-save safeguard for legacy records.
function encryptLegacyConversation(raw) {
  const changes = {};
  function protect(value, purpose) {
    if (value == null) return value;
    if (isEncrypted(value)) { decryptChatText(value, purpose); return value; }
    if (typeof value === 'string' && value.startsWith('tfenc:')) decryptChatText(value, purpose);
    return encryptChatText(value, purpose);
  }
  if (raw.title != null) {
    const title = protect(raw.title, 'title');
    if (title !== raw.title) changes.title = title;
  }
  if (Array.isArray(raw.messages)) {
    let changed = false;
    const messages = raw.messages.map(message => {
      const text = protect(message.text, 'message');
      if (text !== message.text) changed = true;
      const result = { ...message, text };
      if (Array.isArray(message.recommendedExercises)) result.recommendedExercises = message.recommendedExercises.map(exercise => {
        const next = { ...exercise };
        for (const field of ['title', 'reason', 'url']) {
          next[field] = protect(exercise[field], `exercise.${field}`);
          if (next[field] !== exercise[field]) changed = true;
        }
        return next;
      });
      return result;
    });
    if (changed) changes.messages = messages;
  }
  return changes;
}

module.exports = { getEncryptionKey, isEncrypted, encryptChatText, decryptChatText, encryptedString, encryptLegacyConversation };
