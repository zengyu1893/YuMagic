import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
  persistGeneratedImageResponse,
} = require('./generatedImageOutput.js');

test('persists remote url image results and rewrites response to local output url', async () => {
  const calls = [];
  const result = await persistGeneratedImageResponse(
    { data: [{ url: 'https://cdn.example.com/result.png?token=abc' }] },
    {
      model: 'gpt-image-2',
      source: 'generations',
      downloadRemoteImage: async (url, filename) => {
        calls.push(['download', url, filename]);
        return {
          success: true,
          data: {
            filename: 'yuli_test_url.png',
            path: 'D:\\Penguin-Magic-main\\output\\yuli_test_url.png',
            url: '/files/output/yuli_test_url.png',
          },
        };
      },
      saveImageData: async () => {
        throw new Error('base64 saver should not run for url results');
      },
      generateThumbnail: async (filePath) => {
        calls.push(['thumbnail', filePath]);
        return {
          success: true,
          thumbnailUrl: '/files/thumbnails/output_yuli_test_url_thumb.jpg',
        };
      },
    },
  );

  assert.equal(result.data[0].url, '/files/output/yuli_test_url.png');
  assert.equal(result.data[0].thumbnail_url, '/files/thumbnails/output_yuli_test_url_thumb.jpg');
  assert.equal(result.data[0].original_url, 'https://cdn.example.com/result.png?token=abc');
  assert.equal(calls[0][0], 'download');
  assert.equal(calls[0][1], 'https://cdn.example.com/result.png?token=abc');
  assert.match(calls[0][2], /^yuli_generations_gpt-image-2_/);
  assert.deepEqual(calls[1], ['thumbnail', 'D:\\Penguin-Magic-main\\output\\yuli_test_url.png']);
});

test('persists b64_json image results and removes base64 from the response payload', async () => {
  const calls = [];
  const result = await persistGeneratedImageResponse(
    { data: [{ b64_json: 'AAAA' }] },
    {
      model: 'gemini-3.1-flash-image-preview',
      source: 'edits',
      downloadRemoteImage: async () => {
        throw new Error('remote downloader should not run for b64_json results');
      },
      saveImageData: async (imageData, filename) => {
        calls.push(['save', imageData, filename]);
        return {
          success: true,
          data: {
            filename: 'yuli_test_b64.png',
            path: 'D:\\Penguin-Magic-main\\output\\yuli_test_b64.png',
            url: '/files/output/yuli_test_b64.png',
          },
        };
      },
      generateThumbnail: async () => ({
        success: true,
        thumbnailUrl: '/files/thumbnails/output_yuli_test_b64_thumb.jpg',
      }),
    },
  );

  assert.equal(result.data[0].url, '/files/output/yuli_test_b64.png');
  assert.equal(result.data[0].thumbnail_url, '/files/thumbnails/output_yuli_test_b64_thumb.jpg');
  assert.equal('b64_json' in result.data[0], false);
  assert.equal(calls[0][0], 'save');
  assert.equal(calls[0][1], 'data:image/png;base64,AAAA');
  assert.match(calls[0][2], /^yuli_edits_gemini-3_1-flash-image-preview_/);
});

test('fails clearly when a generated image cannot be saved locally', async () => {
  await assert.rejects(
    () => persistGeneratedImageResponse(
      { data: [{ url: 'https://cdn.example.com/expired.png' }] },
      {
        model: 'gpt-image-2',
        source: 'generations',
        downloadRemoteImage: async () => ({ success: false, error: 'HTTP 403: Forbidden' }),
        saveImageData: async () => {
          throw new Error('base64 saver should not run');
        },
        generateThumbnail: async () => ({ success: true }),
      },
    ),
    /HTTP 403: Forbidden/,
  );
});

