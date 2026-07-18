import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('components/PebblingCanvas/execution/batchHandlers2.ts', 'utf8');
const directSource = readFileSync('components/PebblingCanvas/execution/executeVideoNode.ts', 'utf8');
const videoNodeSource = readFileSync('components/PebblingCanvas/nodes/VideoNode.tsx', 'utf8');
const videoOutputSource = readFileSync('components/PebblingCanvas/nodes/VideoOutputNode.tsx', 'utf8');
const soraServiceSource = readFileSync('services/soraService.ts', 'utf8');
const veoServiceSource = readFileSync('services/veoService.ts', 'utf8');
const canvasTypesSource = readFileSync('types/pebblingTypes.ts', 'utf8');

test('video batch execution resolves the provider selected on the source node', () => {
  assert.match(source, /loadCanvasNodeThirdPartyConfig/);
  assert.match(
    source,
    /loadCanvasNodeThirdPartyConfig\(\s*sourceNode\.data,\s*['"]video['"],\s*getThirdPartyConfig\(\),?\s*\)/s,
  );
  assert.doesNotMatch(source, /const\s+config\s*=\s*getThirdPartyConfig\(\)/);
  assert.match(source, /sourceNode\.data\?\.videoModel\s*\|\|\s*config\.videoModel/);
});

test('single and batch video execution reuse feature-owned task and download services', () => {
  for (const executorSource of [source, directSource]) {
    assert.match(executorSource, /runVideoProviderTask/);
    assert.match(executorSource, /downloadGeneratedVideo/);
    assert.doesNotMatch(executorSource, /fetch\(['"]\/api\/video-proxy\/(?:create|query)['"]/);
  }
});

test('video batch execution awaits every output task', () => {
  assert.match(source, /await\s+Promise\.all\(resultNodeIds\.map\(/);
  assert.doesNotMatch(source, /resultNodeIds\.forEach\(async/);
});

test('video execution never falls back to a hardcoded provider domain', () => {
  assert.doesNotMatch(source, /https:\/\/yuli\.host/);
  assert.doesNotMatch(directSource, /https:\/\/yuli\.host/);
});

test('legacy video services retain configuration only', () => {
  assert.doesNotMatch(soraServiceSource, /export\s+async\s+function/);
  assert.doesNotMatch(veoServiceSource, /export\s+async\s+function/);
  assert.doesNotMatch(soraServiceSource, /console\.log/);
  assert.doesNotMatch(veoServiceSource, /console\.log/);
});

test('video renderers do not show source execution state or hardcode the backend origin', () => {
  assert.doesNotMatch(videoNodeSource, /SpinnerOverlay/);
  assert.doesNotMatch(videoNodeSource, /:\s*any\b/);
  assert.doesNotMatch(videoOutputSource, /http:\/\/localhost:8765/);
});

test('video duration uses the typed field while reading legacy saved canvases', () => {
  assert.match(canvasTypesSource, /seconds\?:\s*string/);
  assert.match(videoNodeSource, /handleVideoSettingChange\(['"]videoSeconds['"]/);
  assert.match(videoNodeSource, /videoSeconds\s*\|\|\s*node\.data\?\.seconds/);
  assert.match(source, /videoSeconds\s*\|\|\s*sourceNode\.data\?\.seconds/);
  assert.match(directSource, /videoSeconds\s*\|\|\s*node\.data\?\.seconds/);
});
