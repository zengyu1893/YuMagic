import { CanvasNode, Connection, GenerationConfig } from '../../../types/pebblingTypes';
import { ExecutorContext } from './executorTypes';
import { generateCreativeImage, editCreativeImage, extractImageMetadata, isValidImage } from '../apiAdapters';
import { getThirdPartyConfig } from '../../../services/geminiService';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

/**
 * Execute an image node. Handles four cases:
 * 1. Folder of files → creates per-file output nodes
 * 2. Prompt only → text-to-image
 * 3. No prompt + images → pass-through (container mode)
 * 4. Prompt + images → image-to-image
 */
export async function executeImageNode(ctx: ExecutorContext): Promise<void> {
  const {
    node, nodeId, signal, inputs,
    connectionsRef, nodesRef, updateNode, setNodes, setConnections,
    getOrCreateOutputNode, resolveOutputPending,
    saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName, uuid,
  } = ctx;

  // --- Folder processing: distribute files to individual output nodes ---
  if (node.data?.files && node.data.files.length > 0) {
    const files = node.data.files;
    const newNodes: CanvasNode[] = [];
    const newConnections: Connection[] = [];
    const baseX = node.x + node.width + 100;
    const startY = node.y;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const newId = uuid();
      newNodes.push({
        id: newId, type: 'output', title: file.name, content: file.data,
        x: baseX, y: startY + i * 320, width: 300, height: 300,
        status: 'completed', data: { outputImages: [file.data] },
      });
      newConnections.push({ id: uuid(), fromNode: nodeId, toNode: newId });
    }
    nodesRef.current = [...nodesRef.current, ...newNodes];
    setNodes(prev => [...prev, ...newNodes]);
    connectionsRef.current = [...connectionsRef.current, ...newConnections];
    setConnections(prev => [...prev, ...newConnections]);
    updateNode(nodeId, { status: 'completed', data: { ...node.data, llmProgress: undefined } });
    saveCurrentCanvas();
    return;
  }

  // --- Prompt / settings resolution ---
  const nodePrompt = node.type === 'idea' ? (node.content || '') : (node.data?.prompt || '');
  const inputTexts = inputs.texts.join('\n');
  const inputImages = inputs.images;

  let upstreamSettings: any = null;
  let upstreamPrompt = '';
  const inputConnections = connectionsRef.current.filter(c => c.toNode === nodeId);
  for (const conn of inputConnections) {
    const upstreamNode = nodesRef.current.find(n => n.id === conn.fromNode);
    if (upstreamNode?.type === 'idea' && upstreamNode.data?.settings) {
      upstreamSettings = upstreamNode.data.settings;
      if (!nodePrompt && upstreamNode.content) upstreamPrompt = upstreamNode.content;
      break;
    } else if (upstreamNode?.type === 'image' && upstreamNode.data?.prompt && !nodePrompt) {
      upstreamPrompt = upstreamNode.data.prompt;
    }
  }

  const combinedPrompt = inputTexts || upstreamPrompt || nodePrompt;
  const effectiveSettings = node.data?.settings || upstreamSettings || {};
  const quality = effectiveSettings.quality || 'auto';
  const moderation = effectiveSettings.moderation === 'low' || effectiveSettings.moderation === 'auto'
    ? effectiveSettings.moderation
    : undefined;
  const providerConfig = await loadCanvasNodeThirdPartyConfig(node.data, 'image', getThirdPartyConfig());
  const hasSelectedProvider = !!node.data?.apiProviderProfileId;
  const imageModel = hasSelectedProvider
    ? (node.data?.imageModel || providerConfig?.model || '')
    : (effectiveSettings.model || providerConfig?.model || '');

  let imageSource: string[] = [];
  if (inputImages.length > 0) imageSource = inputImages;
  else if (isValidImage(node.content)) imageSource = [node.content];

  if (node.type === 'idea') {
    const { node: outNodeRef, pendingIdx } = getOrCreateOutputNode(nodeId);
    const outputNodeId = outNodeRef.id;

    if (!combinedPrompt && imageSource.length === 0) {
      updateNode(outputNodeId, { status: 'error' });
      updateNode(nodeId, { status: 'idle' });
      return;
    }

    const imgAspectRatio = effectiveSettings.aspectRatio || 'AUTO';
    const imgResolution = effectiveSettings.resolution || '2K';
    const imgConfig = imageSource.length > 0
      ? (imgAspectRatio !== 'AUTO'
        ? { aspectRatio: imgAspectRatio, resolution: imgResolution !== 'AUTO' ? imgResolution as '1K' | '2K' | '4K' : '1K', quality, moderation }
        : { resolution: imgResolution !== 'AUTO' ? imgResolution as '1K' | '2K' | '4K' : '1K', quality, moderation })
      : (imgAspectRatio !== 'AUTO'
        ? { aspectRatio: imgAspectRatio, resolution: imgResolution as '1K' | '2K' | '4K', quality, moderation }
        : { aspectRatio: '1:1', resolution: imgResolution as '1K' | '2K' | '4K', quality, moderation });

    try {
      if (hasSelectedProvider && (!providerConfig || !imageModel)) {
        throw new Error('No image model selected');
      }
      const result = imageSource.length > 0
        ? await editCreativeImage(imageSource, combinedPrompt, imgConfig, signal, imageModel, providerConfig)
        : await generateCreativeImage(combinedPrompt, imgConfig, signal, imageModel, providerConfig);

      if (!signal.aborted && result) {
        const localResult = await persistGeneratedImageForCanvas(result, {
          downloadRemoteToOutput,
          saveToOutput,
        }, `canvas_${outputNodeId}_${Date.now()}.png`);
        const metadata = await extractImageMetadata(localResult);
        resolveOutputPending(outputNodeId, pendingIdx, localResult, {
          imageMetadata: metadata,
          prompt: combinedPrompt,
          settings: effectiveSettings,
        });
        updateNode(nodeId, { status: 'idle' });
        saveCurrentCanvas();
        if (onImageGenerated) onImageGenerated(localResult, combinedPrompt, currentCanvasId || undefined, canvasName);
      } else if (!signal.aborted) {
        updateNode(outputNodeId, { status: 'error' });
        updateNode(nodeId, { status: 'idle' });
      }
    } catch {
      if (!signal.aborted) {
        updateNode(outputNodeId, { status: 'error' });
        updateNode(nodeId, { status: 'idle' });
      }
    }
    return;
  }

  // --- Case: No prompt, no image ---
  if (!combinedPrompt && imageSource.length === 0) {
    if (isValidImage(node.content)) updateNode(nodeId, { status: 'idle' });
    else updateNode(nodeId, { status: 'error' });
    return;
  }

  // --- Case: Prompt only (text-to-image) ---
  if (combinedPrompt && imageSource.length === 0) {
    if (hasSelectedProvider && (!providerConfig || !imageModel)) {
      updateNode(nodeId, { status: 'error' });
      return;
    }
    const imgAspectRatio = effectiveSettings.aspectRatio || 'AUTO';
    const imgResolution = effectiveSettings.resolution || '2K';
    const imgConfig = imgAspectRatio !== 'AUTO'
      ? { aspectRatio: imgAspectRatio, resolution: imgResolution as '1K' | '2K' | '4K', quality, moderation }
      : { aspectRatio: '1:1', resolution: imgResolution as '1K' | '2K' | '4K', quality, moderation };
    try {
      const result = await generateCreativeImage(combinedPrompt, imgConfig, signal, imageModel, providerConfig);
      if (!signal.aborted) {
        if (result) {
          const localResult = await persistGeneratedImageForCanvas(result, {
            downloadRemoteToOutput,
            saveToOutput,
          }, `canvas_${nodeId}_${Date.now()}.png`);
          updateNode(nodeId, { content: localResult, status: 'idle' });
          saveCurrentCanvas();
          if (onImageGenerated) onImageGenerated(localResult, combinedPrompt, currentCanvasId || undefined, canvasName);
        } else updateNode(nodeId, { status: 'error' });
      }
    } catch { if (!signal.aborted) updateNode(nodeId, { status: 'error' }); }
    return;
  }

  // --- Case: No prompt, images only (container pass-through) ---
  if (!combinedPrompt && imageSource.length > 0) {
    updateNode(nodeId, { content: imageSource[0], status: 'idle' });
    return;
  }

  // --- Case: Prompt + images (image-to-image) ---
  const imgAspectRatio = effectiveSettings.aspectRatio || 'AUTO';
  const imgResolution = effectiveSettings.resolution || '1K';
  let imgConfig: GenerationConfig | undefined;
  if (imgAspectRatio !== 'AUTO') {
    imgConfig = {
      aspectRatio: imgAspectRatio,
      resolution: imgResolution !== 'AUTO' ? (imgResolution as '1K' | '2K' | '4K') : '1K',
      quality,
      moderation,
    };
  } else if (imgResolution !== 'AUTO' && imgResolution !== '1K') {
    imgConfig = { resolution: imgResolution as '1K' | '2K' | '4K', quality, moderation };
  } else {
    imgConfig = { quality, moderation };
  }
  try {
    if (hasSelectedProvider && (!providerConfig || !imageModel)) {
      updateNode(nodeId, { status: 'error' });
      return;
    }
    const result = await editCreativeImage(imageSource, combinedPrompt, imgConfig, signal, imageModel, providerConfig);
    if (!signal.aborted) {
      if (result) {
        const localResult = await persistGeneratedImageForCanvas(result, {
          downloadRemoteToOutput,
          saveToOutput,
        }, `canvas_${nodeId}_${Date.now()}.png`);
        updateNode(nodeId, { content: localResult, status: 'idle' });
        saveCurrentCanvas();
        if (onImageGenerated) onImageGenerated(localResult, combinedPrompt, currentCanvasId || undefined, canvasName);
      } else updateNode(nodeId, { status: 'error' });
    }
  } catch { if (!signal.aborted) updateNode(nodeId, { status: 'error' }); }
}
