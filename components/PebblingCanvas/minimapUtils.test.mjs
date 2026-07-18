import assert from 'node:assert/strict';
import test from 'node:test';

const {
  createMinimapLayout,
  getNodesBounds,
  getViewportWorldRect,
  minimapPointToViewportOffset,
  rectToMinimap,
  worldToMinimap,
} = await import('./minimapUtils.ts');

const node = (overrides) => ({
  id: overrides.id || 'node-a',
  type: overrides.type || 'image',
  title: overrides.title || 'Node',
  content: '',
  x: overrides.x,
  y: overrides.y,
  width: overrides.width,
  height: overrides.height,
  status: 'idle',
});

const assertAlmostEqual = (actual, expected, epsilon = 0.000001) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
};

test('calculates node bounds with dimensions and padding', () => {
  const bounds = getNodesBounds([
    node({ x: 100, y: 200, width: 300, height: 150 }),
  ], 20);

  assert.deepEqual(bounds, {
    x: 80,
    y: 180,
    width: 340,
    height: 190,
  });
});

test('includes an offscreen viewport in the minimap layout bounds', () => {
  const viewport = { x: 2000, y: 1500, width: 800, height: 600 };
  const layout = createMinimapLayout(
    [node({ x: 0, y: 0, width: 100, height: 100 })],
    220,
    140,
    20,
    viewport,
  );

  assert.ok(layout.worldBounds.x <= -20);
  assert.ok(layout.worldBounds.y <= -20);
  assert.ok(layout.worldBounds.x + layout.worldBounds.width >= 2800);
  assert.ok(layout.worldBounds.y + layout.worldBounds.height >= 2100);

  const viewportRect = rectToMinimap(viewport, layout);
  assert.ok(viewportRect.x >= 0);
  assert.ok(viewportRect.y >= 0);
  assert.ok(viewportRect.x + viewportRect.width <= layout.width + 0.000001);
  assert.ok(viewportRect.y + viewportRect.height <= layout.height + 0.000001);
});

test('maps minimap click to an offset that centers the target world point', () => {
  const layout = createMinimapLayout([], 220, 140);
  const minimapPoint = { x: 110, y: 70 };
  const viewportSize = { width: 1000, height: 700 };
  const canvasScale = 2;

  const offset = minimapPointToViewportOffset(
    minimapPoint,
    layout,
    viewportSize,
    canvasScale,
  );
  const worldPoint = {
    x: layout.worldBounds.x + minimapPoint.x / layout.scale,
    y: layout.worldBounds.y + minimapPoint.y / layout.scale,
  };

  assertAlmostEqual(worldPoint.x * canvasScale + offset.x, viewportSize.width / 2);
  assertAlmostEqual(worldPoint.y * canvasScale + offset.y, viewportSize.height / 2);
});

test('keeps empty minimap conversions finite', () => {
  const layout = createMinimapLayout([], 220, 140);
  const point = worldToMinimap({ x: 0, y: 0 }, layout);
  const viewport = getViewportWorldRect(
    { width: 1000, height: 700 },
    { x: 0, y: 0 },
    1,
  );

  assert.ok(Number.isFinite(layout.scale));
  assert.ok(Number.isFinite(point.x));
  assert.ok(Number.isFinite(point.y));
  assert.deepEqual(viewport, { x: 0, y: 0, width: 1000, height: 700 });
});
