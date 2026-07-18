import React, { useState } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { getNodeTypeColor } from '../../../types/pebblingTypes';
import { getThumbnailUrl } from '../../../utils/image';
import ContextMenu from '../ContextMenu';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const getAspectRatio = (w: number, h: number): string => {
  if (!w || !h) return '—';
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
};

interface ImageMeta { width: number; height: number; size: string; format: string; }

// 与 CanvasNode.tsx 完全一致的元数据计算逻辑
const fetchImageMetadata = (resolvedUrl: string): Promise<ImageMeta> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      let size = '未知';
      if (resolvedUrl.startsWith('data:')) {
        const base64str = resolvedUrl.split(',')[1] || '';
        const sizeBytes = (base64str.length * 3) / 4;
        if (sizeBytes > 1024 * 1024) { size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`; }
        else { size = `${(sizeBytes / 1024).toFixed(1)} KB`; }
      } else if (resolvedUrl.startsWith('/files/') || resolvedUrl.startsWith('http://localhost')) {
        // 本地文件：HEAD 请求安全且快
        try {
          const response = await fetch(resolvedUrl, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const sizeBytes = parseInt(contentLength, 10);
            if (sizeBytes > 1024 * 1024) { size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`; }
            else { size = `${(sizeBytes / 1024).toFixed(1)} KB`; }
          }
        } catch { /* HEAD 失败保持未知 */ }
      } else {
        // 远程 URL（Minio 预签名等）：HEAD 会 403，直接 GET blob 获取大小
        try {
          const getResp = await fetch(resolvedUrl);
          const blob = await getResp.blob();
          if (blob.size > 1024 * 1024) { size = `${(blob.size / (1024 * 1024)).toFixed(2)} MB`; }
          else { size = `${(blob.size / 1024).toFixed(1)} KB`; }
        } catch { /* 获取失败，保持未知 */ }
      }

      // 格式
      let format = '未知';
      if (resolvedUrl.includes('data:image/png') || resolvedUrl.includes('.png')) format = 'PNG';
      else if (resolvedUrl.includes('data:image/jpeg') || resolvedUrl.includes('data:image/jpg') || resolvedUrl.includes('.jpg') || resolvedUrl.includes('.jpeg')) format = 'JPEG';
      else if (resolvedUrl.includes('data:image/webp') || resolvedUrl.includes('.webp')) format = 'WebP';
      else if (resolvedUrl.includes('data:image/gif') || resolvedUrl.includes('.gif')) format = 'GIF';
      else format = 'JPEG';

      resolve({ width, height, size, format });
    };
    img.onerror = () => resolve({ width: 0, height: 0, size: '未知', format: '未知' });
    img.src = resolvedUrl;
  });
};

export const OutputNode = React.memo(function OutputNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onImageContextMenu, onPreviewImage } = props;

  const isVideo = node.data?.outputType === 'video';
  const outputImages: string[] = node.data?.outputImages || [];
  const hasImages = outputImages.some(u => u !== '__pending__');
  const nodeColor = getNodeTypeColor('output');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; imageUrl: string; idx: number;
  } | null>(null);

  const [infoIdx, setInfoIdx] = useState<number | null>(null);
  const [metadataCache, setMetadataCache] = useState<Record<number, ImageMeta>>({});

  const statusLabel = node.data?.cascadeProgress
    || (hasImages ? `${outputImages.length}` : (isVideo ? 'VIDEO' : 'IMAGE'));

  const resolveUrl = (url: string) => {
    if (url.startsWith('/files/')) return `http://localhost:8765${url}`;
    return url;
  };

  // Grid 显示用缩略图 — 与桌面 DesktopItem 共用同一套 getThumbnailUrl
  const resolveThumbUrl = (url: string) => {
    // 非本地文件：直接返回原 URL（getThumbnailUrl 对远程/Base64 URL 返回原值）
    if (!url.startsWith('/files/')) return resolveUrl(url);
    return getThumbnailUrl(url);
  };

  const handleContextMenu = (e: React.MouseEvent, imgUrl: string, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, imageUrl: imgUrl, idx });
  };

  const handleInfoHover = (idx: number, imgUrl: string) => {
    setInfoIdx(idx);
    if (!metadataCache[idx]) {
      fetchImageMetadata(resolveUrl(imgUrl)).then(meta => {
        setMetadataCache(prev => ({ ...prev, [idx]: meta }));
      });
    }
  };

  const handleDownload = async (imgUrl: string, idx: number) => {
    try {
      const url = resolveUrl(imgUrl);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `output-${idx + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { window.open(resolveUrl(imgUrl), '_blank'); }
  };

  const handleCopy = async (imgUrl: string) => {
    try {
      const url = resolveUrl(imgUrl);
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
    } catch {
      try { await navigator.clipboard.writeText(resolveUrl(imgUrl)); } catch { /* ignore */ }
    }
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden shadow-lg"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
      <div className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
        <div className="flex items-center gap-2">
          <Icons.Image size={12} style={{ color: nodeColor.primary }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>
            {node.title || 'OUTPUT'}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
          style={{ color: nodeColor.primary, backgroundColor: `${nodeColor.primary}20` }}>
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5" style={{ backgroundColor: themeColors.nodeBg }}>
        <div className="grid gap-2.5 h-full"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gridAutoRows: 'minmax(120px, auto)', alignContent: 'start' }}>
          {outputImages.map((imgUrl, idx) => {
            const isPending = imgUrl === '__pending__';
            const isErrorPending = isPending && node.status === 'error';
            const meta = metadataCache[idx];
            return (
              <div
                key={`out-${idx}`}
                className="relative cursor-pointer group/img"
                style={{ aspectRatio: '1', overflow: 'visible', minHeight: isPending ? 80 : 120, contentVisibility: 'auto', containIntrinsicSize: '120px' }}
                onMouseEnter={() => !isPending && setHoveredIdx(idx)}
                onMouseLeave={() => { setHoveredIdx(null); setInfoIdx(null); }}
                onContextMenu={(e) => !isPending && handleContextMenu(e, imgUrl, idx)}
              >
                <div className="absolute inset-0 rounded-2xl overflow-hidden border"
                  style={{ borderColor: isLightCanvas ? '#e2e8f0' : 'rgba(255,255,255,0.1)', backgroundColor: isLightCanvas ? '#f8fafc' : '#0f172a' }}>
                  {isPending ? (
                    isErrorPending ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 text-center">
                      <div className="w-7 h-7 rounded-full border flex items-center justify-center text-[12px] font-bold"
                        style={{ borderColor: isLightCanvas ? '#fecaca' : '#7f1d1d', color: isLightCanvas ? '#b91c1c' : '#fca5a5', backgroundColor: isLightCanvas ? '#fef2f2' : 'rgba(127,29,29,0.28)' }}>
                        !
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: isLightCanvas ? '#991b1b' : '#fecaca' }}>
                        生成失败
                      </div>
                    </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full animate-spin"
                          style={{ border: '3px solid', borderColor: isLightCanvas ? '#e2e8f0' : '#334155', borderTopColor: isLightCanvas ? '#94a3b8' : '#cbd5e1' }} />
                      </div>
                    )
                  ) : (
                    <>
                      <img src={resolveThumbUrl(imgUrl)} alt={`Output ${idx + 1}`}
                        className="w-full h-full object-contain" draggable={false} loading="lazy"
                        onError={(e) => { const t = e.target as HTMLImageElement; if (t.src !== resolveUrl(imgUrl)) t.src = resolveUrl(imgUrl); }} />
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[10px] font-bold text-white/80 z-10">
                        {idx + 1}
                      </div>
                      {hoveredIdx === idx && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                          <span className="text-white text-xs font-bold">#{idx + 1}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 图片信息 — 完全参照 ImageNode 实现 */}
                {!isPending && (
                  <div
                    className="absolute top-1.5 right-1.5 z-20"
                    onMouseEnter={(e) => { e.stopPropagation(); handleInfoHover(idx, imgUrl); }}
                    onMouseLeave={(e) => { e.stopPropagation(); setInfoIdx(null); }}
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all"
                      title="图片信息"
                    >
                      <Icons.Info size={14} className="text-white/70" />
                    </div>
                    {infoIdx === idx && meta && (
                      <div
                        className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-0.5">
                          <div><span className="text-zinc-500">宽度:</span> {meta.width} px</div>
                          <div><span className="text-zinc-500">高度:</span> {meta.height} px</div>
                          <div><span className="text-zinc-500">比例:</span> {getAspectRatio(meta.width, meta.height)}</div>
                          <div><span className="text-zinc-500">大小:</span> {meta.size}</div>
                          <div><span className="text-zinc-500">格式:</span> {meta.format}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-6 border-t px-3 flex items-center justify-between text-[10px] shrink-0"
        style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted,
          backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
        <span>{hasImages ? `${outputImages.length} 张${isVideo ? '视频' : '图片'}` : '就绪'}</span>
        <span>
          {node.status === 'completed' && <span className="text-green-500">✓</span>}
          {node.status === 'running' && <span className="text-blue-400">⏳</span>}
          {node.status === 'error' && <span className="text-red-400">✗</span>}
          {node.status === 'idle' && <span className="text-zinc-500">○</span>}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          isLight={isLightCanvas}
          options={[
            { label: '预览', icon: <Icons.Eye />, action: () => onPreviewImage?.(resolveUrl(contextMenu.imageUrl)) },
            { label: '编辑', icon: <Icons.Edit />, action: () => onImageContextMenu?.('edit', contextMenu.imageUrl, contextMenu.idx, node.id) },
            { label: '添加到桌面', icon: <Icons.Layers />, action: () => onImageContextMenu?.('addToDesktop', contextMenu.imageUrl, contextMenu.idx, node.id) },
            { label: '下载', icon: <Icons.Download />, action: () => handleDownload(contextMenu.imageUrl, contextMenu.idx) },
            { label: '复制', icon: <Icons.Copy />, action: () => handleCopy(contextMenu.imageUrl) },
          ]}
        />
      )}
    </div>
  );
});
