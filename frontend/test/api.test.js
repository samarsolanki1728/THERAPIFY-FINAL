import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBaseUrl } from '../src/lib/api.js';

test('API base supports local fallback and production URLs with exactly one API prefix', () => {
  for (const value of [undefined, '', '   ']) {
    assert.equal(normalizeApiBaseUrl(value), 'http://localhost:5000');
  }
  for (const value of ['https://backend.example', 'https://backend.example/',
    ' https://backend.example/api/ ', 'https://backend.example/api/api///']) {
    for (const endpoint of ['/api/auth/signin', '/api/chat', '/api/moods', '/api/journals',
      '/api/mood-coach/progress', '/api/wellness/sessions', '/api/events', '/api/recommendations']) {
      assert.equal(normalizeApiBaseUrl(value) + endpoint, 'https://backend.example' + endpoint);
    }
  }
});
