const test = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiRequest } = require('../services/geminiRequestService');

test('retries an outage with backoff and preserves the prompt and configuration', async () => {
  const requests = [], delays = [];
  const request = createGeminiRequest({
    generate: async value => {
      requests.push(value);
      if (requests.length < 3) throw Object.assign(new Error('Unavailable'), { status: 503 });
      return { text: 'A response' };
    },
    wait: async ms => delays.push(ms), random: () => 0
  });
  const contents = [{ role: 'user', parts: [{ text: 'Sample' }] }];
  const result = await request({ model: 'model', contents, config: { systemInstruction: 'Policy', maxOutputTokens: 800 } });
  assert.equal(result.text, 'A response');
  assert.deepEqual(delays, [500, 1000]);
  for (const value of requests) {
    assert.equal(value.contents, contents);
    assert.equal(value.model, 'model');
    assert.equal(value.config.systemInstruction, 'Policy');
    assert.equal(value.config.maxOutputTokens, 800);
    assert.ok(value.config.abortSignal instanceof AbortSignal);
  }
});

test('stops after three provider failures', async () => {
  let attempts = 0;
  const failure = Object.assign(new Error('Unavailable'), { status: 503 });
  const request = createGeminiRequest({ generate: async () => { attempts++; throw failure; }, wait: async () => {} });
  await assert.rejects(request({}), error => error === failure);
  assert.equal(attempts, 3);
});

test('does not retry auth, request, or quota errors', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let attempts = 0;
    const failure = Object.assign(new Error('Rejected'), { status });
    const request = createGeminiRequest({ generate: async () => { attempts++; throw failure; }, wait: async () => assert.fail('Unexpected retry') });
    await assert.rejects(request({}), error => error === failure);
    assert.equal(attempts, 1);
  }
});
