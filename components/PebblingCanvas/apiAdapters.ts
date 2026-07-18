/**
 * 画布 API 适配器 — 桥接主项目的 geminiService
 * 从 index.tsx 提取的纯工具函数，无 React 依赖。
 */
import { editImageWithGemini, chatWithThirdPartyApi, getThirdPartyConfig, type ImageEditConfig } from '../../services/geminiService';
import type { GenerationConfig, NodeType } from '../../types/pebblingTypes';
import type { ThirdPartyApiConfig } from '../../types';

// 检查API是否已配置（支持玉玉API或原生Gemini）
export const isApiConfigured = (): boolean => {
  const config = getThirdPartyConfig();
  const hasThirdParty = !!(config && config.enabled && config.apiKey);
  const hasGemini = !!localStorage.getItem('gemini_api_key');
  return hasThirdParty || hasGemini;
};

// 根据文件名推断 MIME 类型
export const guessMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
    'gif': 'image/gif', 'bmp': 'image/bmp', 'svg': 'image/svg+xml',
  };
  return mimeMap[ext] || 'image/png';
};

// base64 转 File
export const base64ToFile = async (imageUrl: string, filename: string = 'image.png'): Promise<File> => {
  const mimeType = guessMimeType(filename);
  try {
    if (imageUrl.startsWith('data:image')) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || mimeType });
    }
    if (imageUrl.startsWith('/files/') || imageUrl.startsWith('/api/')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) { resolve(new File([blob], filename, { type: mimeType })); }
            else { reject(new Error('图片转换失败')); }
          }, mimeType);
        };
        img.onerror = () => reject(new Error(`图片加载失败: ${imageUrl.slice(0, 100)}`));
        img.src = imageUrl;
      });
    }
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('//')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) { resolve(new File([blob], filename, { type: mimeType })); }
            else { reject(new Error('图片转换失败')); }
          }, mimeType);
        };
        img.onerror = () => reject(new Error(`图片加载失败(CORS): ${imageUrl.slice(0, 100)}`));
        img.src = imageUrl;
      });
    }
    console.warn('[base64ToFile] 未知格式，尝试直接 fetch:', imageUrl.slice(0, 50));
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
  } catch (error) {
    console.error('[base64ToFile] 转换失败:', error, 'URL:', imageUrl.slice(0, 100));
    throw error;
  }
};

// 生成图片（文生图/图生图）
export const generateCreativeImage = async (
  prompt: string, config?: GenerationConfig, signal?: AbortSignal, modelOverride?: string, apiConfigOverride?: ThirdPartyApiConfig | null
): Promise<string | null> => {
  try {
    const imageConfig: ImageEditConfig = {
      aspectRatio: config?.aspectRatio || '1:1',
      imageSize: config?.resolution || '1K',
      quality: config?.quality,
      moderation: config?.moderation,
    };
    const result = await editImageWithGemini([], prompt, imageConfig, undefined, signal, modelOverride, apiConfigOverride);
    return result.imageUrl;
  } catch (e) {
    if ((e as Error).name === 'AbortError') { console.log('[generateCreativeImage] 生成已被取消'); }
    else { console.error('文生图失败:', e); }
    return null;
  }
};

// 编辑图片（图生图）
export const editCreativeImage = async (
  images: string[], prompt: string, config?: GenerationConfig, signal?: AbortSignal, modelOverride?: string, apiConfigOverride?: ThirdPartyApiConfig | null
): Promise<string | null> => {
  try {
    const files = await Promise.all(images.map(async (img, i) => {
      try { return await base64ToFile(img, `input_${i}.png`); }
      catch (err) { console.error(`[editCreativeImage] 图片 ${i + 1} 转换失败:`, err); throw err; }
    }));
    const validFiles = files.filter(f => f.size > 0);
    const imageConfig: ImageEditConfig = {
      aspectRatio: config?.aspectRatio || 'Auto',
      imageSize: config?.resolution || '1K',
      quality: config?.quality,
      moderation: config?.moderation,
    };
    const result = await editImageWithGemini(validFiles, prompt, imageConfig, undefined, signal, modelOverride, apiConfigOverride);
    return result.imageUrl;
  } catch (e) {
    if ((e as Error).name === 'AbortError') { console.log('[editCreativeImage] 编辑已被取消'); }
    else { console.error('图生图失败:', e); }
    return null;
  }
};

// 生成文本/扩写
export const generateCreativeText = async (content: string): Promise<{ title: string; content: string }> => {
  try {
    const systemPrompt = `You are a creative writing assistant. Expand and enhance the following content into a more detailed and vivid description. Output ONLY the enhanced text, no titles or explanations.`;
    const result = await chatWithThirdPartyApi(systemPrompt, content);
    const lines = result.split('\n').filter(l => l.trim());
    const title = lines[0]?.slice(0, 50) || '扩写内容';
    return { title, content: result };
  } catch (e) { console.error('文本生成失败:', e); return { title: '错误', content: String(e) }; }
};

// LLM文本处理
export const generateAdvancedLLM = async (
  userPrompt: string, systemPrompt?: string, images?: string[], chatModelOverride?: string
): Promise<string> => {
  try {
    const system = systemPrompt || 'You are a helpful assistant.';
    let imageFiles: File[] | undefined;
    if (images && images.length > 0) {
      imageFiles = await Promise.all(images.map((img, i) => base64ToFile(img, `input_${i}.png`)));
    }
    const result = await chatWithThirdPartyApi(system, userPrompt, imageFiles, chatModelOverride);
    return result;
  } catch (e) { console.error('LLM处理失败:', e); return `错误: ${e}`; }
};

// 检查是否是有效的视频数据
export const isValidVideo = (content: string | undefined): boolean => {
  if (!content || content.length < 10) return false;
  return content.startsWith('data:video') || content.startsWith('http://') || content.startsWith('https://')
    || content.startsWith('//') || content.startsWith('/files/');
};

// 检查是否是有效的图片数据
export const isValidImage = (content: string | undefined): boolean => {
  if (!content || content.length < 10) return false;
  return content.startsWith('data:image') || content.startsWith('http://') || content.startsWith('https://')
    || content.startsWith('//') || content.startsWith('/files/') || content.startsWith('/api/');
};

// 吃图节点类型
export const IMAGE_CONSUMING_NODE_TYPES = new Set<NodeType>([
  'image', 'edit', 'remove-bg', 'upscale', 'resize',
  'bp', 'video', 'llm', 'drawing-board',
  'runninghub', 'rh-config', 'rh-main',
  'frame-extractor', 'combine', 'output'
]);

// 三次贝塞尔曲线取点
export function pointOnCubicBezier(
  t: number,
  p0x: number, p0y: number, p1x: number, p1y: number,
  p2x: number, p2y: number, p3x: number, p3y: number
): { x: number; y: number } {
  const u = 1 - t;
  const u2 = u * u, u3 = u2 * u;
  const t2 = t * t, t3 = t2 * t;
  return {
    x: u3 * p0x + 3 * u2 * t * p1x + 3 * u * t2 * p2x + t3 * p3x,
    y: u3 * p0y + 3 * u2 * t * p1y + 3 * u * t2 * p2y + t3 * p3y
  };
}

// 提取图片元数据
export interface ImageMetadata { width: number; height: number; size: string; format: string; }

export const extractImageMetadata = async (imageUrl: string): Promise<ImageMetadata> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      // 格式检测
      let format = 'UNKNOWN';
      if (imageUrl.startsWith('data:image/')) {
        const match = imageUrl.match(/data:image\/(\w+);/);
        format = match ? match[1].toUpperCase() : 'BASE64';
      } else {
        // 从 URL 路径提取扩展名
        const pathPart = imageUrl.split('?')[0];
        const extMatch = pathPart.match(/\.(\w+)$/);
        if (extMatch) {
          format = extMatch[1].toUpperCase();
        } else {
          format = 'PNG'; // 默认生成图片为 PNG
        }
      }

      // 大小计算
      let size = 'Unknown';
      if (imageUrl.startsWith('data:')) {
        const bytes = ((imageUrl.split(',')[1]?.length || 0) * 3) / 4;
        if (bytes < 1024) { size = `${Math.round(bytes)} B`; }
        else if (bytes < 1048576) { size = `${(bytes / 1024).toFixed(1)} KB`; }
        else { size = `${(bytes / 1048576).toFixed(2)} MB`; }
      } else if (imageUrl.startsWith('/files/') || imageUrl.startsWith('http://localhost')) {
        // 本地文件：HEAD 请求安全且快
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const bytes = parseInt(contentLength, 10);
            if (bytes < 1024) { size = `${Math.round(bytes)} B`; }
            else if (bytes < 1048576) { size = `${(bytes / 1024).toFixed(1)} KB`; }
            else { size = `${(bytes / 1048576).toFixed(2)} MB`; }
          }
        } catch {
          // HEAD 失败，保持 Unknown
        }
      } else {
        // 远程 URL（Minio 预签名等）：HEAD 会 403，标记为远程
        size = 'Remote';
      }

      resolve({ width: img.naturalWidth, height: img.naturalHeight, size, format });
    };
    img.onerror = () => resolve({ width: 0, height: 0, size: 'Unknown', format: 'Unknown' });
    img.src = imageUrl;
  });
};
