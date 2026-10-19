const path = require('node:path');
const mongoose = require('mongoose');
const { getEncryptionKey, encryptLegacyConversation } = require('../services/chatEncryptionService');

async function migrateCollection(collection, { apply = false } = {}) {
  const counts = { scanned: 0, needsEncryption: 0, migrated: 0, conflicts: 0, unreadable: 0 };
  // First validate all existing ciphertext before any write. A wrong key or
  // damaged envelope must never result in silently encrypting over existing data.
  for await (const record of collection.find({})) {
    counts.scanned++;
    try { if (Object.keys(encryptLegacyConversation(record)).length) counts.needsEncryption++; }
    catch { counts.unreadable++; }
  }
  if (!apply || counts.unreadable) return counts;
  for await (const record of collection.find({})) {
    const changes = encryptLegacyConversation(record);
    if (!Object.keys(changes).length) continue;
    // Compare-and-set protects concurrent chat edits/appends; retry on a later run.
    // Do not alter message IDs, timestamps, ownership, or conversation ordering.
    const filter = { _id: record._id };
    for (const field of ['title', 'messages']) filter[field] = Object.hasOwn(record, field) ? { $eq: record[field] } : { $exists: false };
    const result = await collection.updateOne(filter, { $set: changes });
    if (result.matchedCount) counts.migrated++; else counts.conflicts++;
  }
  return counts;
}

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  getEncryptionKey();
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const counts = await migrateCollection(mongoose.connection.collection('conversations'), { apply: process.argv.includes('--apply') });
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'check', ...counts }));
    if (counts.unreadable || counts.conflicts) process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch(() => {
  // Connection strings and document contents must not appear in console output.
  console.error('Chat encryption migration failed. Check the database connection, encryption key, and permissions. No plaintext was logged.');
  process.exitCode = 1;
});
module.exports = { migrateCollection };
