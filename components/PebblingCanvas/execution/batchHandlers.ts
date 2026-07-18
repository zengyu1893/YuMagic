import { CanvasNode, Connection, GenerationConfig } from '../../../types/pebblingTypes';
import { generateCreativeImage, editCreativeImage, isValidImage, generateAdvancedLLM } from '../apiAdapters';
import { getThirdPartyConfig } from '../../../services/geminiService';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

export interface BatchContext {
  sourceNodeId: string;
  sourceNode: CanvasNode;
  count: number;
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  resolveInputs: (nodeId: string, visited?: Set<string>, excludePortKeys?: string[]) => { images: string[]; texts: string[] };
  saveCurrentCanvas: () => Promise<void>;
  onImageGenerated?: (url: string, prompt: string, canvasId?: string, canvasName?: string) => void;
  currentCanvasId?: string | null;
  canvasName: string;
  uuid: () => string;
  addAbortController: (nodeId: string, controller: AbortController) => void;
  removeAbortController: (nodeId: string, controller: AbortController) => void;
}

/** Batch execute for image/edit nodes: create N output nodes, run generation concurrently. */
export async function handleBatchExecute(ctx: BatchContext): Promise<void> {
  const { sourceNodeId, sourceNode, count, nodesRef, connectionsRef, updateNode, setNodes, setConnections, resolveInputs, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName, uuid, addAbortController, removeAbortController } = ctx;

  const inputs = resolveInputs(sourceNodeId);
  const nodePrompt = sourceNode.data?.prompt || '';
  const inputTexts = inputs.texts.join('\n');
  const combinedPrompt = inputTexts || nodePrompt;
  const inputImages = inputs.images;

  let imageSource: string[] = [];
  if (inputImages.length > 0) imageSource = inputImages;
  else if (isValidImage(sourceNode.content)) imageSource = [sourceNode.content];

  const hasPrompt = !!combinedPrompt;
  const hasImage = imageSource.length > 0;

  if (!hasPrompt && !hasImage) {
    updateNode(sourceNodeId, { status: 'idle' });
    return;
  }

  const resultNodeIds: string[] = [];
  const newNodes: CanvasNode[] = [];
  const newConnections: Connection[] = [];
  const baseX = sourceNode.x + sourceNode.width + 150;
  const nodeHeight = 300;
  const gap = 20;
  const totalHeight = count * nodeHeight + (count - 1) * gap;
  const startY = sourceNode.y + (sourceNode.height / 2) - (totalHeight / 2);

  for (let i = 0; i < count; i++) {
    const newId = uuid();
    resultNodeIds.push(newId);
    newNodes.push({
      id: newId, type: 'output', title: `结果 ${i + 1}`, content: '',
      x: baseX, y: startY + i * (nodeHeight + gap), width: 280, height: nodeHeight,
      status: 'running', data: { prompt: combinedPrompt, settings: sourceNode.data?.settings },
    });
    newConnections.push({ id: uuid(), fromNode: sourceNodeId, toNode: newId });
  }

  setNodes(prev => [...prev, ...newNodes]);
  setConnections(prev => [...prev, ...newConnections]);
  nodesRef.current = [...nodesRef.current, ...newNodes];
  connectionsRef.current = [...connectionsRef.current, ...newConnections];

  const execPromises = resultNodeIds.map(async (nodeId, index) => {
    const abortController = new AbortController();
    addAbortController(nodeId, abortController);
    const signal = abortController.signal;
    try {
      let result: string | null = null;
      const aspectRatio = sourceNode.data?.settings?.aspectRatio || 'AUTO';
      const resolution = sourceNode.data?.settings?.resolution || '1K';
      const quality = sourceNode.data?.settings?.quality || 'auto';
      const moderation = sourceNode.data?.settings?.moderation === 'low' || sourceNode.data?.settings?.moderation === 'auto'
        ? sourceNode.data.settings.moderation
        : undefined;
      const hasSelectedProvider = !!sourceNode.data?.apiProviderProfileId;
      const providerConfig = await loadCanvasNodeThirdPartyConfig(sourceNode.data, 'image', getThirdPartyConfig());
      const nodeModel = hasSelectedProvider
        ? (sourceNode.data?.imageModel || providerConfig?.model || '')
        : (sourceNode.data?.imageModel || sourceNode.data?.settings?.model || providerConfig?.model || '');

      if (hasPrompt && !hasImage) {
        if (hasSelectedProvider && (!providerConfig || !nodeModel)) throw new Error('No image model selected');
        const imgConfig = aspectRatio !== 'AUTO' ? { aspectRatio, resolution, quality, moderation } : { aspectRatio: '1:1', resolution, quality, moderation };
        result = await generateCreativeImage(combinedPrompt, imgConfig, signal, nodeModel, providerConfig);
      } else if (hasPrompt && hasImage) {
        if (hasSelectedProvider && (!providerConfig || !nodeModel)) throw new Error('No image model selected');
        let config: GenerationConfig | undefined;
        if (aspectRatio === 'AUTO') {
          if (resolution !== 'AUTO' && resolution !== '1K') config = { resolution, quality, moderation };
          else config = { quality, moderation };
        } else {
          config = { aspectRatio, resolution: resolution !== 'AUTO' ? resolution : '1K', quality, moderation };
        }
        result = await editCreativeImage(imageSource, combinedPrompt, config, signal, nodeModel, providerConfig);
      } else if (!hasPrompt && hasImage) {
        result = imageSource[0];
      }

      if (!signal.aborted && result) {
        const localResult = await persistGeneratedImageForCanvas(result, {
          downloadRemoteToOutput,
          saveToOutput,
        }, `canvas_${nodeId}_${Date.now()}.png`);
        updateNode(nodeId, { content: localResult, status: 'completed' });
        if (onImageGenerated) onImageGenerated(localResult, combinedPrompt, currentCanvasId || undefined, canvasName);
      } else if (!signal.aborted) {
        updateNode(nodeId, { status: 'error' });
      }
    } catch (err) {
      if (!signal.aborted) console.error(`[批量生成] 结果 ${index + 1} 失败:`, err);
      if (!signal.aborted) updateNode(nodeId, { status: 'error' });
    } finally {
      removeAbortController(nodeId, abortController);
    }
  });

  await Promise.all(execPromises);
  saveCurrentCanvas();
}

/** Batch execute for BP/Idea nodes: process agent fields, create N output nodes, run generation. */
export async function handleBpIdeaBatchExecute(ctx: BatchContext): Promise<void> {
  const { sourceNodeId, sourceNode, count, nodesRef, connectionsRef, updateNode, setNodes, setConnections, resolveInputs, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName, uuid, addAbortController, removeAbortController } = ctx;

  const inputs = resolveInputs(sourceNodeId);
  const inputImages = inputs.images;
  let finalPrompt = '';
  let settings: any = {};

  if (sourceNode.type === 'bp') {
    const bpTemplate = sourceNode.data?.bpTemplate;
    const bpInputs = sourceNode.data?.bpInputs || {};
    settings = sourceNode.data?.settings || {};
    const bpChatModel = sourceNode.data?.chatModel;
    if (!bpTemplate) { updateNode(sourceNodeId, { status: 'idle' }); return; }

    const bpFields = bpTemplate.bpFields || [];
    const inputFields = bpFields.filter((f: any) => f.type === 'input');
    const agentFields = bpFields.filter((f: any) => f.type === 'agent');

    const userInputValues: Record<string, string> = {};
    for (const field of inputFields) userInputValues[field.name] = bpInputs[field.id] || bpInputs[field.name] || '';

    const agentResults: Record<string, string> = {};
    for (const field of agentFields) {
      if (field.agentConfig) {
        let instruction = field.agentConfig.instruction;
        for (const [name, value] of Object.entries(userInputValues)) instruction = instruction.split(`/${name}`).join(value);
        for (const [name, result] of Object.entries(agentResults)) instruction = instruction.split(`{${name}}`).join(result);
        try {
          agentResults[field.name] = await generateAdvancedLLM(
            instruction,
            'You are a creative assistant. Generate content based on the given instruction.',
            inputImages.length > 0 ? [inputImages[0]] : undefined,
            bpChatModel,
          );
        } catch (agentErr) { agentResults[field.name] = `[Agent错误: ${agentErr}]`; }
      }
    }

    finalPrompt = bpTemplate.prompt;
    for (const [name, value] of Object.entries(userInputValues)) finalPrompt = finalPrompt.split(`/${name}`).join(value);
    for (const [name, result] of Object.entries(agentResults)) finalPrompt = finalPrompt.split(`{${name}}`).join(result);
  } else if (sourceNode.type === 'idea') {
    finalPrompt = sourceNode.content || '';
    settings = sourceNode.data?.settings || {};
  }

  if (!finalPrompt) { updateNode(sourceNodeId, { status: 'idle' }); return; }

  const resultNodeIds: string[] = [];
  const newNodes: CanvasNode[] = [];
  const newConnections: Connection[] = [];
  const baseX = sourceNode.x + sourceNode.width + 150;
  const nodeHeight = 300;
  const gap = 20;
  const totalHeight = count * nodeHeight + (count - 1) * gap;
  const startY = sourceNode.y + (sourceNode.height / 2) - (totalHeight / 2);

  for (let i = 0; i < count; i++) {
    const newId = uuid();
    resultNodeIds.push(newId);
    newNodes.push({
      id: newId, type: 'output', title: `结果 ${i + 1}`, content: '',
      x: baseX, y: startY + i * (nodeHeight + gap), width: 280, height: nodeHeight,
      status: 'running', data: { prompt: finalPrompt, settings },
    });
    newConnections.push({ id: uuid(), fromNode: sourceNodeId, toNode: newId });
  }

  setNodes(prev => [...prev, ...newNodes]);
  setConnections(prev => [...prev, ...newConnections]);
  nodesRef.current = [...nodesRef.current, ...newNodes];
  connectionsRef.current = [...connectionsRef.current, ...newConnections];

  const execPromises = resultNodeIds.map(async (nodeId, index) => {
    const abortController = new AbortController();
    addAbortController(nodeId, abortController);
    const signal = abortController.signal;
    try {
      let result: string | null = null;
      const aspectRatio = settings.aspectRatio || 'AUTO';
      const resolution = settings.resolution || '2K';
      const quality = settings.quality || 'auto';
      const moderation = settings.moderation === 'low' || settings.moderation === 'auto'
        ? settings.moderation
        : undefined;
      const hasSelectedProvider = sourceNode.type === 'idea' && !!sourceNode.data?.apiProviderProfileId;
      const providerConfig = sourceNode.type === 'idea'
        ? await loadCanvasNodeThirdPartyConfig(sourceNode.data, 'image', getThirdPartyConfig())
        : null;
      const imageModel = hasSelectedProvider
        ? (sourceNode.data?.imageModel || providerConfig?.model || '')
        : (sourceNode.type === 'idea'
          ? (sourceNode.data?.imageModel || settings.model || providerConfig?.model || '')
          : settings.model);
      let config: GenerationConfig | undefined;
      if (inputImages.length > 0) {
        if (hasSelectedProvider && (!providerConfig || !imageModel)) throw new Error('No image model selected');
        config = aspectRatio === 'AUTO' ? { resolution, quality, moderation } : { aspectRatio, resolution, quality, moderation };
        result = await editCreativeImage(inputImages, finalPrompt, config, signal, imageModel, providerConfig);
      } else {
        if (hasSelectedProvider && (!providerConfig || !imageModel)) throw new Error('No image model selected');
        config = aspectRatio !== 'AUTO' ? { aspectRatio, resolution, quality, moderation } : { aspectRatio: '1:1', resolution, quality, moderation };
        result = await generateCreativeImage(finalPrompt, config, signal, imageModel, providerConfig);
      }
      if (!signal.aborted && result) {
        const localResult = await persistGeneratedImageForCanvas(result, {
          downloadRemoteToOutput,
          saveToOutput,
        }, `canvas_${nodeId}_${Date.now()}.png`);
        updateNode(nodeId, { content: localResult, status: 'completed' });
        if (onImageGenerated) onImageGenerated(localResult, finalPrompt, currentCanvasId || undefined, canvasName);
      } else if (!signal.aborted) {
        updateNode(nodeId, { status: 'error' });
      }
    } catch (err) {
      if (!signal.aborted) console.error(`[BP/Idea批量] 结果 ${index + 1} 失败:`, err);
      if (!signal.aborted) updateNode(nodeId, { status: 'error' });
    } finally {
      removeAbortController(nodeId, abortController);
    }
  });

  await Promise.all(execPromises);
  saveCurrentCanvas();
}
