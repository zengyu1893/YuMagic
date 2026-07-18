import type { VideoProtocol } from '../../../../services/protocolRegistry.ts';
import { readVideoApiJson, type VideoApiJson } from './videoApiResponse.ts';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type WaitLike = (milliseconds: number, signal: AbortSignal) => Promise<void>;

export interface VideoTaskUpdate {
  taskId: string;
  status?: string;
  progress?: number;
}

export interface VideoTaskResult {
  taskId: string;
  videoUrl: string;
}

interface RunVideoProviderTaskOptions {
  baseUrl: string;
  apiKey: string;
  protocol: VideoProtocol;
  payload: Record<string, unknown>;
  signal: AbortSignal;
  fetchImpl?: FetchLike;
  waitImpl?: WaitLike;
  onUpdate?: (update: VideoTaskUpdate) => void;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

const createAbortError = (): DOMException => new DOMException('The operation was aborted', 'AbortError');

const waitForPoll = (milliseconds: number, signal: AbortSignal): Promise<void> => (
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    signal.addEventListener('abort', handleAbort, { once: true });
  })
);

const requireTaskId = (payload: VideoApiJson, field: string): string => {
  const value = payload[field] ?? payload.task_id ?? payload.data;
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new Error('Create video task failed: response did not include a task ID');
  }
  return String(value);
};

const readNestedString = (payload: VideoApiJson, path: string): string | undefined => {
  let value: unknown = payload;
  for (const key of path.split('.')) {
    if (typeof value !== 'object' || value === null || !(key in value)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const readVideoUrl = (payload: VideoApiJson, protocol: VideoProtocol): string | undefined => (
  readNestedString(payload, protocol.videoUrlField)
  || (typeof payload.video_url === 'string' ? payload.video_url : undefined)
  || readNestedString(payload, 'data.output')
);

const readProgress = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return Number.parseInt(match[0], 10);
  }
  return 0;
};

const readFailureReason = (payload: VideoApiJson): string => {
  for (const field of ['fail_reason', 'error', 'message']) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Video generation failed';
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

export async function prepareVideoInputImages(
  images: string[],
  signal: AbortSignal,
  origin: string,
  fetchImpl: FetchLike = fetch,
): Promise<string[]> {
  return Promise.all(images.map(async image => {
    if (!image.startsWith('/files/')) return image;

    const response = await fetchImpl(`${origin.replace(/\/$/, '')}${image}`, { signal });
    if (!response.ok) {
      throw new Error(`Load video input image failed (HTTP ${response.status})`);
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64 = arrayBufferToBase64(await response.arrayBuffer());
    return `data:${contentType};base64,${base64}`;
  }));
}

export async function runVideoProviderTask({
  baseUrl,
  apiKey,
  protocol,
  payload,
  signal,
  fetchImpl = fetch,
  waitImpl = waitForPoll,
  onUpdate,
  maxPollAttempts = 720,
  pollIntervalMs = 5000,
}: RunVideoProviderTaskOptions): Promise<VideoTaskResult> {
  if (signal.aborted) throw createAbortError();

  const createResponse = await fetchImpl('/api/video-proxy/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl,
      apiKey,
      path: protocol.createPath,
      payload,
    }),
    signal,
  });
  const createData = await readVideoApiJson(createResponse, 'Create video task');
  const taskId = requireTaskId(createData, protocol.taskIdField);
  onUpdate?.({ taskId });

  const queryPath = protocol.queryPath.replace('{id}', encodeURIComponent(taskId));
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    await waitImpl(pollIntervalMs, signal);
    if (signal.aborted) throw createAbortError();

    const pollResponse = await fetchImpl('/api/video-proxy/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey, path: queryPath }),
      signal,
    });
    const pollData = await readVideoApiJson(pollResponse, 'Query video task');
    const status = typeof pollData.status === 'string' ? pollData.status : '';
    const normalizedStatus = status.toLowerCase();
    onUpdate?.({ taskId, status, progress: readProgress(pollData.progress) });

    if (normalizedStatus === 'completed' || normalizedStatus === 'success') {
      const videoUrl = readVideoUrl(pollData, protocol);
      if (!videoUrl) throw new Error('Video task completed but returned no output URL');
      return { taskId, videoUrl };
    }
    if (normalizedStatus === 'failed' || normalizedStatus === 'failure') {
      throw new Error(readFailureReason(pollData));
    }
  }

  throw new Error('Video generation timed out');
}
