const crypto = require('crypto');

const config = require('../config');
const FileHandler = require('./fileHandler');
const ThumbnailGenerator = require('./thumbnail');

const fetch = (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

const DEFAULT_TIMEOUT_MS = 60000;
const MAX_DOWNLOAD_RETRIES = 3;

function sanitizeForFilename(value) {
  return String(value || 'unknown')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'unknown';
}

function extensionForMime(mimeType) {
  const mime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '.png';
}

function replaceFilenameExtension(filename, mimeType) {
  return String(filename || 'image.png').replace(/\.[^.\\/]+$/, '') + extensionForMime(mimeType);
}

function createOutputFilename({ model, source, index = 0, mimeType = 'image/png' }) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const nonce = crypto.randomBytes(3).toString('hex');
  return [
    'yuli',
    sanitizeForFilename(source),
    sanitizeForFilename(model),
    ts,
    String(index + 1),
    nonce,
  ].join('_') + extensionForMime(mimeType);
}

function toImageDataUrl(b64Json, mimeType = 'image/png') {
  const value = String(b64Json || '');
  if (value.startsWith('data:image/')) return value;
  return `data:${mimeType};base64,${value}`;
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/*,*/*',
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function defaultDownloadRemoteImage(imageUrl, filename) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt += 1) {
    try {
      console.log(`[Generated Image] 下载远程图片 (${attempt}/${MAX_DOWNLOAD_RETRIES}): ${imageUrl.substring(0, 100)}`);
      const response = await fetchWithTimeout(imageUrl);
      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
        if ([400, 401, 403, 404, 410].includes(response.status)) err.skipRetry = true;
        throw err;
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const mimeType = contentType.split(';')[0].trim() || 'image/png';
      if (!mimeType.startsWith('image/')) {
        throw new Error(`远程 URL 返回的不是图片: ${mimeType}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const imageData = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return FileHandler.saveImage(imageData, config.OUTPUT_DIR, replaceFilenameExtension(filename, mimeType));
    } catch (err) {
      lastError = err;
      if (err.skipRetry || attempt === MAX_DOWNLOAD_RETRIES) break;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError?.name === 'AbortError' ? '下载超时' : (lastError?.message || '下载失败'),
  };
}

async function defaultSaveImageData(imageData, filename) {
  return FileHandler.saveImage(imageData, config.OUTPUT_DIR, filename);
}

async function defaultGenerateThumbnail(filePath) {
  return ThumbnailGenerator.generate(filePath, 'output');
}

async function attachThumbnail(item, saveResult, generateThumbnail) {
  const next = { ...item };
  if (!saveResult?.data?.path) return next;

  const thumbResult = await generateThumbnail(saveResult.data.path);
  if (thumbResult?.success && thumbResult.thumbnailUrl) {
    next.thumbnail_url = thumbResult.thumbnailUrl;
  }
  return next;
}

async function persistGeneratedImageItem(item, index, options = {}) {
  if (!item || typeof item !== 'object') return item;

  const model = options.model || 'unknown';
  const source = options.source || 'generated';
  const downloadRemoteImage = options.downloadRemoteImage || defaultDownloadRemoteImage;
  const saveImageData = options.saveImageData || defaultSaveImageData;
  const generateThumbnail = options.generateThumbnail || defaultGenerateThumbnail;

  if (typeof item.url === 'string' && item.url.startsWith('/files/')) {
    return item;
  }

  if (typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) {
    const filename = createOutputFilename({ model, source, index });
    const saveResult = await downloadRemoteImage(item.url, filename);
    if (!saveResult?.success || !saveResult.data?.url) {
      throw new Error(saveResult?.error || '远程图片保存失败');
    }

    return attachThumbnail({
      ...item,
      original_url: item.url,
      url: saveResult.data.url,
    }, saveResult, generateThumbnail);
  }

  if (typeof item.b64_json === 'string' && item.b64_json) {
    const mimeType = item.mime_type || item.mimeType || 'image/png';
    const filename = createOutputFilename({ model, source, index, mimeType });
    const saveResult = await saveImageData(toImageDataUrl(item.b64_json, mimeType), filename);
    if (!saveResult?.success || !saveResult.data?.url) {
      throw new Error(saveResult?.error || 'base64 图片保存失败');
    }

    const { b64_json: _b64Json, ...rest } = item;
    return attachThumbnail({
      ...rest,
      original_format: 'b64_json',
      url: saveResult.data.url,
    }, saveResult, generateThumbnail);
  }

  return item;
}

async function persistGeneratedImageResponse(responsePayload, options = {}) {
  if (!Array.isArray(responsePayload?.data)) return responsePayload;
  const data = [];
  for (let index = 0; index < responsePayload.data.length; index += 1) {
    data.push(await persistGeneratedImageItem(responsePayload.data[index], index, options));
  }
  return { ...responsePayload, data };
}

module.exports = {
  createOutputFilename,
  persistGeneratedImageItem,
  persistGeneratedImageResponse,
  sanitizeForFilename,
  toImageDataUrl,
};
