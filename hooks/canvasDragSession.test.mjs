import assert from 'node:assert/strict';
import test from 'node:test';

const { applyDragDeltaToNodes, getDragSessionNodeIds, hasDragDelta } = await import('./canvasDragSession.ts');

test('uses current drag session positions instead of stale selected ids', () => {
  const staleSelectedIds = new Set();
  const initialPositions = new Map([
    ['node-a', { x: 40, y: 60 }],
  ]);

  const draggedIds = getDragSessionNodeIds(initialPositions, staleSelectedIds);

  assert.deepEqual(draggedIds, ['node-a']);
});

test('commits only drag session nodes with grid snapping', () => {
  const nodes = [
    { id: 'node-a', x: 40, y: 60, title: 'Dragged' },
    { id: 'node-b', x: 200, y: 220, title: 'Still' },
  ];
  const initialPositions = new Map([
    ['node-a', { x: 40, y: 60 }],
  ]);

  const updatedNodes = applyDragDeltaToNodes(nodes, initialPositions, { x: 13, y: 31 }, 20);

  assert.deepEqual(updatedNodes, [
    { id: 'node-a', x: 60, y: 100, title: 'Dragged' },
    { id: 'node-b', x: 200, y: 220, title: 'Still' },
  ]);
});

test('moves every node captured in a multi-select drag session', () => {
  const nodes = [
    { id: 'node-a', x: 0, y: 0 },
    { id: 'node-b', x: 100, y: 100 },
    { id: 'node-c', x: 240, y: 240 },
  ];
  const initialPositions = new Map([
    ['node-a', { x: 0, y: 0 }],
    ['node-b', { x: 100, y: 100 }],
  ]);

  const updatedNodes = applyDragDeltaToNodes(nodes, initialPositions, { x: 20, y: -20 });

  assert.deepEqual(updatedNodes, [
    { id: 'node-a', x: 20, y: -20 },
    { id: 'node-b', x: 120, y: 80 },
    { id: 'node-c', x: 240, y: 240 },
  ]);
});

test('does not treat a zero-delta click as a moved drag session', () => {
  assert.equal(hasDragDelta({ x: 0, y: 0 }), false);
});
