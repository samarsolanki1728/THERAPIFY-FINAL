# Chat storage encryption

Chat message text, conversation titles, and stored exercise titles/reasons/URLs are encrypted before MongoDB writes with AES-256-GCM. Each field write receives a fresh random 12-byte IV and a 16-byte authentication tag. A field-purpose label is authenticated as additional data. The versioned storage format is `tfenc:v1:<base64url envelope>`.

The separate key is a random 32-byte value in `CHAT_ENCRYPTION_KEY`, base64 encoded. It is never sent to the frontend or stored in Atlas. Do not reuse `JWT_SECRET` as the encryption key. Node's built-in crypto implementation handles encryption and authentication; see [Node crypto documentation](https://nodejs.org/api/crypto.html#ciphergetauthtag).

## Key setup and preservation

Run from `backend/`:

```powershell
npm.cmd run chat:key:init
```

This creates the key in the existing Git-ignored `backend/.env` without printing it or changing other settings. Running it again preserves the configured key. Startup fails if the key is absent or invalid. In hosted environments, put the same key in the backend's secret manager/environment. **Back up this key securely: losing or replacing it makes the encrypted chat history unreadable.** Every backend instance must use the same key. Do not place it in a `VITE_` variable, source control, logs, or a database record. Changing keys requires a deliberate decrypt/re-encrypt migration; automatic rotation is not implemented.

## Existing plaintext records

```powershell
npm.cmd run chat:encrypt:check
npm.cmd run chat:encrypt:migrate
npm.cmd run chat:encrypt:check
```

The check command reports counts only. Migration authenticates existing ciphertext before writing anything, encrypts plaintext fields in place, preserves IDs/timestamps/order, and uses compare-and-set updates so concurrent edits are not overwritten. If conflicts occur, rerun it. Already encrypted records are authenticated and left unchanged. Unreadable ciphertext aborts the write pass; never generate another key to resolve a decryption failure.

Deploy the encryption-enabled backend to all instances before migration; an old instance can still write plaintext. Migration updates current records only. Historical Atlas backups, snapshots, oplog history, or previously exported copies can retain old plaintext until their retention periods expire; manage those separately. This change does not erase those historical copies.

## Application behavior

`Conversation` field setters encrypt inputs. Field getters decrypt for authenticated history APIs and consented AI context. API JSON is readable; raw MongoDB documents and `toObject({ getters: false })` contain ciphertext. The save safeguard also encrypts legacy fields when a conversation is saved. Length validation applies to plaintext, not the longer envelope. Chat routes avoid logging exception messages that could include user text.

Avoid `.lean()` for application chat reads, because lean bypasses Mongoose decryption getters. Native collection operations also bypass model setters: use them only for deliberately encrypted maintenance operations, such as the provided migration. Never send raw ciphertext records to the AI. Tests exercise the actual Mongoose write payloads without contacting Atlas.

User IDs, message roles, IDs, timestamps, crisis/scope flags, exercise IDs, and synthetic-record flags remain queryable metadata. This is **server-side encryption of chat content at rest**, not end-to-end encryption. The server can decrypt content, and Gemini receives readable chat/context when invoked. Journal entries and mood records are outside this change. Use HTTPS for deployed API traffic; encryption at rest does not secure an unencrypted transport connection.

## Tests

```powershell
npm.cmd run test:chat-encryption
```

Covers randomized authenticated encryption, tampering, wrong/missing keys, Unicode, plaintext length validation, Mongoose persistence and JSON behavior, renaming, appending messages, legacy records, idempotent migration, and migration conflicts/corruption. Test keys are isolated and random; tests do not read the live `.env` or database.

`node scripts/verifyChatEncryption.js` is a separate live smoke check. It uses the configured backend and Atlas, creates temporary records under fresh synthetic user IDs, verifies ciphertext directly in the database, checks authenticated API round trips and cross-user isolation, then removes only those records. It does not call Gemini or print existing chats. Unlike the unit tests, this command intentionally reads the real backend environment and connects to Atlas.
