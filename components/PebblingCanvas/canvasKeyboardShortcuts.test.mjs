import assert from 'node:assert/strict';
import test from 'node:test';

const { shouldIgnoreCanvasShortcut } = await import('./canvasKeyboardShortcuts.ts');

test('ignores canvas shortcuts while typing in text inputs', () => {
  const target = { tagName: 'TEXTAREA' };
  const activeElement = { tagName: 'BODY' };

  assert.equal(shouldIgnoreCanvasShortcut(target, activeElement), true);
});

test('handles canvas shortcuts when focus is outside editable fields', () => {
  const target = { tagName: 'DIV' };
  const activeElement = { tagName: 'BODY' };

  assert.equal(shouldIgnoreCanvasShortcut(target, activeElement), false);
});
