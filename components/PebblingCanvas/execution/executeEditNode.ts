import { GenerationConfig } from '../../../types/pebblingTypes';
import { ExecutorContext } from './executorTypes';
import { generateCreativeImage, editCreativeImage, extractImageMetadata } from '../apiAdapters';
import { getThirdPartyConfig } from '../../../services/geminiService';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

/**
 * Execute an edit (Magic) node. Routes to text-to-image, pass-through, or
 * image-to-image based on prompt/image availability. Writes results to
 * a managed output node.
 */
export async function executeEditNode(ctx: ExecutorContext): Promise<void> {
  const {
    node, nodeId, signal, inputs,
    updateNode, getOrCreateOutputNode, resolveOutputPending,
    saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName,
  } = ctx;

  const inputTexts = inputs.texts.join('\n');
  const inputImages = inputs.images;
  const combinedPrompt = inputTexts || node.data?.prompt || '';

  const editAspectRatio = node.data?.settings?.aspectRatio || 'AUTO';
  const editResolution = node.data?.settings?.resolution || 'AUTO';
  const quality = node.data?.settings?.quality || 'auto';
  const moderation = node.data?.settings?.moderation === 'low' || node.data?.settings?.moderation === 'auto'
    ? node.data.settings.moderation
    : undefined;
  const editNodeModel = node.data?.settings?.model;
  const hasSelectedProvider = !!node.data?.apiProviderProfileId;
  const providerConfig = await loadCanvasNodeThirdPartyConfig(node.data, 'image', getThirdPartyConfig());
  const imageModel = hasSelectedProvider
    ? (node.data?.imageModel || providerConfig?.model || '')
    : (node.data?.imageModel || editNodeModel || providerConfig?.model || '');
  const hasInputImages = inputImages.length > 0;

  let finalConfig: GenerationConfig | undefined;
  if (editAspectRatio === 'AUTO' && hasInputImages) {
    if (editResolution !== 'AUTO') finalConfig = { resolution: editResolution as '1K' | '2K' | '4K', quality, moderation };
    else finalConfig = { quality, moderation };
  } else if (editAspectRatio !== 'AUTO' || editResolution !== 'AUTO') {
    finalConfig = {
      aspectRatio: editAspectRatio !== 'AUTO' ? editAspectRatio : '1:1',
      resolution: editResolution !== 'AUTO' ? (editResolution as '1K' | '2K' | '4K') : '1K',
      quality,
      moderation,
    };
  } else {
    finalConfig = { quality, moderation };
  }

  const { node: outNodeRef, pendingIdx } = getOrCreateOutputNode(nodeId);
  const outputNodeId = outNodeRef.id;

  try {
    let result: string | null = null;
    if (!combinedPrompt && inputImages.length === 0) {
      updateNode(outputNodeId, { status: 'error' });
      return;
    } else if (combinedPrompt && inputImages.length === 0) {
      if (hasSelectedProvider && (!providerConfig || !imageModel)) throw new Error('No image model selected');
      result = await generateCreativeImage(combinedPrompt, finalConfig, signal, imageModel, providerConfig);
    } else if (!combinedPrompt && inputImages.length > 0) {
      result = inputImages[0];
    } else {
      if (hasSelectedProvider && (!providerConfig || !imageModel)) throw new Error('No image model selected');
      result = await editCreativeImage(inputImages, combinedPrompt, finalConfig, signal, imageModel, providerConfig);
    }

    if (!signal.aborted && result) {
      const localResult = await persistGeneratedImageForCanvas(result, {
        downloadRemoteToOutput,
        saveToOutput,
      }, `canvas_${outputNodeId}_${Date.now()}.png`);
      const metadata = await extractImageMetadata(localResult);
      resolveOutputPending(outputNodeId, pendingIdx, localResult, { imageMetadata: metadata });
      updateNode(nodeId, { status: 'idle', data: { ...node.data, output: localResult } });
      saveCurrentCanvas();
      if (onImageGenerated) {
        onImageGenerated(localResult, combinedPrompt || 'Magic结果', currentCanvasId || undefined, canvasName);
      }
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
}
