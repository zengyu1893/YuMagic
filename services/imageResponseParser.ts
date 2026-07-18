const REMOTE_IMAGE_URL = /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;
const DATA_IMAGE_URL = /^data:image\/[^;]+;base64,/;
const RAW_IMAGE_BASE64 = /^[A-Za-z0-9+/=]{500,}$/;

export function deepScanForImage(value: unknown): string | null {
  if (typeof value === 'string') {
    if (DATA_IMAGE_URL.test(value)) return value;
    if (value.startsWith('/files/')) return value;
    if (REMOTE_IMAGE_URL.test(value)) return value;
    if (RAW_IMAGE_BASE64.test(value)) return `data:image/png;base64,${value}`;
    return null;
  }

  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepScanForImage(item);
      if (found) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const inlineData = record.inlineData;
  if (inlineData && typeof inlineData === 'object') {
    const inlineRecord = inlineData as Record<string, unknown>;
    if (typeof inlineRecord.data === 'string') {
      const mimeType = typeof inlineRecord.mimeType === 'string' ? inlineRecord.mimeType : 'image/png';
      return `data:${mimeType};base64,${inlineRecord.data}`;
    }
  }

  const priorityKeys = ['url', 'b64_json', 'data', 'image', 'imageUrl', 'image_url', 'output'];
  for (const key of priorityKeys) {
    const found = deepScanForImage(record[key]);
    if (found) return found;
  }

  for (const [key, nestedValue] of Object.entries(record)) {
    if (key === 'inlineData' || priorityKeys.includes(key)) continue;
    const found = deepScanForImage(nestedValue);
    if (found) return found;
  }

  return null;
}
