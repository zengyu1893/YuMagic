import { CanvasNode, Connection } from '../../../types/pebblingTypes';
import { editCreativeImage, extractImageMetadata } from '../apiAdapters';
import { BatchContext } from './batchHandlers';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';
import { getThirdPartyConfig } from '../../../services/geminiService';
import { getVideoProtocol } from '../../../services/protocolRegistry';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import { downloadGeneratedVideo } from '../../../src/features/video-generation/services/videoDownload.ts';
import {
  prepareVideoInputImages,
  runVideoProviderTask,
} from '../../../src/features/video-generation/services/videoTaskRunner.ts';

/** Batch execute for tool nodes (remove-bg/upscale): create N output nodes, run edit concurrently. */
export async function handleToolBatchExecute(ctx: BatchContext): Promise<void> {
  const { sourceNodeId, sourceNode, count, nodesRef, connectionsRef, updateNode, setNodes, setConnections, resolveInputs, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName, uuid, addAbortController, removeAbortController } = ctx;

  const inputs = resolveInputs(sourceNodeId);
  const inputImages = inputs.images;
  if (inputImages.length === 0) { console.warn('[工具批量] 无输入图片'); return; }

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
    newNodes.push({ id: newId, type: 'output', content: '', x: baseX, y: startY + i * (nodeHeight + gap), width: 300, height: 300, status: 'running', data: {} });
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
      const toolModel = sourceNode.data?.settings?.model;
      if (sourceNode.type === 'remove-bg') {
        result = await editCreativeImage([inputImages[0]], 'Remove the background, keep subject on transparent or white background', undefined, signal, toolModel);
      } else if (sourceNode.type === 'upscale') {
        const upscaleResolution = sourceNode.data?.settings?.resolution || '2K';
        result = await editCreativeImage([inputImages[0]], 'Upscale this image to high resolution while preserving all original details.', { resolution: upscaleResolution as '1K' | '2K' | '4K' }, signal, toolModel);
      }
      if (!signal.aborted && result) {
        const localResult = await persistGeneratedImageForCanvas(result, {
          downloadRemoteToOutput,
          saveToOutput,
        }, `canvas_${nodeId}_${Date.now()}.png`);
        const metadata = await extractImageMetadata(localResult);
        updateNode(nodeId, { content: localResult, status: 'completed', data: { imageMetadata: metadata } });
        const src = nodesRef.current.find(n => n.id === sourceNodeId);
        if (src) updateNode(sourceNodeId, { status: 'idle', data: { ...src.data, output: localResult } });
        if (onImageGenerated) onImageGenerated(localResult, sourceNode.type === 'remove-bg' ? '抠图结果' : '放大结果', currentCanvasId || undefined, canvasName);
      } else if (!signal.aborted) {
        updateNode(nodeId, { status: 'error' });
      }
    } catch (err) {
      if (!signal.aborted) console.error(`[工具批量] 结果 ${index + 1} 失败:`, err);
      if (!signal.aborted) updateNode(nodeId, { status: 'error' });
    } finally {
      removeAbortController(nodeId, abortController);
    }
  });

  await Promise.all(execPromises);
  saveCurrentCanvas();
}

/** Batch execute for video nodes and await every output lifecycle. */
export async function handleVideoBatchExecute(ctx: BatchContext): Promise<void> {
  const {
    sourceNodeId, sourceNode, count, nodesRef, connectionsRef,
    updateNode, setNodes, setConnections, setHasUnsavedChanges,
    resolveInputs, saveCurrentCanvas, onImageGenerated,
    currentCanvasId, canvasName, uuid,
    addAbortController, removeAbortController,
  } = ctx;

  const inputs = resolveInputs(sourceNodeId);
  const combinedPrompt = inputs.texts.join('\n') || sourceNode.data?.prompt || '';
  const inputImages = inputs.images;
  if (!combinedPrompt) return;

  const resultNodeIds: string[] = [];
  const newNodes: CanvasNode[] = [];
  const newConnections: Connection[] = [];
  const baseX = sourceNode.x + sourceNode.width + 150;
  const nodeHeight = 300; const nodeWidth = 400; const gap = 20;
  const totalHeight = count * nodeHeight + (count - 1) * gap;
  const startY = sourceNode.y + (sourceNode.height / 2) - (totalHeight / 2);

  for (let i = 0; i < count; i++) {
    const newId = uuid();
    resultNodeIds.push(newId);
    newNodes.push({ id: newId, type: 'video-output', title: `视频 ${i + 1}`, content: '', x: baseX, y: startY + i * (nodeHeight + gap), width: nodeWidth, height: nodeHeight, status: 'running', data: {} });
    newConnections.push({ id: uuid(), fromNode: sourceNodeId, toNode: newId });
  }

  setNodes(prev => [...prev, ...newNodes]);
  setConnections(prev => [...prev, ...newConnections]);
  nodesRef.current = [...nodesRef.current, ...newNodes];
  connectionsRef.current = [...connectionsRef.current, ...newConnections];
  setHasUnsavedChanges(true);
  saveCurrentCanvas();

  const markAllOutputsFailed = (message: string) => {
    resultNodeIds.forEach(outputNodeId => {
      updateNode(outputNodeId, {
        status: 'error',
        data: {
          ...nodesRef.current.find(node => node.id === outputNodeId)?.data,
          videoFailReason: message,
        },
      });
    });
  };

  let config;
  try {
    config = await loadCanvasNodeThirdPartyConfig(
      sourceNode.data,
      'video',
      getThirdPartyConfig(),
    );
    if (!config?.apiKey || !config.baseUrl) {
      throw new Error('Please configure an API URL and key for the selected video provider');
    }
  } catch (error) {
    markAllOutputsFailed(error instanceof Error ? error.message : String(error));
    await saveCurrentCanvas();
    return;
  }

  const videoModel = sourceNode.data?.videoModel || config.videoModel || '';
  if (!videoModel) {
    markAllOutputsFailed('No video model selected');
    await saveCurrentCanvas();
    return;
  }
  const videoAspect = sourceNode.data?.videoAspect || '16:9';
  const videoSeconds = sourceNode.data?.videoSeconds || sourceNode.data?.seconds || '10';
  const videoResolution = sourceNode.data?.videoResolution || '720p';
  const protocol = getVideoProtocol(videoModel);
  if (!protocol) {
    markAllOutputsFailed(`Unsupported video model: ${videoModel}`);
    await saveCurrentCanvas();
    return;
  }

  await Promise.all(resultNodeIds.map(async outputNodeId => {
    const abortController = new AbortController();
    addAbortController(outputNodeId, abortController);
    const signal = abortController.signal;
    try {
      const processedImages = await prepareVideoInputImages(
        inputImages,
        signal,
        window.location.origin,
      );
      const payload: Record<string, unknown> = {
        prompt: combinedPrompt,
        model: videoModel,
        seconds: videoSeconds,
        size: videoResolution === '480p' ? '480P' : '720P',
      };
      if (videoAspect !== 'AUTO') payload.aspect_ratio = videoAspect;
      if (processedImages.length > 0) payload.images = processedImages;

      const taskResult = await runVideoProviderTask({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        protocol,
        payload,
        signal,
        onUpdate: taskUpdate => {
          updateNode(outputNodeId, {
            data: {
              ...nodesRef.current.find(node => node.id === outputNodeId)?.data,
              videoTaskId: taskUpdate.taskId,
              videoTaskStatus: taskUpdate.status,
              videoProgress: taskUpdate.progress,
            },
          });
        },
      });
      const localVideoUrl = await downloadGeneratedVideo(taskResult.videoUrl, signal);
      if (signal.aborted) return;

      updateNode(outputNodeId, {
        content: localVideoUrl,
        status: 'completed',
        data: {
          ...nodesRef.current.find(node => node.id === outputNodeId)?.data,
          videoTaskId: undefined,
          videoProgress: 100,
          videoTaskStatus: 'SUCCESS',
          videoFailReason: undefined,
          videoUrl: undefined,
        },
      });
      onImageGenerated?.(localVideoUrl, combinedPrompt, currentCanvasId || undefined, canvasName);
    } catch (error) {
      if (!signal.aborted) {
        updateNode(outputNodeId, {
          status: 'error',
          data: {
            ...nodesRef.current.find(node => node.id === outputNodeId)?.data,
            videoFailReason: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } finally {
      removeAbortController(outputNodeId, abortController);
    }
  }));

  await saveCurrentCanvas();
}
