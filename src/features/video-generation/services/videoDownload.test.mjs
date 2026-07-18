import assert from 'node:assert/strict';
import test from 'node:test';

const { downloadGeneratedVideo } = await import('./videoDownload.ts');

test('returns the local URL from a successful backend download', async () => {
  const localUrl = await downloadGeneratedVideo(
    'https://cdn.example/video.mp4',
    new AbortController().signal,
    async () => new Response(JSON.stringify({ success: true, data: { url: '/files/output/video.mp4' } }), { status: 200 }),
  );

  assert.equal(localUrl, '/files/output/video.mp4');
});

test('preserves a backend download HTTP error', async () => {
  await assert.rejects(
    () => downloadGeneratedVideo(
      'https://cdn.example/video.mp4',
      new AbortController().signal,
      async () => new Response(JSON.stringify({ error: 'Remote video expired' }), { status: 502 }),
    ),
    /Download video failed \(HTTP 502\): Remote video expired/,
  );
});

test('rejects a successful response without a local URL', async () => {
  await assert.rejects(
    () => downloadGeneratedVideo(
      'https://cdn.example/video.mp4',
      new AbortController().signal,
      async () => new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
    ),
    /Backend returned invalid video data/,
  );
});

