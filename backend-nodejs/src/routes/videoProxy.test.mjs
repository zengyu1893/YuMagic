import assert from 'node:assert/strict';
import test from 'node:test';

const {
  createVideoTargetUrl,
  forwardVideoRequest,
} = await import('./videoProxy.js');

test('builds a video target URL without duplicating the v1 segment', () => {
  assert.equal(
    createVideoTargetUrl('https://ai.yuliapi.com/v1/', '/v1/video/create'),
    'https://ai.yuliapi.com/v1/video/create',
  );
});

test('forwards video requests with provider authorization and preserves response status', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ message: 'busy' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await forwardVideoRequest({
    baseUrl: 'https://ai.yuliapi.com',
    apiKey: 'sk-provider',
    path: '/v1/video/create',
    method: 'POST',
    payload: { model: 'grok-imagine-video-1.5-1080p' },
    fetchImpl,
  });

  assert.equal(calls[0].url, 'https://ai.yuliapi.com/v1/video/create');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer sk-provider');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(result.status, 503);
  assert.equal(result.body, JSON.stringify({ message: 'busy' }));
});
