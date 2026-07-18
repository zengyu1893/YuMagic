import assert from 'node:assert/strict';
import test from 'node:test';

const { readVideoApiJson } = await import('./videoApiResponse.ts');

test('returns parsed JSON for a successful video API response', async () => {
  const response = new Response(JSON.stringify({ id: 'task-1' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await readVideoApiJson(response, 'Create video task');

  assert.deepEqual(result, { id: 'task-1' });
});

test('includes HTTP status and remote message for a failed video API response', async () => {
  const response = new Response(JSON.stringify({ message: 'Service temporarily unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => readVideoApiJson(response, 'Create video task'),
    /Create video task failed \(HTTP 503\): Service temporarily unavailable/,
  );
});
