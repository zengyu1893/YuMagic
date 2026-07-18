type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type DownloadResponse = {
  success?: unknown;
  error?: unknown;
  message?: unknown;
  data?: {
    url?: unknown;
  };
};

const readErrorMessage = (payload: DownloadResponse | null, rawBody: string): string => {
  for (const value of [payload?.error, payload?.message]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return rawBody.trim();
};

export async function downloadGeneratedVideo(
  videoUrl: string,
  signal: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl('/api/files/download-remote-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl }),
    signal,
  });
  const rawBody = await response.text();
  let payload: DownloadResponse | null = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as DownloadResponse;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = readErrorMessage(payload, rawBody);
    throw new Error(`Download video failed (HTTP ${response.status})${message ? `: ${message}` : ''}`);
  }

  const localUrl = payload?.data?.url;
  if (payload?.success !== true || typeof localUrl !== 'string' || !localUrl.trim()) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : 'Backend returned invalid video data',
    );
  }

  return localUrl;
}

