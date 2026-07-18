import assert from 'node:assert/strict';
import test from 'node:test';

const { prepareVideoInputImages, runVideoProviderTask } = await import('./videoTaskRunner.ts');

const protocol = {
  format: 'video-veo',
  createPath: '/v1/video/generations',
  queryPath: '/v1/videos/{id}',
  taskIdField: 'task_id',
  videoUrlField: 'data.output',
};

test('prepares project video input images without dropping remote URLs', async () => {
  const requestedUrls = [];
  const result = await prepareVideoInputImages(
    ['data:image/png;base64,AAAA', 'https://cdn.example/input.png', '/files/input/local.png'],
    new AbortController().signal,
    'http://localhost:5176',
    async url => {
      requestedUrls.push(url);
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    },
  );

  assert.deepEqual(requestedUrls, ['http://localhost:5176/files/input/local.png']);
  assert.deepEqual(result, [
    'data:image/png;base64,AAAA',
    'https://cdn.example/input.png',
    'data:image/png;base64,AQID',
  ]);
});

test('creates and polls a provider video task through the local proxy', async () => {
  const requests = [];
  const updates = [];
  const responses = [
    new Response(JSON.stringify({ task_id: 42 }), { status: 200 }),
    new Response(JSON.stringify({ status: 'RUNNING', progress: '50%' }), { status: 200 }),
    new Response(JSON.stringify({ status: 'SUCCESS', data: { output: 'https://cdn.example/video.mp4' } }), { status: 200 }),
  ];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return responses.shift();
  };

  const result = await runVideoProviderTask({
    baseUrl: 'https://provider.example/v1',
    apiKey: 'secret',
    protocol,
    payload: { prompt: 'A quiet lake', model: 'veo-test' },
    signal: new AbortController().signal,
    fetchImpl,
    waitImpl: async () => {},
    onUpdate: update => updates.push(update),
  });

  assert.deepEqual(result, {
    taskId: '42',
    videoUrl: 'https://cdn.example/video.mp4',
  });
  assert.deepEqual(requests.map(request => request.url), [
    '/api/video-proxy/create',
    '/api/video-proxy/query',
    '/api/video-proxy/query',
  ]);
  assert.deepEqual(updates, [
    { taskId: '42' },
    { taskId: '42', status: 'RUNNING', progress: 50 },
    { taskId: '42', status: 'SUCCESS', progress: 0 },
  ]);
});

test('throws the remote failure reason from a failed video task', async () => {
  const responses = [
    new Response(JSON.stringify({ task_id: 'task-1' }), { status: 200 }),
    new Response(JSON.stringify({ status: 'FAILURE', fail_reason: 'Content rejected' }), { status: 200 }),
  ];

  await assert.rejects(
    () => runVideoProviderTask({
      baseUrl: 'https://provider.example',
      apiKey: 'secret',
      protocol,
      payload: { prompt: 'test', model: 'veo-test' },
      signal: new AbortController().signal,
      fetchImpl: async () => responses.shift(),
      waitImpl: async () => {},
    }),
    /Content rejected/,
  );
});

test('rejects a completed task without an output URL', async () => {
  const responses = [
    new Response(JSON.stringify({ task_id: 'task-2' }), { status: 200 }),
    new Response(JSON.stringify({ status: 'SUCCESS', data: {} }), { status: 200 }),
  ];

  await assert.rejects(
    () => runVideoProviderTask({
      baseUrl: 'https://provider.example',
      apiKey: 'secret',
      protocol,
      payload: { prompt: 'test', model: 'veo-test' },
      signal: new AbortController().signal,
      fetchImpl: async () => responses.shift(),
      waitImpl: async () => {},
    }),
    /completed but returned no output URL/,
  );
});
