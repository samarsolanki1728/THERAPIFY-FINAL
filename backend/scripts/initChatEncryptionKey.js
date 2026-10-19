const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');
const { getEncryptionKey } = require('../services/chatEncryptionService');
const envPath = path.resolve(__dirname, '../.env');
const contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const configured = dotenv.parse(contents);
if (Object.hasOwn(configured, 'CHAT_ENCRYPTION_KEY') || process.env.CHAT_ENCRYPTION_KEY) {
  process.env.CHAT_ENCRYPTION_KEY = process.env.CHAT_ENCRYPTION_KEY || configured.CHAT_ENCRYPTION_KEY;
  getEncryptionKey();
  console.log('An encryption key is already configured. It was preserved.');
} else {
  const key = randomBytes(32).toString('base64');
  fs.appendFileSync(envPath, `${contents && !contents.endsWith('\n') ? '\n' : ''}\n# Chat encryption key: keep private and back up securely. Never regenerate for existing data.\nCHAT_ENCRYPTION_KEY=${key}\n`, { mode: 0o600 });
  console.log('Created a chat encryption key in backend/.env. Key value was not printed. Back it up securely.');
}
