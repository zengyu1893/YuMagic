/**
 * 画布工具函数 — 从 PebblingCanvas/index.tsx 提取的纯函数。
 * 不依赖任何组件状态或 React hooks。
 */

/** 生成简短唯一 ID */
export const uuid = () => Math.random().toString(36).substr(2, 9);

/**
 * 客户端图片缩放（Canvas API）。
 * 支持多种缩放模式：exact / width / height / longest / shortest。
 */
export const resizeImageClient = (
  base64Str: string,
  mode: 'longest' | 'shortest' | 'width' | 'height' | 'exact',
  widthVal: number,
  heightVal: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let currentW = img.width;
      let currentH = img.height;
      let newWidth = currentW;
      let newHeight = currentH;
      const aspectRatio = currentW / currentH;

      if (mode === 'exact') {
        newWidth = widthVal;
        newHeight = heightVal;
      } else if (mode === 'width') {
        newWidth = widthVal;
        newHeight = widthVal / aspectRatio;
      } else if (mode === 'height') {
        newHeight = heightVal;
        newWidth = heightVal * aspectRatio;
      } else if (mode === 'longest') {
        const target = widthVal;
        if (currentW > currentH) {
          newWidth = target;
          newHeight = target / aspectRatio;
        } else {
          newHeight = target;
          newWidth = target * aspectRatio;
        }
      } else if (mode === 'shortest') {
        const target = widthVal;
        if (currentW < currentH) {
          newWidth = target;
          newHeight = target / aspectRatio;
        } else {
          newHeight = target;
          newWidth = target * aspectRatio;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        resolve(canvas.toDataURL(
          base64Str.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          0.92,
        ));
      } else {
        reject('Canvas context error');
      }
    };
    img.onerror = reject;
    img.src = base64Str;
  });
};
