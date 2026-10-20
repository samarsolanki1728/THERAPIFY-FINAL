const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Isolated fixtures: no MongoDB connection, provider request or real user data.
process.env.CHAT_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.JWT_SECRET = 'recommendation-test-secret';
delete process.env.AI_MODE;
const requests = [];
let providerFails = false;
let providerRecommendations = [{ id: 'breath', reason: 'An optional pause for the stress you described.' }];
require('../services/geminiRequestService').createGeminiRequest = () => async request => {
  requests.push(request);
  if (providerFails) throw new Error('Test provider unavailable');
  return { text: JSON.stringify({ reflection: 'A little space to pause.', recommendations: providerRecommendations }) };
};
const { generateMoodRecommendations, safetyFromContext } = require('../services/geminiService');
const { getWellnessActivities } = require('../services/wellnessService');
const Mood = require('../models/Mood');
const MoodCheckin = require('../models/MoodCheckin');
const Conversation = require('../models/Conversation');
const Journal = require('../models/Journal');
const cache = require('../services/cacheService');
const router = require('../routes/recommendationRoutes');
const userId = new mongoose.Types.ObjectId().toString();
const moodId = new mongoose.Types.ObjectId();
const queries = [];
function query(model, rows) {
  return criteria => {
    queries.push({ model, criteria });
    const chain = {
      sort() { return chain; }, limit() { return chain; }, select() { return chain; },
      lean() { return Promise.resolve(rows); },
      then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); }
    };
    return chain;
  };
}
test('recommendation context and endpoint regression coverage', async t => {
  t.mock.method(Mood, 'find', query('moods', [{ _id: moodId, mood: 2, note: 'Work feels stressful', emotions: ['tired'], dateStr: '2026-10-20' }]));
  t.mock.method(MoodCheckin, 'find', query('checkins', [{ moodEntry: moodId, questions: [{ question: 'How is rest?', answer: 'Sleep has been difficult' }] }]));
  const conversation = new Conversation({ user: userId, title: 'Work stress', messages: [{ role: 'user', text: 'I feel tense about work' }], updatedAt: new Date() });
  t.mock.method(Conversation, 'find', query('chats', [conversation]));
  t.mock.method(Journal, 'find', () => assert.fail('Journals were not consented to'));
  const app = express(); app.use(express.json()); app.use('/api/recommendations', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/recommendations`;
  async function request(consent, authorized = true) {
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '5m' })}` } : {}) },
      body: JSON.stringify({ consent, refresh: true })
    });
    return { status: response.status, data: await response.json() };
  }
  await t.test('reads only consented user data, decrypts chat excerpts and sends object context to provider', async () => {
    const result = await request({ includeMoods: true, includeChats: true });
    assert.equal(result.status, 200); assert.equal(result.data.source, 'gemini');
    assert.equal(result.data.recommendations[0].id, 'breath');
    assert.equal(typeof safetyFromContext, 'function');
    const prompt = requests.at(-1).contents;
    assert.match(prompt, /Work feels stressful/);
    assert.match(prompt, /Sleep has been difficult/);
    assert.match(prompt, /I feel tense about work/);
    assert.ok(!prompt.includes('tfenc:'));
    for (const { criteria } of queries) assert.equal(criteria.user, userId);
  });
  await t.test('chat-only and mood-only consent exclude the other source', async () => {
    queries.length = 0;
    assert.equal((await request({ includeChats: true })).status, 200);
    assert.deepEqual(queries.map(value => value.model), ['chats']);
    assert.ok(!requests.at(-1).contents.includes('Work feels stressful'));
    queries.length = 0;
    assert.equal((await request({ includeMoods: true })).status, 200);
    assert.deepEqual(queries.map(value => value.model), ['moods', 'checkins']);
    assert.ok(!requests.at(-1).contents.includes('I feel tense about work'));
  });
  await t.test('provider outages and empty catalog matches use real rule-based suggestions', async () => {
    providerFails = true;
    const result = await request({ includeMoods: true });
    assert.equal(result.status, 200); assert.equal(result.data.source, 'rules');
    assert.ok(result.data.recommendations.length > 0);
    providerFails = false; providerRecommendations = [{ id: 'invented', reason: 'Invalid' }];
    assert.equal((await request({ includeChats: true })).data.source, 'rules');
    providerRecommendations = [{ id: 'breath', reason: 'A pause' }];
  });
  await t.test('authentication and explicit consent are required before database reads', async () => {
    queries.length = 0;
    assert.equal((await request({ includeMoods: true }, false)).status, 401);
    assert.equal((await request({})).status, 403);
    assert.equal(queries.length, 0);
  });
  await t.test('context safety precedes provider calls; historical statements do not suppress another urgent entry', async () => {
    const before = requests.length;
    const context = { moodEntries: [{ note: 'I was not suicidal last year' }], recentChatThemes: [{ recentUserNotes: ["I am going to hurt myself right now"] }] };
    assert.equal(safetyFromContext(context).isCrisis, true);
    const result = await generateMoodRecommendations(context, getWellnessActivities());
    assert.equal(result.safetyHandled, true); assert.deepEqual(result.recommendations, []);
    assert.equal(requests.length, before);
  });
  await t.test('empty context does not call the provider', async () => {
    const before = requests.length;
    const result = await generateMoodRecommendations({ moodEntries: [], recentChatThemes: [], journalThemes: [] }, getWellnessActivities());
    assert.deepEqual(result.recommendations, []); assert.equal(requests.length, before);
  });
  cache.clear();
});
