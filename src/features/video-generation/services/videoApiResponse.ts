export type VideoApiJson = Record<string, unknown>;

const isRecord = (value: unknown): value is VideoApiJson => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getRemoteErrorMessage = (payload: unknown, rawBody: string): string => {
  if (isRecord(payload)) {
    for (const key of ['error', 'message', 'detail']) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (isRecord(value)) return JSON.stringify(value);
    }
  }
  return rawBody.trim();
};

export async function readVideoApiJson(
  response: Response,
  action: string,
): Promise<VideoApiJson> {
  const rawBody = await response.text();
  let payload: unknown = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const remoteMessage = getRemoteErrorMessage(payload, rawBody);
    const suffix = remoteMessage ? `: ${remoteMessage}` : '';
    throw new Error(`${action} failed (HTTP ${response.status})${suffix}`);
  }

  if (!isRecord(payload)) {
    throw new Error(`${action} failed: API returned invalid JSON`);
  }

  return payload;
}
