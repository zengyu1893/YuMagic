interface PersistResult {
  success: boolean;
  data?: { url?: string };
  error?: string;
}

export interface GeneratedImageAssetDeps {
  downloadRemoteToOutput: (imageUrl: string, filename?: string) => Promise<PersistResult>;
  saveToOutput: (imageData: string, filename?: string) => Promise<PersistResult>;
}

export async function persistGeneratedImageForCanvas(
  imageUrl: string,
  deps: GeneratedImageAssetDeps,
  filename?: string,
): Promise<string> {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith('/files/')) return imageUrl;

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const result = await deps.downloadRemoteToOutput(imageUrl, filename);
    if (result.success && result.data?.url) return result.data.url;
    throw new Error(result.error || 'Failed to persist generated remote image');
  }

  if (imageUrl.startsWith('data:image')) {
    const result = await deps.saveToOutput(imageUrl, filename);
    if (result.success && result.data?.url) return result.data.url;
    throw new Error(result.error || 'Failed to persist generated base64 image');
  }

  return imageUrl;
}
