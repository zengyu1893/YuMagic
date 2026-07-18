import { ExecutorContext } from './executorTypes';
import { getThirdPartyConfig } from '../../../services/geminiService';
import { getVideoProtocol } from '../../../services/protocolRegistry';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import { downloadGeneratedVideo } from '../../../src/features/video-generation/services/videoDownload.ts';
import {
  prepareVideoInputImages,
  runVideoProviderTask,
} from '../../../src/features/video-generation/services/videoTaskRunner.ts';

const persistDownloadedVideo = async (
  videoUrl: string,
  outNodeId: string,
  signal: AbortSignal,
  ctx: ExecutorContext,
): Promise<string> => {
  const { nodesRef, updateNode, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName } = ctx;
  const localVideoUrl = await downloadGeneratedVideo(videoUrl, signal);
  if (signal.aborted) throw new DOMException('The operation was aborted', 'AbortError');

  updateNode(outNodeId, {
    content: localVideoUrl,
    status: 'completed',
    data: {
      ...nodesRef.current.find(node => node.id === outNodeId)?.data,
      videoTaskId: undefined,
      videoTaskStatus: 'SUCCESS',
      videoProgress: 100,
      videoFailReason: undefined,
      videoUrl: undefined,
    },
  });
  await saveCurrentCanvas();
  onImageGenerated?.(localVideoUrl, 'Video generation result', currentCanvasId || undefined, canvasName);
  return localVideoUrl;
};

/** Retry-compatible video download entry point used by canvas callbacks. */
export async function downloadAndSaveVideo(
  videoUrl: string,
  outNodeId: string,
  signal: AbortSignal,
  ctx: ExecutorContext,
): Promise<void> {
  try {
    await persistDownloadedVideo(videoUrl, outNodeId, signal, ctx);
  } catch (error) {
    if (signal.aborted) return;
    ctx.updateNode(outNodeId, {
      status: 'error',
      data: {
        ...ctx.nodesRef.current.find(node => node.id === outNodeId)?.data,
        videoTaskId: undefined,
        videoFailReason: `Download failed: ${error instanceof Error ? error.message : String(error)}`,
        videoUrl,
      },
    });
    await ctx.saveCurrentCanvas();
  }
}

/** Execute a video node while keeping the source node idle. */
export async function executeVideoNode(ctx: ExecutorContext): Promise<void> {
  const {
    node,
    nodeId,
    signal,
    inputs,
    updateNode,
    getOrCreateOutputNode,
    resolveOutputPending,
    nodesRef,
  } = ctx;
  const combinedPrompt = inputs.texts.join('\n') || node.data?.prompt || '';
  if (!combinedPrompt) return;

  const { node: outputNode, pendingIdx } = getOrCreateOutputNode(nodeId, 'video');
  const outNodeId = outputNode.id;
  updateNode(outNodeId, {
    data: { ...outputNode.data, outputType: 'video', videoProgress: 0 },
  });

  let remoteVideoUrl: string | undefined;
  try {
    const config = await loadCanvasNodeThirdPartyConfig(node.data, 'video', getThirdPartyConfig());
    if (!config?.apiKey || !config.baseUrl) {
      throw new Error('Please configure an API URL and key for the selected video provider');
    }

    const videoModel = node.data?.videoModel || config.videoModel || '';
    if (!videoModel) throw new Error('No video model selected');
    const protocol = getVideoProtocol(videoModel);
    if (!protocol) throw new Error(`Unsupported video model: ${videoModel}`);

    const processedImages = await prepareVideoInputImages(
      inputs.images,
      signal,
      window.location.origin,
    );
    const payload: Record<string, unknown> = {
      prompt: combinedPrompt,
      model: videoModel,
      aspect_ratio: node.data?.videoAspect || '16:9',
      seconds: node.data?.videoSeconds || node.data?.seconds || '10',
      size: node.data?.videoResolution === '480p' ? '480P' : '720P',
    };
    if (processedImages.length > 0) payload.images = processedImages;

    const taskResult = await runVideoProviderTask({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      protocol,
      payload,
      signal,
      onUpdate: taskUpdate => {
        updateNode(outNodeId, {
          data: {
            ...nodesRef.current.find(current => current.id === outNodeId)?.data,
            videoTaskId: taskUpdate.taskId,
            videoTaskStatus: taskUpdate.status,
            videoProgress: taskUpdate.progress,
          },
        });
      },
    });

    remoteVideoUrl = taskResult.videoUrl;
    const localVideoUrl = await persistDownloadedVideo(remoteVideoUrl, outNodeId, signal, ctx);
    resolveOutputPending(outNodeId, pendingIdx, localVideoUrl, {
      videoProgress: 100,
      videoTaskStatus: 'SUCCESS',
    });
  } catch (error) {
    if (signal.aborted) return;
    updateNode(outNodeId, {
      status: 'error',
      data: {
        ...nodesRef.current.find(current => current.id === outNodeId)?.data,
        videoFailReason: error instanceof Error ? error.message : String(error),
        videoUrl: remoteVideoUrl,
      },
    });
  }
}
