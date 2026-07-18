/**
 * 玉玉API 代理路由
 * 浏览器 HTTP/2 与 yuli.host 不兼容，通过 Node.js 后端 HTTP/1.1 转发
 */
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const config = require('../config');
const { persistGeneratedImageResponse } = require('../utils/generatedImageOutput');

const router = express.Router();

// multer 配置：临时目录存放上传的参考图
const upload = multer({ dest: path.join(config.BASE_DIR, 'temp_uploads') });

// 保存生成结果（异步 fire-and-forget，不阻塞响应）
const RESULT_DIR = path.join(config.BASE_DIR, '生图记录');
const RESULT_LOG = path.join(RESULT_DIR, 'generation_results.txt');
const fsp = fs.promises;
async function saveResultLog(model, type, data) {
  try {
    await fsp.mkdir(RESULT_DIR, { recursive: true });
  } catch (_) { /* dir exists */ }
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const timeStr = now.toLocaleString('zh-CN', { hour12: false });

  if (type === 'b64_json') {
    const safeModel = model.replace(/[\/\\:*?"<>|]/g, '_');
    const b64File = path.join(RESULT_DIR, `${ts}_${safeModel}.b64`);
    const metaFile = path.join(RESULT_DIR, `${ts}_${safeModel}.txt`);
    try {
      await Promise.all([
        fsp.writeFile(b64File, data, 'utf8'),
        fsp.writeFile(metaFile, `时间: ${timeStr}\n模型: ${model}\n原始文件: ${b64File}\n`, 'utf8'),
      ]);
      console.log(`[玉玉代理] base64 已保存: ${b64File}`);
    } catch (e) {
      console.error('[玉玉代理] 保存 b64 失败:', e.message);
    }
  } else {
    const entry = [
      '='.repeat(70),
      `时间: ${timeStr}`,
      `模型: ${model}`,
      `格式: url`,
      '='.repeat(70),
      data,
      '',
    ].join('\n');
    try {
      await fsp.appendFile(RESULT_LOG, entry, 'utf8');
      console.log(`[玉玉代理] URL 已记录到: ${RESULT_LOG}`);
    } catch (e) {
      console.error('[玉玉代理] 保存日志失败:', e.message);
    }
  }
}

/**
 * POST /images/edits — 图生图代理
 * 接收浏览器 multipart → 转发到 yuli.host (HTTP/1.1)
 */
router.post('/images/edits', upload.array('image', 16), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '未上传参考图' });
    }

    const apiKey = req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '未提供 API Key' });
    }

    const baseUrl = req.body.baseUrl || 'https://yuli.host';

    // 构建转发到 yuli.host 的 FormData（HTTP/1.1）
    const formData = new FormData();
    // /edits 的 image 参数支持数组，多图时每张同名字段
    const fileBuffers = await Promise.all(
      req.files.map(async (file) => {
        const buf = await fsp.readFile(file.path);
        return { buf, file };
      })
    );
    for (const { buf, file } of fileBuffers) {
      const mimeType = file.mimetype || 'image/png';
      const ext = mimeType === 'image/png' ? 'png' : 'jpg';
      const filename = file.originalname || `image.${ext}`;
      formData.append('image', buf, { filename, contentType: mimeType });
    }
    formData.append('prompt', req.body.prompt || '');
    formData.append('model', req.body.model || 'gpt-image-2');
    formData.append('n', req.body.n || '1');
    formData.append('response_format', req.body.response_format || 'b64_json');
    if (req.body.size) {
      formData.append('size', req.body.size);
    }
    if (req.body.quality) {
      formData.append('quality', req.body.quality);
    }
    if (req.body.moderation) {
      formData.append('moderation', req.body.moderation);
    }

    // 转发到 yuli.host（node-fetch 默认 HTTP/1.1）
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/v1/images/edits`;
    console.log(`[玉玉代理] POST ${targetUrl} (model=${req.body.model}, images=${req.files.length}, size=${req.body.size || 'N/A'})`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
      timeout: 600000, // 10分钟超时
    });

    // 清理临时文件（fire-and-forget）
    req.files.forEach(f => fsp.unlink(f.path).catch(() => {}));

    const result = await response.json();

    if (!response.ok) {
      console.error('[玉玉代理] yuli.host 返回错误:', response.status, JSON.stringify(result).substring(0, 500));
      return res.status(response.status).json(result);
    }

    const resultModel = req.body.model || req.body.body?.model || 'unknown';
    let persistedResult;
    try {
      persistedResult = await persistGeneratedImageResponse(result, {
        model: resultModel,
        source: 'edits',
      });
    } catch (persistError) {
      console.error('[玉玉代理] 生成成功但保存到本地失败:', persistError.message);
      return res.status(502).json({
        success: false,
        error: `生成成功但保存图片到本地失败: ${persistError.message}`,
      });
    }

    console.log('[玉玉代理] 生成成功，图片已保存到本地');
    res.json(persistedResult);

    // 保存结果到 TXT（fire-and-forget，不阻塞响应）
    const item = persistedResult.data?.[0];
    if (item?.url) {
      saveResultLog(resultModel, 'url', item.original_url ? `${item.original_url}\nLOCAL: ${item.url}` : item.url);
    }

  } catch (error) {
    // 清理临时文件（fire-and-forget）
    if (req.files) {
      req.files.forEach(f => fsp.unlink(f.path).catch(() => {}));
    }

    console.error('[玉玉代理] 代理请求失败:', error.message);
    res.status(500).json({
      success: false,
      error: `代理请求失败: ${error.message}`,
    });
  }
});

/**
 * POST /images/generations — 文生图代理
 * 接收 JSON → 转发到 yuli.host (HTTP/1.1)
 */
router.post('/images/generations', async (req, res) => {
  try {
    const { apiKey, baseUrl, body } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '未提供 API Key' });
    }
    if (!body || !body.model) {
      return res.status(400).json({ success: false, error: '无效的请求体' });
    }

    const targetUrl = `${(baseUrl || 'https://yuli.host').replace(/\/$/, '')}/v1/images/generations`;
    console.log(`[玉玉代理] POST ${targetUrl} (model=${body.model}, JSON)`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 600000,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[玉玉代理] yuli.host 返回错误:', response.status, JSON.stringify(result).substring(0, 500));
      return res.status(response.status).json(result);
    }

    const resultModel = req.body.model || req.body.body?.model || 'unknown';
    let persistedResult;
    try {
      persistedResult = await persistGeneratedImageResponse(result, {
        model: resultModel,
        source: 'generations',
      });
    } catch (persistError) {
      console.error('[玉玉代理] 生成成功但保存到本地失败:', persistError.message);
      return res.status(502).json({
        success: false,
        error: `生成成功但保存图片到本地失败: ${persistError.message}`,
      });
    }

    console.log('[玉玉代理] 生成成功，图片已保存到本地');
    res.json(persistedResult);

    // 保存结果到 TXT（fire-and-forget，不阻塞响应）
    const item = persistedResult.data?.[0];
    if (item?.url) {
      saveResultLog(resultModel, 'url', item.original_url ? `${item.original_url}\nLOCAL: ${item.url}` : item.url);
    }

  } catch (error) {
    console.error('[玉玉代理] 代理请求失败:', error.message);
    res.status(500).json({
      success: false,
      error: `代理请求失败: ${error.message}`,
    });
  }
});

/**
 * POST /log-result — 前端生成成功后回调，保存结果到 TXT
 * 适用于不走代理的模型（如 Gemini native）
 */
router.post('/log-result', (req, res) => {
  try {
    const { model, type, data } = req.body;
    if (!model || !type || !data) {
      return res.status(400).json({ success: false, error: '缺少 model/type/data' });
    }
    res.json({ success: true });
    saveResultLog(model, type, data); // fire-and-forget
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /gemini/generateContent — Gemini 原生格式代理
 * 接收 JSON → 转发到 yuli.host (HTTP/1.1)
 */
router.post('/gemini/generateContent', async (req, res) => {
  try {
    const { apiKey, baseUrl, body: realBody } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '未提供 API Key' });
    }
    if (!realBody?.contents) {
      return res.status(400).json({ success: false, error: '无效的请求体' });
    }

    const model = realBody.model || 'gemini-3-pro-image-preview';
    const targetUrl = `${(baseUrl || 'https://yuli.host').replace(/\/$/, '')}/v1beta/models/${model}:generateContent`;
    console.log(`[玉玉代理] POST ${targetUrl} (Gemini, JSON)`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(realBody),
      timeout: 600000,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[玉玉代理] yuli.host 返回错误:', response.status, JSON.stringify(result).substring(0, 500));
      return res.status(response.status).json(result);
    }

    console.log('[玉玉代理] Gemini 生成成功');
    res.json(result);

    // 保存到生图记录（fire-and-forget，不阻塞响应）
    const parts = result.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const p of parts) {
        if (p.inlineData?.data) {
          saveResultLog(model, 'b64_json', p.inlineData.data);
          break;
        }
      }
    }

  } catch (error) {
    console.error('[玉玉代理] Gemini 代理请求失败:', error.message);
    res.status(500).json({ success: false, error: `代理请求失败: ${error.message}` });
  }
});

/**
 * POST /chat/completions — Chat/LLM 代理
 * 接收 JSON → 转发到 yuli.host (HTTP/1.1)
 * 解决浏览器 HTTP/2 直连不兼容导致的 170s 延迟
 */
router.post('/chat/completions', async (req, res) => {
  try {
    const { apiKey, baseUrl, body } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '未提供 API Key' });
    }
    if (!body?.messages) {
      return res.status(400).json({ success: false, error: '无效的请求体' });
    }

    const targetUrl = `${(baseUrl || 'https://yuli.host').replace(/\/$/, '')}/v1/chat/completions`;
    console.log(`[玉玉代理] POST ${targetUrl} (model=${body.model || 'N/A'})`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 600000,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[玉玉代理] Chat API 返回错误:', response.status, JSON.stringify(result).substring(0, 500));
      return res.status(response.status).json(result);
    }

    console.log('[玉玉代理] Chat 成功');
    res.json(result);

  } catch (error) {
    console.error('[玉玉代理] Chat 代理请求失败:', error.message);
    res.status(500).json({
      success: false,
      error: `代理请求失败: ${error.message}`,
    });
  }
});

module.exports = router;
