import { CanvasNode, Connection, GenerationConfig } from '../../../types/pebblingTypes';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { ExecutorContext } from './executorTypes';
import { editCreativeImage, extractImageMetadata } from '../apiAdapters';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

/** Execute remove-bg: call edit API with background-removal prompt. */
export async function executeRemoveBgNode(ctx: ExecutorContext): Promise<void> {
  const {
    nodeId, signal, inputs, updateNode, getOrCreateOutputNode,
    resolveOutputPending, saveCurrentCanvas, onImageGenerated,
    currentCanvasId, canvasName,
  } = ctx;
  if (inputs.images.length === 0) {
    console.warn('Remove-BG节点执行失败: 无输入图片');
    return;
  }

  const { node: outNodeRef, pendingIdx } = getOrCreateOutputNode(nodeId);
  const prompt = 'Remove the background, keep subject on transparent or white background';

  try {
    const result = await editCreativeImage([inputs.images[0]], prompt, undefined, signal);
    if (!signal.aborted && result) {
      const localResult = await persistGeneratedImageForCanvas(result, {
        downloadRemoteToOutput,
        saveToOutput,
      }, `canvas_${outNodeRef.id}_${Date.now()}.png`);
      const metadata = await extractImageMetadata(localResult);
      resolveOutputPending(outNodeRef.id, pendingIdx, localResult, { imageMetadata: metadata });
      saveCurrentCanvas();
      if (onImageGenerated) onImageGenerated(localResult, '抠图结果', currentCanvasId || undefined, canvasName);
    } else if (!signal.aborted) {
      updateNode(outNodeRef.id, { status: 'error' });
    }
  } catch {
    if (!signal.aborted) updateNode(outNodeRef.id, { status: 'error' });
  }
}

/** Execute upscale: call edit API with upscale prompt and resolution config. */
export async function executeUpscaleNode(ctx: ExecutorContext): Promise<void> {
  const {
    nodeId, signal, inputs, updateNode, getOrCreateOutputNode,
    resolveOutputPending, saveCurrentCanvas, onImageGenerated,
    currentCanvasId, canvasName,
  } = ctx;
  if (inputs.images.length === 0) {
    console.error('Upscale节点执行失败: 无输入图片');
    return;
  }

  const { node: outNodeRef, pendingIdx } = getOrCreateOutputNode(nodeId);
  const prompt = 'Upscale this image to high resolution while preserving all original details, colors, and composition.';
  const upscaleConfig: GenerationConfig = { resolution: '2K' as const };

  try {
    const result = await editCreativeImage([inputs.images[0]], prompt, upscaleConfig, signal);
    if (!signal.aborted && result) {
      const localResult = await persistGeneratedImageForCanvas(result, {
        downloadRemoteToOutput,
        saveToOutput,
      }, `canvas_${outNodeRef.id}_${Date.now()}.png`);
      const metadata = await extractImageMetadata(localResult);
      resolveOutputPending(outNodeRef.id, pendingIdx, localResult, { imageMetadata: metadata });
      saveCurrentCanvas();
      if (onImageGenerated) onImageGenerated(localResult, '放大结果', currentCanvasId || undefined, canvasName);
    } else if (!signal.aborted) {
      updateNode(outNodeRef.id, { status: 'error' });
    }
  } catch {
    if (!signal.aborted) updateNode(outNodeRef.id, { status: 'error' });
  }
}

/** Execute drawing-board: batchCount=1 receives images, batchCount=2 exports canvas. */
export async function executeDrawingBoardNode(ctx: ExecutorContext, batchCount: number): Promise<void> {
  const { node, nodeId, resolveInputs, updateNode, uuid, setNodes, setConnections, nodesRef, connectionsRef, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName } = ctx;
  if (batchCount === 1) {
    const inputs = resolveInputs(nodeId);
    if (inputs.images.length > 0) {
      updateNode(nodeId, { status: 'completed', data: { ...node.data, receivedImages: inputs.images } });
    }
  } else if (batchCount === 2) {
    const outputDataUrl = node.content;
    if (outputDataUrl && outputDataUrl.startsWith('data:image')) {
      const outputNodeId = uuid();
      const outputNode: CanvasNode = {
        id: outputNodeId, type: 'output', title: 'OUTPUT', content: outputDataUrl,
        x: node.x + node.width + 100, y: node.y, width: 280, height: 280, data: {}, status: 'completed',
      };
      const newConnection: Connection = { id: uuid(), fromNode: nodeId, toNode: outputNodeId };
      setNodes(prev => [...prev, outputNode]);
      setConnections(prev => [...prev, newConnection]);
      nodesRef.current = [...nodesRef.current, outputNode];
      connectionsRef.current = [...connectionsRef.current, newConnection];
      updateNode(nodeId, { data: { ...node.data, outputImageUrl: outputDataUrl } });
      saveCurrentCanvas();
      if (onImageGenerated) onImageGenerated(outputDataUrl, '画板输出', currentCanvasId || undefined, canvasName);
    }
  }
}
