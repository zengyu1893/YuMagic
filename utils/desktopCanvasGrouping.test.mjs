import assert from 'node:assert/strict';
import test from 'node:test';

const {
  addItemToFolder,
  resolveCanvasFolderId,
} = await import('./desktopCanvasGrouping.ts');

const folder = (overrides = {}) => ({
  id: overrides.id || 'canvas-folder-canvas-1-100',
  type: 'folder',
  name: overrides.name || '🎨 Canvas One',
  position: overrides.position || { x: 0, y: 0 },
  itemIds: overrides.itemIds || [],
  createdAt: overrides.createdAt || 100,
  updatedAt: overrides.updatedAt || 100,
});

const image = (overrides = {}) => ({
  id: overrides.id || 'image-1',
  type: 'image',
  name: overrides.name || 'Generated',
  position: overrides.position || { x: 0, y: 0 },
  imageUrl: overrides.imageUrl || '/files/output/generated.png',
  createdAt: overrides.createdAt || 100,
  updatedAt: overrides.updatedAt || 100,
});

test('resolves existing mapped canvas folder', () => {
  const existingFolder = folder();

  const result = resolveCanvasFolderId(
    [existingFolder],
    { 'canvas-1': existingFolder.id },
    'canvas-1',
    'Canvas One',
  );

  assert.equal(result.folderId, existingFolder.id);
  assert.deepEqual(result.canvasToFolderMap, { 'canvas-1': existingFolder.id });
});

test('recovers existing canvas folder by id prefix when mapping is missing', () => {
  const existingFolder = folder();

  const result = resolveCanvasFolderId([existingFolder], {}, 'canvas-1', 'Canvas One');

  assert.equal(result.folderId, existingFolder.id);
  assert.deepEqual(result.canvasToFolderMap, { 'canvas-1': existingFolder.id });
});

test('cleans stale mapping and recovers by id prefix', () => {
  const existingFolder = folder({ id: 'canvas-folder-canvas-1-200', createdAt: 200, updatedAt: 200 });

  const result = resolveCanvasFolderId(
    [existingFolder],
    { 'canvas-1': 'missing-folder' },
    'canvas-1',
    'Canvas One',
  );

  assert.equal(result.folderId, existingFolder.id);
  assert.deepEqual(result.canvasToFolderMap, { 'canvas-1': existingFolder.id });
});

test('recovers by unique canvas folder name when id prefix is unavailable', () => {
  const existingFolder = folder({ id: 'legacy-folder-1', name: '🎨 Canvas One' });

  const result = resolveCanvasFolderId([existingFolder], {}, 'canvas-1', 'Canvas One');

  assert.equal(result.folderId, existingFolder.id);
  assert.deepEqual(result.canvasToFolderMap, { 'canvas-1': existingFolder.id });
});

test('does not recover by canvas folder name when name is ambiguous', () => {
  const firstFolder = folder({ id: 'legacy-folder-1', name: '🎨 Canvas One' });
  const secondFolder = folder({ id: 'legacy-folder-2', name: '🎨 Canvas One' });

  const result = resolveCanvasFolderId([firstFolder, secondFolder], {}, 'canvas-1', 'Canvas One');

  assert.equal(result.folderId, undefined);
  assert.deepEqual(result.canvasToFolderMap, {});
});

test('adds generated item to existing folder at next folder position', () => {
  const existingFolder = folder({ itemIds: ['existing-image'] });
  const existingImage = image({ id: 'existing-image', position: { x: 0, y: 0 } });
  const newImage = image({ id: 'new-image', position: { x: 0, y: 0 }, createdAt: 200, updatedAt: 200 });

  const updated = addItemToFolder(
    [existingFolder, existingImage],
    existingFolder.id,
    newImage,
    200,
  );

  const updatedFolder = updated.find(item => item.id === existingFolder.id);
  const insertedImage = updated.find(item => item.id === newImage.id);

  assert.deepEqual(updatedFolder.itemIds, ['existing-image', 'new-image']);
  assert.equal(updatedFolder.updatedAt, 200);
  assert.deepEqual(insertedImage.position, { x: 100, y: 0 });
});

test('does not duplicate an item id already present in the folder', () => {
  const existingFolder = folder({ itemIds: ['new-image'] });
  const newImage = image({ id: 'new-image' });

  const updated = addItemToFolder([existingFolder], existingFolder.id, newImage, 200);
  const updatedFolder = updated.find(item => item.id === existingFolder.id);

  assert.deepEqual(updatedFolder.itemIds, ['new-image']);
  assert.equal(updated.filter(item => item.id === 'new-image').length, 1);
});
