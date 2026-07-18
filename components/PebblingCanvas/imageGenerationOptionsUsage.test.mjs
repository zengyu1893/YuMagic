import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const {
  getOrCreateOutputNode,
  resolveOutputPending,
} = await import('./execution/outputNodeManager.ts');
const {
  persistGeneratedImageForCanvas,
} = await import('./execution/generatedImageAsset.ts');

const read = (path) => readFileSync(path, 'utf8');

test('desktop provider selector appears before model selector and exposes analysis model', () => {
  const app = read('App.tsx');
  const providerIndex = app.indexOf('<ApiProviderRuntimeSelector');
  const modelIndex = app.indexOf('<ModelQuickSelector');

  assert.ok(providerIndex >= 0, 'desktop API channel selector should be mounted');
  assert.ok(modelIndex >= 0, 'desktop model selector should be mounted');
  assert.ok(providerIndex < modelIndex, 'API channel selector should be displayed before model selectors');

  const quickSelector = read('components/ModelQuickSelector.tsx');
  assert.match(quickSelector, /activeImageModel/);
  assert.match(quickSelector, /activeChatModel/);
  assert.match(quickSelector, /setActiveImageModel/);
  assert.match(quickSelector, /setActiveChatModel/);
  assert.doesNotMatch(quickSelector, /useState<['"]image['"] \| ['"]chat['"]>/);
  assert.doesNotMatch(quickSelector, /console\.log/);
});

test('image generation quality and moderation are propagated to request adapters', () => {
  const app = read('App.tsx');
  assert.match(app, /quality,\s*setQuality/);
  assert.match(app, /moderation,\s*setModeration/);
  assert.match(app, /editImageWithGemini\(files,\s*finalPrompt,\s*\{\s*aspectRatio,\s*imageSize,\s*quality,\s*moderation:/s);

  const types = read('types/pebblingTypes.ts');
  assert.match(types, /quality\?:\s*ImageGenerationQuality/);
  assert.match(types, /moderation\?:\s*ImageGenerationModeration/);

  const adapters = read('components/PebblingCanvas/apiAdapters.ts');
  assert.match(adapters, /quality:\s*config\?\.quality/);
  assert.match(adapters, /moderation:\s*config\?\.moderation/);

  const service = read('services/geminiService.ts');
  assert.match(service, /quality\?:\s*ImageGenerationQuality/);
  assert.match(service, /moderation\?:\s*ImageGenerationModeration/);
  assert.match(service, /append\('moderation'/);
  assert.match(service, /realBody\.moderation\s*=/);
  assert.doesNotMatch(service, /quality['"],\s*['"]high['"]/);
  assert.doesNotMatch(service, /realBody\.quality\s*=\s*['"]high['"]/);
});

test('openai-compatible image responses return without falling into a leaked parser scope', async () => {
  const parserPath = 'services/imageResponseParser.ts';
  assert.equal(existsSync(parserPath), true, 'image response parsing should live in an isolated service');

  const { deepScanForImage } = await import('../../services/imageResponseParser.ts');
  assert.equal(
    deepScanForImage({ data: [{ url: '/files/output/gpt-image-2.png' }] }),
    '/files/output/gpt-image-2.png',
  );
  assert.equal(
    deepScanForImage({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }] }),
    'data:image/png;base64,AAAA',
  );

  const service = read('services/geminiService.ts');
  assert.match(service, /import\s+\{\s*deepScanForImage\s*\}\s+from\s+['"]\.\/imageResponseParser['"]/);
  assert.doesNotMatch(service, /\/\/[^\r\n]*function deepScanForImage/);
});

test('canvas image-generation nodes expose quality and moderation controls', () => {
  const files = [
    'components/PebblingCanvas/nodes/IdeaNode.tsx',
    'components/PebblingCanvas/nodes/EditNode.tsx',
    'components/PebblingCanvas/nodes/BpNode.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /ImageGenerationOptions/);
  }

  const executionFiles = [
    'components/PebblingCanvas/execution/executeImageNode.ts',
    'components/PebblingCanvas/execution/executeEditNode.ts',
    'components/PebblingCanvas/execution/executeBPNode.ts',
    'components/PebblingCanvas/execution/batchHandlers.ts',
  ];

  for (const file of executionFiles) {
    const source = read(file);
    assert.match(source, /quality/);
    assert.match(source, /moderation/);
  }
});

test('canvas image-generation option UI labels ratio resolution quality and moderation', () => {
  const files = [
    'components/PebblingCanvas/nodes/IdeaNode.tsx',
    'components/PebblingCanvas/nodes/EditNode.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /比例/);
    assert.match(source, /清晰度/);
  }

  const options = read('components/PebblingCanvas/nodes/ImageGenerationOptions.tsx');
  assert.match(options, /画质/);
  assert.match(options, /审核/);
});

test('image upload node only exposes media upload controls', () => {
  const imageNode = read('components/PebblingCanvas/nodes/ImageNode.tsx');
  assert.match(imageNode, /上传媒体或连接上游/);
  assert.match(imageNode, /Icons\.Upload/);
  assert.match(imageNode, /folderInputRef/);
  assert.doesNotMatch(imageNode, /ImageGenerationOptions/);
  assert.doesNotMatch(imageNode, /AspectRatioSelector/);
  assert.doesNotMatch(imageNode, /ResolutionSelector/);
  assert.doesNotMatch(imageNode, /ProviderModelSelect/);
});

test('moderation is hidden behind advanced image parameters as a fixed select', () => {
  const app = read('App.tsx');
  assert.match(app, /setIsAdvancedParamsExpanded/);

  const options = read('components/PebblingCanvas/nodes/ImageGenerationOptions.tsx');
  assert.match(options, /高级参数/);
  assert.match(options, /advancedOpen/);
  assert.match(options, /<select/);
  assert.match(options, /value=\{moderation\}/);
  assert.match(options, /<option value="auto">auto/);
  assert.match(options, /<option value="low">low/);
  assert.doesNotMatch(options, /placeholder="moderation/);
});

test('magic image options selected style keeps readable contrast', () => {
  const editNode = read('components/PebblingCanvas/nodes/EditNode.tsx');
  assert.doesNotMatch(editNode, /bg-yellow-500\/30 text-yellow-200/);
  assert.match(editNode, /text-yellow-900/);
  assert.match(editNode, /dark:text-yellow-100/);
});

test('idea node single execution writes to an output node instead of itself', () => {
  const canvas = read('components/PebblingCanvas/index.tsx');
  assert.doesNotMatch(canvas, /batchCount >= 1 && \['bp', 'idea'\]\.includes\(node\.type\)/);
  assert.match(canvas, /node\.type === 'image' \|\| node\.type === 'idea'/);

  const imageExecutor = read('components/PebblingCanvas/execution/executeImageNode.ts');
  assert.match(imageExecutor, /getOrCreateOutputNode/);
  assert.match(imageExecutor, /resolveOutputPending/);
  assert.match(imageExecutor, /node\.type === 'idea'/);
  assert.doesNotMatch(imageExecutor, /node\.type === 'idea'[\s\S]{0,250}updateNode\(nodeId,\s*\{\s*content:\s*result/);
});

test('executing source nodes does not trigger running pulse flicker', () => {
  const canvas = read('components/PebblingCanvas/index.tsx');
  assert.doesNotMatch(canvas, /updateNode\(nodeId,\s*\{\s*status:\s*'running'\s*\}\)/);
  assert.doesNotMatch(canvas, /updateNode\(nodeId,\s*\{\s*status:\s*["']running["']\s*\}\)/);

  const canvasNode = read('components/PebblingCanvas/CanvasNode.tsx');
  assert.doesNotMatch(canvasNode, /ring-yellow-500 animate-pulse/);
  assert.doesNotMatch(canvasNode, /\$\{isRunning \? 'animate-pulse' : ''\}/);

  const textExecutors = read('components/PebblingCanvas/execution/executeTextNodes.ts');
  assert.doesNotMatch(textExecutors, /updateNode\(nodeId,\s*\{\s*status:\s*'running'\s*\}\)/);
  assert.doesNotMatch(textExecutors, /status:\s*'running'/);

  const runningHubExecutors = read('components/PebblingCanvas/execution/executeRunningHubNodes.ts');
  assert.doesNotMatch(runningHubExecutors, /updateNode\(nodeId,[\s\S]{0,120}status:\s*'running'/);
});

test('provider settings expose recommended yuli API base urls', () => {
  const templates = read('src/features/provider-settings/config/apiProviderTemplates.ts');
  assert.match(templates, /https:\/\/yuli\.host/);
  assert.match(templates, /https:\/\/ai\.yuliapi\.com/);
  assert.match(templates, /recommendedBaseUrls/);

  const panel = read('src/features/provider-settings/components/ApiProviderProfilesPanel.tsx');
  assert.match(panel, /推荐接口/);
  assert.match(panel, /setFormBaseUrl\(url\)/);
});

test('all yuli-compatible API forms expose a key link for each recommended base url', () => {
  const templates = read('src/features/provider-settings/config/apiProviderTemplates.ts');
  assert.match(templates, /id:\s*'openai-compatible'[\s\S]*recommendedBaseUrls:\s*YULI_RECOMMENDED_BASE_URLS/);
  assert.match(templates, /YULI_RECOMMENDED_APIS/);
  assert.match(templates, /https:\/\/yuli\.host\/register\?aff=64350e39653/);
  assert.match(templates, /https:\/\/ai\.yuliapi\.com\/register/);

  const files = [
    'src/features/provider-settings/components/ApiProviderProfilesPanel.tsx',
    'components/SettingsModal/ApiConnectionSection.tsx',
    'components/PebblingCanvas/ApiSettings.tsx',
    'components/ApiKeyManager.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /YULI_RECOMMENDED_BASE_URLS/, `${file} should render recommended base urls`);
    assert.match(source, /YULI_RECOMMENDED_APIS/, `${file} should render per-interface key links`);
    assert.match(source, /keyUrl/, `${file} should use each interface key url`);
  }

  const panel = read('src/features/provider-settings/components/ApiProviderProfilesPanel.tsx');
  assert.doesNotMatch(panel, /鑾峰彇/);
  assert.match(panel, /获取 Key/);
});

test('video API settings do not reuse yuli recommended urls or key link', () => {
  const videoSettings = read('components/SettingsModal/VideoApiSection.tsx');
  assert.doesNotMatch(videoSettings, /YULI_RECOMMENDED_BASE_URLS/);
  assert.doesNotMatch(videoSettings, /YULI_RECOMMENDED_APIS/);
  assert.doesNotMatch(videoSettings, /renderRecommendedBaseUrls/);
  assert.doesNotMatch(videoSettings, /https:\/\/yuli\.host/);

  const canvasSettings = read('components/PebblingCanvas/ApiSettings.tsx');
  assert.doesNotMatch(canvasSettings, /Sora API Key[\s\S]{0,1200}YULI_RECOMMENDED_APIS/);
  assert.doesNotMatch(canvasSettings, /soraConfig\.baseUrl[\s\S]{0,600}renderYuliBaseUrlButtons/);
});

test('canvas run commits local node edits before executing', () => {
  const canvasNode = read('components/PebblingCanvas/CanvasNode.tsx');
  assert.match(canvasNode, /handleExecuteWithLatestEdits/);
  assert.match(canvasNode, /handleUpdate\(\);[\s\S]{0,160}onExecute\(id,\s*count\)/);
  assert.match(canvasNode, /handleUpdate\(\);[\s\S]{0,160}onCascadeExecute\?\.\(id\)/);
  assert.match(canvasNode, /onExecute:\s*handleExecuteWithLatestEdits/);
  assert.match(canvasNode, /handleExecuteWithLatestEdits\(node\.id,\s*batchCount\)/);
  assert.match(canvasNode, /handleCascadeExecuteWithLatestEdits\(node\.id\)/);
  assert.match(canvasNode, /onExecute=\{\(\) => handleExecuteWithLatestEdits\(node\.id\)\}/);
});

test('failed output placeholders render as errors instead of endless pending spinners', () => {
  const outputNode = read('components/PebblingCanvas/nodes/OutputNode.tsx');
  assert.match(outputNode, /const isErrorPending = isPending && node\.status === 'error'/);
  assert.match(outputNode, /isErrorPending \? \(/);
  assert.match(outputNode, /鐢熸垚澶辫触|失败|failed/i);
});

test('new output nodes are immediately available to resolve generated images', () => {
  const nodes = [{
    id: 'idea-1',
    type: 'idea',
    title: '创意',
    content: '一个少女在戏水',
    x: 10,
    y: 20,
    width: 300,
    height: 260,
    status: 'idle',
  }];
  const connections = [];
  const outputNodeMap = new Map();
  let idCounter = 0;
  const uuid = () => `id-${++idCounter}`;
  const updateNode = (id, patch) => {
    const idx = nodes.findIndex(node => node.id === id);
    if (idx !== -1) nodes[idx] = { ...nodes[idx], ...patch };
  };
  const queuedNodeUpdates = [];
  const queuedConnectionUpdates = [];
  const setNodes = (updater) => queuedNodeUpdates.push(updater);
  const setConnections = (updater) => queuedConnectionUpdates.push(updater);
  const setHasUnsavedChanges = () => {};

  const { node: outputNode, pendingIdx } = getOrCreateOutputNode(
    'idea-1',
    nodes,
    connections,
    outputNodeMap,
    uuid,
    updateNode,
    setNodes,
    setConnections,
    setHasUnsavedChanges,
  );

  assert.equal(nodes.some(node => node.id === outputNode.id), true);

  resolveOutputPending(outputNode.id, pendingIdx, '/files/output/canvas/result.png', nodes, updateNode, {
    prompt: '一个少女在戏水',
  });

  const resolvedOutput = nodes.find(node => node.id === outputNode.id);
  assert.equal(resolvedOutput.status, 'completed');
  assert.deepEqual(resolvedOutput.data.outputImages, ['/files/output/canvas/result.png']);
  assert.equal(resolvedOutput.content, '/files/output/canvas/result.png');
});

test('retrying a failed output reuses the node without keeping stale pending placeholders', () => {
  const nodes = [
    {
      id: 'idea-1',
      type: 'idea',
      title: '创意',
      content: '一个少女在戏水',
      x: 10,
      y: 20,
      width: 300,
      height: 260,
      status: 'idle',
    },
    {
      id: 'output-1',
      type: 'output',
      title: 'OUTPUT',
      content: '',
      x: 420,
      y: 20,
      width: 460,
      height: 380,
      status: 'error',
      data: { outputImages: ['__pending__'] },
    },
  ];
  const connections = [{ id: 'conn-1', fromNode: 'idea-1', toNode: 'output-1' }];
  const outputNodeMap = new Map([['idea-1', 'output-1']]);
  const uuid = () => 'unused';
  const updateNode = (id, patch) => {
    const idx = nodes.findIndex(node => node.id === id);
    if (idx !== -1) nodes[idx] = { ...nodes[idx], ...patch };
  };
  const setNodes = () => {};
  const setConnections = () => {};
  const setHasUnsavedChanges = () => {};

  const { node: outputNode, pendingIdx } = getOrCreateOutputNode(
    'idea-1',
    nodes,
    connections,
    outputNodeMap,
    uuid,
    updateNode,
    setNodes,
    setConnections,
    setHasUnsavedChanges,
  );

  assert.equal(outputNode.id, 'output-1');
  assert.equal(pendingIdx, 0);
  assert.deepEqual(nodes.find(node => node.id === 'output-1').data.outputImages, ['__pending__']);

  resolveOutputPending('output-1', pendingIdx, '/files/output/canvas/retry.png', nodes, updateNode);

  assert.deepEqual(nodes.find(node => node.id === 'output-1').data.outputImages, ['/files/output/canvas/retry.png']);
});

test('concurrent output slots stay stable when results resolve out of order', () => {
  const nodes = [
    {
      id: 'edit-1',
      type: 'edit',
      title: 'Magic',
      content: '',
      x: 10,
      y: 20,
      width: 300,
      height: 260,
      status: 'idle',
    },
  ];
  const connections = [];
  const outputNodeMap = new Map();
  let idCounter = 0;
  const uuid = () => `id-${++idCounter}`;
  const updateNode = (id, patch) => {
    const idx = nodes.findIndex(node => node.id === id);
    if (idx !== -1) nodes[idx] = { ...nodes[idx], ...patch };
  };
  const setNodes = () => {};
  const setConnections = () => {};
  const setHasUnsavedChanges = () => {};

  const first = getOrCreateOutputNode(
    'edit-1', nodes, connections, outputNodeMap, uuid,
    updateNode, setNodes, setConnections, setHasUnsavedChanges,
  );
  const second = getOrCreateOutputNode(
    'edit-1', nodes, connections, outputNodeMap, uuid,
    updateNode, setNodes, setConnections, setHasUnsavedChanges,
  );
  const third = getOrCreateOutputNode(
    'edit-1', nodes, connections, outputNodeMap, uuid,
    updateNode, setNodes, setConnections, setHasUnsavedChanges,
  );

  resolveOutputPending(first.node.id, second.pendingIdx, '/files/output/second.png', nodes, updateNode);
  assert.equal(nodes.find(node => node.id === first.node.id).status, 'running');

  const fourth = getOrCreateOutputNode(
    'edit-1', nodes, connections, outputNodeMap, uuid,
    updateNode, setNodes, setConnections, setHasUnsavedChanges,
  );

  assert.deepEqual(
    [first.pendingIdx, second.pendingIdx, third.pendingIdx, fourth.pendingIdx],
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    nodes.find(node => node.id === first.node.id).data.outputImages,
    ['__pending__', '/files/output/second.png', '__pending__', '__pending__'],
  );

  resolveOutputPending(first.node.id, fourth.pendingIdx, '/files/output/fourth.png', nodes, updateNode);
  resolveOutputPending(first.node.id, first.pendingIdx, '/files/output/first.png', nodes, updateNode);
  resolveOutputPending(first.node.id, third.pendingIdx, '/files/output/third.png', nodes, updateNode);

  const output = nodes.find(node => node.id === first.node.id);
  assert.equal(output.status, 'completed');
  assert.deepEqual(output.data.outputImages, [
    '/files/output/first.png',
    '/files/output/second.png',
    '/files/output/third.png',
    '/files/output/fourth.png',
  ]);
});

test('generated canvas images are persisted locally before resolving output nodes', async () => {
  const calls = [];
  const remoteUrl = await persistGeneratedImageForCanvas('https://example.com/image?id=123', {
    downloadRemoteToOutput: async (url, filename) => {
      calls.push(['download', url, filename]);
      return { success: true, data: { url: '/files/output/canvas_remote_123.png' } };
    },
    saveToOutput: async () => {
      throw new Error('base64 saver should not run for remote URLs');
    },
  }, 'canvas_remote_123.png');

  assert.equal(remoteUrl, '/files/output/canvas_remote_123.png');
  assert.deepEqual(calls, [['download', 'https://example.com/image?id=123', 'canvas_remote_123.png']]);

  const dataUrl = await persistGeneratedImageForCanvas('data:image/png;base64,AAAA', {
    downloadRemoteToOutput: async () => {
      throw new Error('remote downloader should not run for base64 images');
    },
    saveToOutput: async (imageData, filename) => {
      calls.push(['save', imageData, filename]);
      return { success: true, data: { url: '/files/output/canvas_data_123.png' } };
    },
  }, 'canvas_data_123.png');

  assert.equal(dataUrl, '/files/output/canvas_data_123.png');
  assert.deepEqual(calls[1], ['save', 'data:image/png;base64,AAAA', 'canvas_data_123.png']);

  await assert.rejects(
    () => persistGeneratedImageForCanvas('https://example.com/expired.png', {
      downloadRemoteToOutput: async () => ({ success: false, error: 'HTTP 403: Forbidden' }),
      saveToOutput: async () => {
        throw new Error('base64 saver should not run for failed remote URLs');
      },
    }, 'canvas_failed.png'),
    /HTTP 403: Forbidden/,
  );
});

test('all canvas image generation executors resolve nodes with locally persisted image urls', () => {
  const imageExecutor = read('components/PebblingCanvas/execution/executeImageNode.ts');
  assert.match(imageExecutor, /persistGeneratedImageForCanvas/);
  assert.match(imageExecutor, /const localResult = await persistGeneratedImageForCanvas/);
  assert.match(imageExecutor, /resolveOutputPending\(outputNodeId,\s*pendingIdx,\s*localResult/);
  assert.match(imageExecutor, /onImageGenerated\(localResult/);

  const editExecutor = read('components/PebblingCanvas/execution/executeEditNode.ts');
  assert.match(editExecutor, /persistGeneratedImageForCanvas/);
  assert.match(editExecutor, /const localResult = await persistGeneratedImageForCanvas/);
  assert.match(editExecutor, /resolveOutputPending\(outputNodeId,\s*pendingIdx,\s*localResult/);
  assert.match(editExecutor, /onImageGenerated\(localResult/);

  const bpExecutor = read('components/PebblingCanvas/execution/executeBPNode.ts');
  assert.match(bpExecutor, /persistGeneratedImageForCanvas/);
  assert.match(bpExecutor, /const localResult = await persistGeneratedImageForCanvas/);
  assert.match(bpExecutor, /onImageGenerated\(localResult/);

  const imageEditingExecutors = read('components/PebblingCanvas/execution/executeImageEditingNodes.ts');
  assert.match(imageEditingExecutors, /persistGeneratedImageForCanvas/);
  assert.match(imageEditingExecutors, /const localResult = await persistGeneratedImageForCanvas/);
  assert.match(imageEditingExecutors, /resolveOutputPending\(outNodeRef\.id,\s*pendingIdx,\s*localResult/);

  const batchHandlers = read('components/PebblingCanvas/execution/batchHandlers.ts');
  assert.match(batchHandlers, /persistGeneratedImageForCanvas/);
  assert.match(batchHandlers, /const localResult = await persistGeneratedImageForCanvas/);
  assert.doesNotMatch(batchHandlers, /onImageGenerated\(result/);

  const toolBatchHandlers = read('components/PebblingCanvas/execution/batchHandlers2.ts');
  assert.match(toolBatchHandlers, /persistGeneratedImageForCanvas/);
  assert.match(toolBatchHandlers, /const localResult = await persistGeneratedImageForCanvas/);
  assert.doesNotMatch(toolBatchHandlers, /onImageGenerated\(result/);

  const floatingExecutor = read('components/PebblingCanvas/execution/executeFloatingGenerate.ts');
  assert.match(floatingExecutor, /persistGeneratedImageForCanvas/);
  assert.match(floatingExecutor, /const localResult = await persistGeneratedImageForCanvas/);

  const canvas = read('components/PebblingCanvas/index.tsx');
  assert.match(canvas, /executeFloatingGenerate/);
  assert.doesNotMatch(canvas, /const result = await generateCreativeImage\(prompt,\s*config\)/);
  assert.doesNotMatch(canvas, /const result = await editCreativeImage\(base64Files,\s*prompt,\s*config\)/);
});
