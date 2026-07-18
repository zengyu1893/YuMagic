import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
  buildProviderModelsPayload,
  createModelsUrl,
  createUpstreamModelError,
  parseOpenAIModelsPayload,
} = require('./providerModels.js');

test('builds models url without duplicating a trailing v1 path', () => {
  assert.equal(createModelsUrl('https://api.example.com'), 'https://api.example.com/v1/models');
  assert.equal(createModelsUrl('https://api.example.com/v1'), 'https://api.example.com/v1/models');
  assert.equal(createModelsUrl('https://api.example.com/v1/'), 'https://api.example.com/v1/models');
});

test('parses OpenAI models payload into normalized allModels', () => {
  const models = parseOpenAIModelsPayload({
    data: [
      { id: 'gpt-image-2', owned_by: 'openai', display_name: 'GPT Image 2' },
      { id: 'gpt-4.1' },
    ],
  });

  assert.deepEqual(models, [
    { id: 'gpt-image-2', owned_by: 'openai', displayName: 'GPT Image 2' },
    { id: 'gpt-4.1', owned_by: '', displayName: 'gpt-4.1' },
  ]);
});

test('classifies model ids into image chat and video groups', () => {
  const payload = buildProviderModelsPayload([
    { id: 'gpt-image-2' },
    { id: 'gpt-4.1' },
    { id: 'sora-2' },
  ]);

  assert.deepEqual(payload.categories, {
    'gpt-image-2': 'image',
    'gpt-4.1': 'chat',
    'sora-2': 'video',
  });
  assert.deepEqual(payload.imageModels, ['gpt-image-2']);
  assert.deepEqual(payload.chatModels, ['gpt-4.1']);
  assert.deepEqual(payload.videoModels, ['sora-2']);
});

test('creates a clear error when upstream returns html', () => {
  const error = createUpstreamModelError(
    {
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/login',
      headers: { get: () => 'text/html; charset=utf-8' },
    },
    '<html><title>Login</title><body>Please sign in</body></html>',
    'https://api.example.com/v1/models',
  );

  assert.equal(error.status, 502);
  assert.match(error.message, /HTML/);
  assert.match(error.message, /login/i);
});

test('keeps upstream status and short error text for non-2xx responses', () => {
  const error = createUpstreamModelError(
    {
      status: 404,
      statusText: 'Not Found',
      url: 'https://api.example.com/v1/models',
      headers: { get: () => 'application/json' },
    },
    '{"error":{"message":"No such endpoint"}}',
    'https://api.example.com/v1/models',
  );

  assert.equal(error.status, 404);
  assert.match(error.message, /404/);
  assert.match(error.message, /No such endpoint/);
});
