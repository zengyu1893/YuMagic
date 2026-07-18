
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse, Part } from "@google/genai";
import { GeneratedContent, CreativeIdea, SmartPlusConfig, BPField, BPAgentModel, ThirdPartyApiConfig, OpenAIChatRequest, OpenAIChatResponse, CreativeCategoryType, CREATIVE_CATEGORIES } from '../types';
import { getImageProtocol, getOpenAIImageSize } from './protocolRegistry';
import { deepScanForImage } from './imageResponseParser';

let ai: GoogleGenAI | null = null;

// 玉玉API配置存储
let thirdPartyConfig: ThirdPartyApiConfig | null = null;

export const setThirdPartyConfig = (config: ThirdPartyApiConfig | null) => {
  thirdPartyConfig = config;
};

export const getThirdPartyConfig = (): ThirdPartyApiConfig | null => {
  return thirdPartyConfig;
};

export const initializeAiClient = (apiKey: string) => {
  if (!apiKey) {
    ai = null;
    console.warn("API Key removed. AI Client de-initialized.");
    return;
  }
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    ai = null;
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    console.error("Failed to initialize AI Client:", errorMessage);
    throw new Error(`Failed to initialize AI Client. Please check your API key. Error: ${errorMessage}`);
  }
};

const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> => {
  let lastError: unknown = new Error("Retry attempts failed.");
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isRetriable = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');

      if (isRetriable && attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed with retriable error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        const parts = reader.result.split(',');
        resolve(parts[1] || '');
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取出错'));
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type || 'image/png', // 浏览器可能返回空 MIME type
    },
  };
};

export interface ImageEditConfig {
  aspectRatio: string;
  imageSize: string;
  quality?: ImageGenerationQuality;
  moderation?: ImageGenerationModeration;
  seed?: number; // 随机种子，用于重新生成
}

export type ImageGenerationQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageGenerationModeration = 'auto' | 'low';

// 将文件转换为 base64
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        const parts = reader.result.split(',');
        resolve(parts[1] || '');
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取出错'));
    reader.readAsDataURL(file);
  });
};

// 玉玉API图片生成 - 支持文生图和图生图（支持多图）
// 本地版本：直接调用玉玉API
export const editImageWithThirdPartyApi = async (
  files: File[], // 支持多图，空数组为文生图模式
  prompt: string,
  config: ImageEditConfig,
  creativeIdeaCost?: number, // 创意库定义的扣费金额（本地版不用）
  signal?: AbortSignal, // 取消信号
  modelOverride?: string, // 画布节点指定模型
  apiConfigOverride?: ThirdPartyApiConfig | null
): Promise<GeneratedContent> => {
  const apiConfig = apiConfigOverride || thirdPartyConfig;
  // 画布节点优先，否则用全局配置
  const effectiveModel = modelOverride || apiConfig?.model || '';
  if (!apiConfig || !apiConfig.enabled) {
    throw new Error("玉玉API未启用");
  }
  
  // 本地版本：需要前端配置 API Key
  if (!apiConfig.apiKey) {
    throw new Error("请先配置玉玉API Key");
  }
  if (!apiConfig.baseUrl) {
    throw new Error("请先配置玉玉API Base URL");
  }
  
  // 处理 Auto 宽高比：图生图模式下不传 aspect_ratio，让API根据输入图片尺寸自动生成
  const isAutoAspectRatio = config.aspectRatio === 'Auto';
  const hasInputImage = files.length > 0;
  
  if (isAutoAspectRatio && hasInputImage) {
    console.log('[Auto宽高比] 图生图模式，不指定比例，使用输入图片原始尺寸');
  }
  
  // 根据 API 文档精确匹配模型→协议
  const protocol = getImageProtocol(effectiveModel);
  if (!protocol) {
    throw new Error(`模型 "${effectiveModel}" 不支持图像生成，请在设置中选择其他模型`);
  }

  const apiPath = protocol.endpoint.replace('{model}', effectiveModel);
  const url = `${apiConfig.baseUrl.replace(/\/$/, '')}${apiPath}`;

  // 处理宽高比 — Auto 模式
  const effectiveRatio = isAutoAspectRatio
    ? (hasInputImage ? undefined : '1:1')
    : config.aspectRatio;
  const requestQuality = config.quality || 'auto';
  const requestModeration = config.moderation === 'low' || config.moderation === 'auto'
    ? config.moderation
    : undefined;

  // === 按协议构建请求体（文生图 / 图生图） ===
  let body: any;
  let useMultipart = false;    // openai-image 图生图需要用 FormData
  let multipartData: FormData | null = null;

  // 文生图/图生图通用的宽高比处理
  // Auto + 图生图: effectiveRatio 为 undefined，不应强制 1:1
  const ratioStr = effectiveRatio || (hasInputImage ? '' : '1:1');

  if (protocol.format === 'openai-image') {
    if (hasInputImage) {
      // 图生图: POST /v1/images/edits (multipart/form-data)
      // 来源: 灵感魔盒 api/openai_image.py image_to_image()
      // gpt-image 系列模型只支持 url（不支持 b64_json）；其他模型用 b64_json
      const isGptImage = effectiveModel.startsWith('gpt-image-');

      multipartData = new FormData();
      // /edits 端点的 image 参数支持文件或文件数组（最多 16 张，API 文档确认）
      for (const file of files.slice(0, 16)) {
        multipartData.append('image', file);
      }
      multipartData.append('prompt', prompt);
      multipartData.append('model', effectiveModel);
      multipartData.append('n', '1');
      multipartData.append('response_format', isGptImage ? 'url' : 'b64_json');

      multipartData.append('quality', requestQuality);
      if (requestModeration) {
        multipartData.append('moderation', requestModeration);
      }
      // ratioStr 为空表示 Auto 宽高比 + 图生图：不指定比例但可传分辨率
      if (ratioStr) {
        const size = getOpenAIImageSize(ratioStr, config.imageSize || '2K');
        multipartData.append('size', size);
        body = { size };  // 仅供日志输出
      } else if (config.imageSize && config.imageSize !== '1K') {
        // Auto + 图生图：如果用户指定了非默认分辨率，用 1:1 作为默认比例计算 size
        const size = getOpenAIImageSize('1:1', config.imageSize);
        multipartData.append('size', size);
        console.log('[Auto宽高比+图生图] 发送自定义分辨率:', config.imageSize, '→', size);
      }
      if (files.length > 16) {
        console.log(`[openai-image] /edits 最多支持 16 张参考图，已截取前 16 张（共传入 ${files.length} 张）`);
      }

      useMultipart = true;
      // 通过 Node.js 后端代理转发到 yuli.host（避免浏览器 HTTP/2 兼容问题）
      // 后端用 HTTP/1.1 转发 multipart 到 /v1/images/edits
      (protocol as any)._editUrl = '/api/yuli-proxy/images/edits';
      // 把 apiKey 和 baseUrl 放在 FormData 中传给后端代理
      multipartData.append('apiKey', apiConfig.apiKey);
      multipartData.append('baseUrl', apiConfig.baseUrl);
    } else {
      // 文生图: 通过后端代理转发 JSON 到 yuli.host（避免浏览器 HTTP/2 兼容问题）
      // gpt-image 系列模型只支持 url（不支持 b64_json）；其他模型用 b64_json
      const isGptImage = effectiveModel.startsWith('gpt-image-');
      const realBody: any = {
        model: effectiveModel,
        prompt: prompt,
        n: 1,
        size: getOpenAIImageSize(ratioStr, config.imageSize || '2K'),
        response_format: isGptImage ? 'url' : 'b64_json',
      };
      realBody.quality = requestQuality;
      if (requestModeration) {
        realBody.moderation = requestModeration;
      }
      // 包裹代理层需要的字段
      body = {
        apiKey: apiConfig.apiKey,
        baseUrl: apiConfig.baseUrl,
        body: realBody,
      };
      // 切换端点到后端代理
      (protocol as any)._editUrl = '/api/yuli-proxy/images/generations';
    }
  } else if (protocol.format === 'gemini-native') {
    // Gemini 原生: POST /v1beta/models/{model}:generateContent  JSON
    // 来源: 灵感魔盒 api/gemini.py text_to_image() / image_to_image()
    const genConfig: any = {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.9,
    };
    const imageConfig: any = {};
    if (effectiveRatio) imageConfig.aspectRatio = effectiveRatio;
    if (config.imageSize) imageConfig.imageSize = config.imageSize;
    if (Object.keys(imageConfig).length > 0) genConfig.imageConfig = imageConfig;

    const parts: any[] = [];
    if (hasInputImage) {
      // 图生图: parts = [文本] + [每张图的 inlineData]
      parts.push({ text: prompt });
      for (const f of files) {
        const imgBase64 = await fileToBase64(f);
        parts.push({
          inlineData: { mimeType: f.type, data: imgBase64 }
        });
      }
    } else {
      // 文生图: parts = [文本]
      parts.push({ text: prompt });
    }

    const realBody = {
      model: effectiveModel,
      contents: [{ role: "user", parts }],
      generationConfig: genConfig,
    };
    // 通过后端代理转发（避免浏览器 HTTP/2 兼容问题）
    body = {
      apiKey: apiConfig.apiKey,
      baseUrl: apiConfig.baseUrl,
      body: realBody,
    };
    (protocol as any)._editUrl = '/api/yuli-proxy/gemini/generateContent';
  } else {
    // openai-chat: 走后端代理 /v1/chat/completions（HTTP/1.1 避免浏览器 HTTP/2 不兼容）
    // API 文档: content 为 string 类型，图生图时 base64 嵌入文本
    const realBody: any = {
      model: effectiveModel,
    };
    if (hasInputImage) {
      let contentStr = prompt;
      for (const f of files) {
        const imgBase64 = await fileToBase64(f);
        contentStr += `\ndata:${f.type};base64,${imgBase64}`;
      }
      realBody.messages = [{ role: 'user', content: contentStr }];
    } else {
      realBody.messages = [{ role: 'user', content: prompt }];
    }
    body = {
      apiKey: apiConfig.apiKey,
      baseUrl: apiConfig.baseUrl,
      body: realBody,
    };
    (protocol as any)._editUrl = '/api/yuli-proxy/chat/completions';
  }

  // 图生图时部分格式用了不同的端点（openai-image /edits）
  const requestUrl = (protocol as any)._editUrl || url;

  console.log('[玉玉API] 请求:', JSON.stringify({
    format: protocol.format,
    endpoint: requestUrl.replace(apiConfig.baseUrl, ''),
    model: effectiveModel,
    mode: hasInputImage ? '图生图' : '文生图',
    size: body?.size || body?.body?.size,
    ratio: effectiveRatio,
    fileCount: files.length,
    useMultipart,
  }));

  // === 发送请求 ===
  const response = await withRetry(async () => {
    let res: Response;
    const isProxy = requestUrl.startsWith('/api/');
    if (useMultipart && multipartData) {
      // 图生图: multipart/form-data (openai-image /edits)
      const fetchOpts: RequestInit = {
        method: 'POST',
        body: multipartData,
      };
      if (signal) fetchOpts.signal = signal;
      res = await fetch(requestUrl, fetchOpts);
    } else {
      // 其他格式: JSON
      const fetchOpts: RequestInit = {
        method: 'POST',
        headers: isProxy ? { 'Content-Type': 'application/json' } : {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify(body),
      };
      if (signal) fetchOpts.signal = signal;
      res = await fetch(requestUrl, fetchOpts);
    }
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[玉玉API] 失败:', { status: res.status, body: errorText.substring(0, 500) });
      throw new Error(`API 请求失败 (${res.status}): ${errorText.substring(0, 200)}`);
    }
    return res.json();
  });

  // === 解析响应 ===
  const result: GeneratedContent = { text: null, imageUrl: null };

  if (protocol.format === 'gemini-native') {
    // Gemini 原生响应: { candidates: [{ content: { parts: [{ inlineData: { data: "base64" } }] } }] }
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const p of parts) {
        if (p.inlineData?.data) {
          result.imageUrl = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
          break;
        }
        if (p.text) result.text = (result.text || '') + p.text;
      }
    }
  } else if (protocol.format === 'openai-chat') {
    const content = response.choices?.[0]?.message?.content || '';
    const b64 = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    result.imageUrl = b64 ? b64[0] : (content.match(/https?:\/\/\S+\.(png|jpg|jpeg|webp)/i) || [null])[0];
    if (!result.imageUrl) result.text = content;
  } else if (protocol.format === 'openai-image') {
    // b64_json 响应
    if (response.data?.[0]?.b64_json) {
      result.imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
    } else if (response.data?.[0]?.url) {
      result.imageUrl = response.data[0].url;
    }
  }
  // === 兜底扫描：原格式没解析到 → 全字段扫描 ===
  if (!result.imageUrl) {
    console.warn('[玉玉API] 原格式未解析到图片，启动兜底全字段扫描...');
    result.imageUrl = deepScanForImage(response);
  }

  if (!result.imageUrl) {
    console.error('[玉玉API] 兜底扫描也未找到图片:', JSON.stringify(response).substring(0, 500));
    throw new Error("API 未返回图片，请联系管理员");
  }

  console.log('[玉玉API] 解析成功:', result.imageUrl.substring(0, 80));

  // 保存生成结果到后端 TXT 日志（fire-and-forget）
  // 🔧 gpt-image 系列走后端代理 /v1/images/generations，proxy 已自动保存，跳过避免重复记录
  if (!effectiveModel.startsWith('gpt-image-')) {
    const isBase64 = result.imageUrl.startsWith('data:');
    const rawData = isBase64 ? result.imageUrl.split(',')[1] : result.imageUrl;
    fetch('/api/yuli-proxy/log-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: effectiveModel,
        type: isBase64 ? 'b64_json' : 'url',
        data: rawData,
      }),
    }).catch(() => {}); // 静默失败，不影响主流程
  }

  return result;
};

/** 去除模型输出中的思考过程标签（123、124 等） */
export const stripThinkingTags = (text: string): string => {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/123[\s\S]*?123/gi, '')
    .replace(/124[\s\S]*?124/gi, '')
    .trim();
};

// 玉玉API文字处理/图片分析 (Chat Completions)
// 本地版本：直接调用玉玉API
export const chatWithThirdPartyApi = async (
  systemPrompt: string,
  userMessage: string,
  imageFiles?: File[],
  chatModelOverride?: string,
  maxTokens?: number,
  apiConfigOverride?: ThirdPartyApiConfig | null
): Promise<string> => {
  const apiConfig = apiConfigOverride || thirdPartyConfig;
  if (!apiConfig || !apiConfig.enabled) {
    throw new Error("玉玉API未启用");
  }

  // 本地版本：需要前端配置 API Key
  if (!apiConfig.apiKey) {
    throw new Error("请先配置玉玉API Key");
  }
  if (!apiConfig.baseUrl) {
    throw new Error("请先配置玉玉API Base URL");
  }

  // 构建用户消息内容 - 根据API文档格式
  type ContentItem = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
  let userContent: string | ContentItem[];

  if (imageFiles && imageFiles.length > 0) {
    // 分析图片时，content需要是数组格式，支持多张图片
    const imageItems: ContentItem[] = await Promise.all(imageFiles.map(async (file) => {
      const imageBase64 = await fileToBase64(file);
      const imageDataUrl = `data:${file.type};base64,${imageBase64}`;
      return { type: 'image_url' as const, image_url: { url: imageDataUrl } };
    }));
    userContent = [
      { type: 'text', text: userMessage },
      ...imageItems
    ];
  } else {
    userContent = userMessage;
  }
  
  // 画布节点传入的优先，否则用全局配置
  const chatModel = chatModelOverride || apiConfig.chatModel || 'gemini-2.5-pro';
  
  const requestBody: OpenAIChatRequest = {
    model: chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    max_tokens: maxTokens ?? 4096,
    temperature: 0.7,
    stream: false
  };

  // 走后端代理（HTTP/1.1），避免浏览器 HTTP/2 直连 yuli.host 不兼容导致 170s 延迟
  const response = await withRetry(async () => {
    const res = await fetch('/api/yuli-proxy/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiConfig.apiKey,
        baseUrl: apiConfig.baseUrl,
        body: requestBody,
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Chat API 请求失败 (${res.status}): ${errorText}`);
    }
    
    return res.json() as Promise<OpenAIChatResponse>;
  });
  
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content.trim();
  }
  
  throw new Error("Chat API 未返回有效响应");
};

export const editImageWithGemini = async (files: File[], prompt: string, config: ImageEditConfig, creativeIdeaCost?: number, signal?: AbortSignal, modelOverride?: string, apiConfigOverride?: ThirdPartyApiConfig | null): Promise<GeneratedContent> => {
  // 如果启用了玉玉API，使用玉玉API
  const apiConfig = apiConfigOverride || thirdPartyConfig;
  if (apiConfig && apiConfig.enabled) {
    return editImageWithThirdPartyApi(files, prompt, config, creativeIdeaCost, signal, modelOverride, apiConfig);
  }
  
  if (!ai) {
    throw new Error("请先设置 Gemini API Key");
  }
  
  const model = 'gemini-3-pro-image-preview';

  if (!prompt) throw new Error("请输入提示词");

  // 构建内容 - 支持文生图和图生图（支持多图）
  let contents;
  
  if (files.length > 0) {
    // 图生图模式（支持多图）
    const imageParts = await Promise.all(files.map(file => fileToGenerativePart(file)));
    
    // 多图处理：在提示词中标注图片顺序（从上到下连接的顺序 = Image1, Image2, ...）
    let instruction;
    if (files.length > 1) {
      const imageLabels = files.map((_, idx) => `Image${idx + 1}`).join(', ');
      instruction = `请根据以下提示词，参考所有输入图片进行编辑/融合/创作。输入图片按连接顺序标记为：${imageLabels}（从上到下）。只输出结果图片，不要输出任何文字描述。`;
      console.log(`[Gemini多图] 检测到 ${files.length} 张图片，已标注顺序:`, imageLabels);
    } else {
      instruction = '请根据以下提示词编辑图片，只输出结果图片，不要输出任何文字描述。';
    }
    
    const textPart: Part = { text: `${instruction}\n\n${prompt}` };
    contents = {
      parts: [...imageParts, textPart],
    };
  } else {
    // 文生图模式
    const instruction = '请根据以下提示词生成图片，只输出结果图片，不要输出任何文字描述。';
    const textPart: Part = { text: `${instruction}\n\n${prompt}` };
    contents = {
      parts: [textPart],
    };
  }

  // Configure image settings - TypeScript SDK 使用 camelCase
  const imageConfig: any = {
      imageSize: config.imageSize,
      // 注意：outputMimeType 在某些 Gemini API 版本中不支持，由 API 自动决定输出格式
  };
  
  // 处理 Auto 宽高比：图生图模式下不传 aspectRatio，让API根据输入图片尺寸自动生成
  if (config.aspectRatio === 'Auto') {
    if (files.length > 0) {
      // 图生图 + Auto：不传 aspectRatio，让Gemini使用输入图片的原始尺寸
      console.log('[Gemini Auto宽高比] 图生图模式，不指定比例，使用输入图片原始尺寸');
    }
    // 文生图 + Auto：也不指定 aspectRatio，让 Gemini 自动处理
  } else {
    // 用户明确指定了比例
    imageConfig.aspectRatio = config.aspectRatio;
  }

  const response: GenerateContentResponse = await withRetry(() => 
    ai!.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: imageConfig
      },
    })
  );

  const result: GeneratedContent = { text: null, imageUrl: null };

  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.text) {
              result.text = (result.text || "") + part.text;
          } else if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              const mimeType = part.inlineData.mimeType;
              result.imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
              break; 
          }
      }
  }

  if (!result.imageUrl) {
    const responseText = result.text || response.candidates?.[0]?.content?.parts?.map(p => p.text).join(' ') || "No text response.";
    throw new Error("API 未返回图片，可能拒绝了请求。响应: " + responseText);
  }

  return result;
};

// --- BP Agent Logic ---

// 玉玉API的BP Agent任务（分析图片或纯文本）
const runBPAgentTaskWithThirdParty = async (file: File | null, instruction: string): Promise<string> => {
  const systemInstruction = file 
    ? `You are an AI analysis agent. 
Your task is to analyze the image based on the user's specific instruction and extract/generate the relevant information.
Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`
    : `You are an AI creative agent.
Your task is to generate creative content based on the user's instruction.
Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`;

  return chatWithThirdPartyApi(systemInstruction, instruction, file ? [file] : undefined);
};

const runBPAgentTask = async (file: File | null, instruction: string, model: BPAgentModel): Promise<string> => {
    // 如果启用了玉玉API，使用第三方 Chat API
    if (thirdPartyConfig && thirdPartyConfig.enabled) {
        // 本地版本：检查是否有API Key
        if (!thirdPartyConfig.apiKey) {
            throw new Error("请先配置玉玉API Key");
        }
        return runBPAgentTaskWithThirdParty(file, instruction);
    }
    
    // 使用 Gemini API
    if (!ai) throw new Error("请先设置 Gemini API Key 或启用玉玉API");
    
    // 构建内容部分
    const parts: Part[] = [];
    
    // 如果有图片，添加图片部分
    if (file) {
        const imagePart = await fileToGenerativePart(file);
        parts.push(imagePart);
    }
    
    // 添加文本指令
    parts.push({ text: instruction } as Part);

    // 根据是否有图片调整系统指令
    const systemInstruction = file
      ? `You are an AI analysis agent. 
    Your task is to analyze the image based on the user's specific instruction and extract/generate the relevant information.
    Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`
      : `You are an AI creative agent.
    Your task is to generate creative content based on the user's instruction.
    Output Rule: Return ONLY the result string. Do not include labels, markdown, or conversational filler. Keep it concise and suitable for use in an image generation prompt.`;

    const response: GenerateContentResponse = await withRetry(() => 
        ai!.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        })
    );

    const text = response.text;
    if (!text) return "";
    return text.trim();
};

export const processBPTemplate = async (
    file: File | null,
    templateIdea: CreativeIdea,
    userInputs: Record<string, string>
): Promise<string> => {
    console.log('[BP Template] 开始处理:', {
        title: templateIdea.title,
        hasBpFields: !!templateIdea.bpFields,
        fieldsCount: templateIdea.bpFields?.length || 0,
        agentCount: templateIdea.bpFields?.filter(f => f.type === 'agent').length || 0,
        hasFile: !!file,
        userInputs
    });
    
    if (!templateIdea.bpFields || templateIdea.bpFields.length === 0) {
        console.log('[BP Template] 没有bpFields，返回原始提示词');
        return templateIdea.prompt;
    }

    let finalPrompt = templateIdea.prompt;
    const fields = templateIdea.bpFields;
    
    // 构建字段名称到ID的映射
    const nameToId: Record<string, string> = {};
    const nameToField: Record<string, typeof fields[0]> = {};
    fields.forEach(f => {
        nameToId[f.name] = f.id;
        nameToField[f.name] = f;
    });
    
    // 解析Agent指令中的依赖
    const parseDependencies = (instruction: string): { inputs: string[], agents: string[] } => {
        const inputs: string[] = [];
        const agents: string[] = [];
        
        // 匹配 /变量名 (用户输入)
        const inputMatches = instruction.match(/\/([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (inputMatches) {
            inputMatches.forEach(match => {
                const name = match.slice(1); // 移除 /
                if (nameToField[name]?.type === 'input') {
                    inputs.push(name);
                }
            });
        }
        
        // 匹配 {变量名} (Agent结果)
        const agentMatches = instruction.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
        if (agentMatches) {
            agentMatches.forEach(match => {
                const name = match.slice(1, -1); // 移除 { 和 }
                if (nameToField[name]?.type === 'agent') {
                    agents.push(name);
                }
            });
        }
        
        return { inputs, agents };
    };
    
    // 分类Agent：依赖图片的 vs 纯文本分析的
    const agentFields = fields.filter(f => f.type === 'agent');
    const inputFields = fields.filter(f => f.type === 'input');
    
    // 构建依赖图并进行拓扑排序
    const agentDependencies: Record<string, { inputs: string[], agents: string[] }> = {};
    agentFields.forEach(agent => {
        if (agent.agentConfig) {
            agentDependencies[agent.name] = parseDependencies(agent.agentConfig.instruction);
        } else {
            agentDependencies[agent.name] = { inputs: [], agents: [] };
        }
    });
    
    // 拓扑排序：确定Agent执行顺序
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // 用于检测循环依赖
    
    const topologicalSort = (agentName: string): boolean => {
        if (visited.has(agentName)) return true;
        if (visiting.has(agentName)) {
            console.warn(`检测到循环依赖: ${agentName}`);
            return false; // 循环依赖
        }
        
        visiting.add(agentName);
        
        const deps = agentDependencies[agentName];
        if (deps) {
            // 先处理依赖的Agent
            for (const depAgent of deps.agents) {
                if (!topologicalSort(depAgent)) {
                    return false;
                }
            }
        }
        
        visiting.delete(agentName);
        visited.add(agentName);
        executionOrder.push(agentName);
        return true;
    };
    
    // 对所有Agent进行拓扑排序
    for (const agent of agentFields) {
        topologicalSort(agent.name);
    }
    
    // 存储结果
    const agentResults: Record<string, string> = {};
    
    // 按顺序执行Agent
    for (const agentName of executionOrder) {
        const field = nameToField[agentName];
        if (!field || field.type !== 'agent' || !field.agentConfig) continue;
        
        let instruction = field.agentConfig.instruction;
        
        // 替换指令中的用户输入 /Name
        inputFields.forEach(inputField => {
            const val = userInputs[inputField.id] || '';
            instruction = instruction.split(`/${inputField.name}`).join(val);
        });
        
        // 替换指令中已执行Agent的结果 {Name}
        for (const [name, result] of Object.entries(agentResults)) {
            instruction = instruction.split(`{${name}}`).join(result);
        }
        
        // 执行Agent
        try {
            console.log(`[BP Agent] 执行 ${agentName}...`);
            const result = await runBPAgentTask(file, instruction, field.agentConfig.model);
            console.log(`[BP Agent] ${agentName} 完成`);
            agentResults[agentName] = result;
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error(`[BP Agent] ${agentName} 失败`);
            // 显示更详细的错误信息
            agentResults[agentName] = `[Agent错误: ${errorMsg}]`;
        }
    }
    
    // 替换最终模板中的Agent结果 {Name}
    for (const [name, result] of Object.entries(agentResults)) {
        finalPrompt = finalPrompt.split(`{${name}}`).join(result);
    }
    
    // 替换最终模板中的用户输入 /Name
    inputFields.forEach(f => {
        const val = userInputs[f.id] || '';
        finalPrompt = finalPrompt.split(`/${f.name}`).join(val);
    });

    return finalPrompt;
};


// --- Legacy Smart Logic ---

const getSmartSystemInstruction = () => `You are a "Creative Prompt Fusion Specialist." Your goal is to merge a 'Modifier Keyword' into a 'Base Prompt' intelligently.

**Principles:**
1. **Base Prompt is Law**: Preserve the main subject and intent.
2. **Keyword is Adjective**: Treat it as a descriptive layer.
3. **Output**: ONLY the final prompt string. No explanations.`;

const getSmartPlusSystemInstruction = () => `You are a commercial **Art Director**. Synthesize a conceptual brief into a vivid scene description for a high-end product photoshoot.

**Output Rules:**
* Output ONLY the final prompt string.
* Single paragraph.
* Descriptive and professional. No markdown.`;


interface GeneratePromptParams {
    file: File;
    idea: CreativeIdea;
    keyword?: string; // For Smart
    smartPlusConfig?: SmartPlusConfig; // For Smart+
}

export const generateCreativePromptFromImage = async ({
    file,
    idea,
    keyword = '',
    smartPlusConfig,
}: GeneratePromptParams): Promise<string> => {
  // 如果启用了玉玉API，使用玉玉API
  const useThirdParty = thirdPartyConfig && thirdPartyConfig.enabled && thirdPartyConfig.apiKey;
  
  if (!useThirdParty && !ai) {
    throw new Error("请先设置 Gemini API Key 或配置玉玉API");
  }
  
  const model = 'gemini-3-pro-preview';

  if (!file) throw new Error("请上传图片");

  // If BP, use the new processor (should be called directly, but handling here for safety)
  if (idea.isBP) {
      throw new Error("BP Mode should use processBPTemplate directly.");
  }

  let systemInstruction = '';
  let userMessage = '';

  if (idea.isSmartPlus && smartPlusConfig) {
      // Smart+ Mode
      systemInstruction = getSmartPlusSystemInstruction();
      userMessage += `Story Brief:
"""
${idea.prompt}
"""

`;
      if (keyword.trim()) {
          userMessage += `Keywords:
"""
${keyword}
"""

`;
      }
      userMessage += `Key Elements:\n`;
      
      const templateConfig = idea.smartPlusConfig || [];
      
      templateConfig.forEach(templateComponent => {
        if (templateComponent.enabled) {
          const overrideComponent = smartPlusConfig.find(c => c.id === templateComponent.id);
  
          if (overrideComponent && overrideComponent.enabled) {
            const featureText = overrideComponent.features.trim() || 'Describe creatively based on the Story Brief';
            userMessage += `- ${overrideComponent.label}: ${featureText}\n`;
          } else {
            userMessage += `- ${templateComponent.label}: [GENERATE CREATIVELY]\n`;
          }
        }
      });
  } else {
      // Standard Smart Mode (Legacy support or simple mode)
      systemInstruction = getSmartSystemInstruction();
      userMessage += `Base Prompt:
"""
${idea.prompt}
"""

Modifier Keyword:
"""
${keyword}
"""

`;
  }
  
  userMessage += "\n\nNow, based on the provided image and all the rules, generate the final, synthesized prompt.";
  
  // 使用玉玉API进行图片分析
  if (useThirdParty) {
    return chatWithThirdPartyApi(systemInstruction, userMessage, [file]);
  }
  
  // 使用 Gemini API
  const imagePart = await fileToGenerativePart(file);
  const textPart: Part = { text: userMessage };

  const contents = {
    parts: [imagePart, textPart],
  };

  const response: GenerateContentResponse = await withRetry(() => 
    ai!.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    })
  );
  
  const resultText = response.text;

  if (!resultText) {
    throw new Error("API 未返回文本响应");
  }

  return resultText.trim();
};

/**
 * 优化提示词 - 无创意库模式
 * 揥收用户输入的简单描述，让模型揣测意图并扩写成更完整的提示词
 */
export const optimizePrompt = async (userPrompt: string): Promise<string> => {
  // 检查API配置
  const useThirdParty = thirdPartyConfig && thirdPartyConfig.enabled && thirdPartyConfig.apiKey;
  
  if (!useThirdParty && !ai) {
    throw new Error("请先设置 Gemini API Key 或配置玉玉API");
  }
  
  const model = 'gemini-2.0-flash';
  
  const systemInstruction = `You are an expert AI image generation prompt engineer. Your task is to take a user's brief description or keywords and expand them into a detailed, high-quality image generation prompt.

Rules:
1. Understand the user's intent from their brief input
2. Expand the description with relevant details about:
   - Subject details and characteristics
   - Art style and visual aesthetic
   - Lighting and atmosphere
   - Composition and framing
   - Color palette and mood
3. Keep the expanded prompt focused and coherent
4. Output ONLY the optimized prompt text, no explanations
5. The output should be in the same language as the input
6. Keep output concise but descriptive (aim for 50-150 words)`;

  const userMessage = `Please optimize and expand this brief prompt into a detailed image generation prompt:

"""${userPrompt}"""

Output the optimized prompt directly:`;
  
  // 使用玉玉API - 直接复用现有函数，不传图片
  if (useThirdParty) {
    return chatWithThirdPartyApi(systemInstruction, userMessage);
  }
  
  // 使用 Gemini API
  const response: GenerateContentResponse = await withRetry(() => 
    ai!.models.generateContent({
      model: model,
      contents: { parts: [{ text: userMessage }] },
      config: {
        systemInstruction: systemInstruction,
      },
    })
  );
  
  const resultText = response.text;

  if (!resultText) {
    throw new Error("API 未返回文本响应");
  }

  return resultText.trim();
};

/**
 * AI 自动分类 - 根据创意的标题和提示词自动分类
 */
export const autoClassifyCreative = async (title: string, prompt: string): Promise<CreativeCategoryType> => {
  const useThirdParty = thirdPartyConfig && thirdPartyConfig.enabled && thirdPartyConfig.apiKey;
  
  if (!useThirdParty && !ai) {
    throw new Error("请先设置 Gemini API Key 或配置玉玉API");
  }
  
  const validCategories = CREATIVE_CATEGORIES.map(c => c.key).join(', ');
  
  const systemInstruction = `You are a creative content classifier. Your task is to classify creative templates into one of these categories:

${CREATIVE_CATEGORIES.map(c => `- ${c.key}: ${c.label} (${c.icon})`).join('\n')}

Rules:
1. Analyze the title and prompt to determine the main subject
2. character: For portraits, people, characters, figures
3. scene: For landscapes, environments, backgrounds, places
4. product: For commercial products, items, merchandise, food, objects
5. art: For artistic styles, abstract art, paintings, illustrations
6. tool: For utility templates, editing effects, filters, technical tools
7. other: Only use when none of the above fit
8. Output ONLY the category key (one of: ${validCategories}), nothing else`;

  const userMessage = `Classify this creative template:

Title: ${title}
Prompt: ${prompt.slice(0, 500)}${prompt.length > 500 ? '...' : ''}

Category:`;
  
  let result: string;
  
  if (useThirdParty) {
    result = await chatWithThirdPartyApi(systemInstruction, userMessage);
  } else {
    const response: GenerateContentResponse = await withRetry(() => 
      ai!.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ text: userMessage }] },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1, // 低温度确保稳定输出
        },
      })
    );
    result = response.text || '';
  }
  
  // 解析结果，确保返回有效分类
  const cleanResult = result.trim().toLowerCase();
  const validKeys = CREATIVE_CATEGORIES.map(c => c.key);
  
  if (validKeys.includes(cleanResult as CreativeCategoryType)) {
    return cleanResult as CreativeCategoryType;
  }
  
  // 如果返回的不是有效key，尝试模糊匹配
  for (const cat of CREATIVE_CATEGORIES) {
    if (cleanResult.includes(cat.key) || cleanResult.includes(cat.label)) {
      return cat.key;
    }
  }
  
  return 'other';
};
