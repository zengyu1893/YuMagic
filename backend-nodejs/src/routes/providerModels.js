/**
 * Provider model fetch proxy.
 * Keeps browser code away from third-party /v1/models CORS and transport quirks.
 */
const express = require('express');

const fetch = (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

const router = express.Router();

const REQUEST_TIMEOUT_MS = 30000;

function normalizeModelBaseUrl(baseUrl) {
  return String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');
}

function createModelsUrl(baseUrl) {
  const normalized = normalizeModelBaseUrl(baseUrl);
  if (!normalized) {
    throw Object.assign(new Error('Base URL is required'), { status: 400 });
  }
  return `${normalized}/v1/models`;
}

function parseOpenAIModelsPayload(payload) {
  const rawModels = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return rawModels
    .filter(model => model && typeof model.id === 'string' && model.id.trim())
    .map(model => ({
      id: model.id,
      owned_by: model.owned_by || '',
      displayName: model.display_name || model.displayName || model.id,
    }));
}

function categorizeProviderModelId(modelId) {
  const lower = String(modelId || '').toLowerCase();
  if (/gpt-image|dall-e|flux|seedream|qwen-image|z-image|wan.*image|imagen|midjourney|ideogram|kling.*image|doubao.*image|stable-diffusion|sdxl|recraft|image|photo|picture|draw/.test(lower)) {
    return 'image';
  }
  if (/sora|veo|kling.*video|seedance|runway|luma|jimeng|minimax.*video|wan.*video|happyhorse|vidu|video|animate/.test(lower)) {
    return 'video';
  }
  if (/whisper|tts|speech|transcri|suno|music|audio|voice/.test(lower)) {
    return 'audio';
  }
  if (/embed/.test(lower)) {
    return 'embedding';
  }
  return 'chat';
}

function buildProviderModelsPayload(models) {
  const allModels = Array.isArray(models) ? models : [];
  const categories = {};
  const imageModels = [];
  const chatModels = [];
  const videoModels = [];

  for (const model of allModels) {
    if (!model?.id) continue;
    const category = categorizeProviderModelId(model.id);
    categories[model.id] = category;
    if (category === 'image') imageModels.push(model.id);
    else if (category === 'video') videoModels.push(model.id);
    else if (category === 'chat') chatModels.push(model.id);
  }

  return {
    allModels,
    categories,
    imageModels,
    chatModels,
    videoModels,
    message: `Fetched ${allModels.length} models`,
  };
}

function readHeader(response, name) {
  if (!response?.headers) return '';
  if (typeof response.headers.get === 'function') return response.headers.get(name) || '';
  return response.headers[name] || response.headers[name.toLowerCase()] || '';
}

function compactText(value, maxLength = 240) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function extractUpstreamErrorText(text) {
  const compact = compactText(text);
  if (!compact) return '';

  try {
    const parsed = JSON.parse(text);
    const message = parsed?.error?.message || parsed?.message || parsed?.error;
    if (message) return compactText(message);
  } catch {
    // Fall through to compact raw text.
  }

  return compact;
}

function looksLikeHtml(contentType, text) {
  return /text\/html/i.test(contentType || '') || /^\s*<!doctype html/i.test(text || '') || /^\s*<html[\s>]/i.test(text || '');
}

function createUpstreamModelError(response, text, targetUrl) {
  const contentType = readHeader(response, 'content-type');
  const location = readHeader(response, 'location');
  const responseUrl = response?.url || targetUrl;
  const upstreamStatus = response?.status || 502;
  const upstreamStatusText = response?.statusText || '';

  if (looksLikeHtml(contentType, text)) {
    const hint = /login|sign in|signin|auth|captcha/i.test(text || '')
      ? ' The response looks like a login or auth page.'
      : '';
    const redirectHint = responseUrl && targetUrl && responseUrl !== targetUrl
      ? ` Final URL: ${responseUrl}.`
      : '';
    return {
      status: 502,
      message: `Upstream returned HTML instead of JSON.${hint}${redirectHint} Please check the Base URL and API key.`,
    };
  }

  if (upstreamStatus >= 300 && upstreamStatus < 400) {
    return {
      status: upstreamStatus,
      message: `Upstream redirected while fetching models (${upstreamStatus}${upstreamStatusText ? ` ${upstreamStatusText}` : ''})${location ? ` to ${location}` : ''}. Please check the Base URL.`,
    };
  }

  const shortText = extractUpstreamErrorText(text);
  return {
    status: upstreamStatus,
    message: `Upstream model endpoint failed (${upstreamStatus}${upstreamStatusText ? ` ${upstreamStatusText}` : ''})${shortText ? `: ${shortText}` : ''}`,
  };
}

async function fetchProviderModelsFromUpstream({ baseUrl, apiKey }) {
  const targetUrl = createModelsUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Authorization: `Bearer ${apiKey || ''}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const contentType = readHeader(response, 'content-type');

    if (!response.ok || looksLikeHtml(contentType, text)) {
      throw Object.assign(new Error(), createUpstreamModelError(response, text, targetUrl));
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw Object.assign(new Error(), {
        status: 502,
        message: 'Upstream returned a non-JSON model response. Please check whether Base URL points to an OpenAI-compatible API.',
      });
    }

    return buildProviderModelsPayload(parseOpenAIModelsPayload(payload));
  } finally {
    clearTimeout(timer);
  }
}

router.post('/fetch', async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body || {};
    const data = await fetchProviderModelsFromUpstream({ baseUrl, apiKey });
    res.json({ success: true, data });
  } catch (error) {
    const status = Number(error.status) || 500;
    const message = error.message || 'Failed to fetch provider models';
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: message,
      message,
    });
  }
});

module.exports = router;
module.exports.buildProviderModelsPayload = buildProviderModelsPayload;
module.exports.categorizeProviderModelId = categorizeProviderModelId;
module.exports.createModelsUrl = createModelsUrl;
module.exports.createUpstreamModelError = createUpstreamModelError;
module.exports.fetchProviderModelsFromUpstream = fetchProviderModelsFromUpstream;
module.exports.parseOpenAIModelsPayload = parseOpenAIModelsPayload;
