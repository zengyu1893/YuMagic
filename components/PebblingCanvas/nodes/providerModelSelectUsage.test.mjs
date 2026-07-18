import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('image-generation canvas nodes use provider-scoped model selector', () => {
  const files = [
    'components/PebblingCanvas/nodes/IdeaNode.tsx',
    'components/PebblingCanvas/nodes/EditNode.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /ProviderModelSelect/);
    assert.doesNotMatch(source, /import\s+\{\s*ModelSelect\s*\}/);
  }

  const uploadNode = read('components/PebblingCanvas/nodes/ImageNode.tsx');
  assert.doesNotMatch(uploadNode, /ProviderModelSelect/);
});
