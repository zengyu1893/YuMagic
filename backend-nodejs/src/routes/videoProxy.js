const express = require('express');

const fetchUpstream = (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

const router = express.Router();
const REQUEST_TIMEOUT_MS = 120000;

function createHttpError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeVideoBaseUrl(baseUrl) {
  const normalized = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');

  if (!normalized) throw createHttpError('Video provider Base URL is required');

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw createHttpError('Video provider Base URL is invalid');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createHttpError('Video provider Base URL must use HTTP or HTTPS');
  }

  return normalized;
}

function createVideoTargetUrl(baseUrl, path) {
  const requestPath = String(path || '').trim();
  if (!requestPath.startsWith('/') || requestPath.startsWith('//')) {
    throw createHttpError('Video provider request path is invalid');
  }
  return `${normalizeVideoBaseUrl(baseUrl)}${requestPath}`;
}

async function forwardVideoRequest({
  baseUrl,
  apiKey,
  path,
  method,
  payload,
  fetchImpl = fetchUpstream,
}) {
  if (!String(apiKey || '').trim()) throw createHttpError('Video provider API key is required');

  const requestMethod = method === 'GET' ? 'GET' : 'POST';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(createVideoTargetUrl(baseUrl, path), {
      method: requestMethod,
      redirect: 'follow',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(requestMethod === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(requestMethod === 'POST' ? { body: JSON.stringify(payload || {}) } : {}),
      signal: controller.signal,
    });

    return {
      status: response.status,
      contentType: response.headers.get('content-type') || 'application/json',
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function sendUpstreamResponse(res, result) {
  res.status(result.status);
  res.type(result.contentType);
  return res.send(result.body);
}

async function handleProxyRequest(req, res, method) {
  try {
    const { baseUrl, apiKey, path, payload } = req.body || {};
    const result = await forwardVideoRequest({ baseUrl, apiKey, path, method, payload });
    return sendUpstreamResponse(res, result);
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    const status = isTimeout ? 504 : Number(error?.status) || 502;
    const message = isTimeout ? 'Video provider request timed out' : error?.message || 'Video provider request failed';
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      error: message,
      message,
    });
  }
}

router.post('/create', (req, res) => handleProxyRequest(req, res, 'POST'));
router.post('/query', (req, res) => handleProxyRequest(req, res, 'GET'));

module.exports = router;
module.exports.createVideoTargetUrl = createVideoTargetUrl;
module.exports.forwardVideoRequest = forwardVideoRequest;
module.exports.normalizeVideoBaseUrl = normalizeVideoBaseUrl;
