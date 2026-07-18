import React, { useState, useRef, useEffect } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';

export const FrameExtractorNode = React.memo(function FrameExtractorNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText, footerBarBg, inputBaseClass,
    imageModels, chatModels, videoModels, showRunningIndicator,
    onDownload, onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload, onDragStart,
    hasDownstream, nodeRef, fileInputRef, onSelect, onStop,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload } = props;
const videoUrl = node.data?.sourceVideoUrl || node.content || '';
const currentTime = node.data?.currentFrameTime ?? 0;
const duration = node.data?.videoDuration ?? 10;
const thumbnails = node.data?.frameThumbnails || [];
const videoRef = useRef<HTMLVideoElement>(null);
const [isPlaying, setIsPlaying] = useState(false);
const [localTime, setLocalTime] = useState(currentTime);
const [previewFrame, setPreviewFrame] = useState<string>('');
const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(thumbnails.length === 0);

// 处理视频 URL
let fullVideoUrl = videoUrl;
if (videoUrl.startsWith('/files/')) {
    fullVideoUrl = `http://localhost:8765${videoUrl}`;
}

// 生成缩略图
useEffect(() => {
    if (thumbnails.length > 0 || !videoUrl) return;
    
    const generateThumbnails = async () => {
        setIsLoadingThumbnails(true);
        try {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = fullVideoUrl;
            
            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = reject;
                video.load();
            });
            
            const dur = video.duration;
            const thumbCount = Math.min(12, Math.max(6, Math.floor(dur)));
            const interval = dur / thumbCount;
            const newThumbnails: string[] = [];
            
            for (let i = 0; i < thumbCount; i++) {
                const time = i * interval;
                await new Promise<void>((resolve) => {
                    video.onseeked = () => resolve();
                    video.currentTime = time;
                });
                
                const canvas = document.createElement('canvas');
                canvas.width = 80;
                canvas.height = 45;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, 80, 45);
                    newThumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
                }
            }
            
            onUpdate(node.id, {
                data: {
                    ...node.data,
                    frameThumbnails: newThumbnails,
                    videoDuration: dur
                }
            });
        } catch (err) {
            console.error('生成缩略图失败:', err);
        } finally {
            setIsLoadingThumbnails(false);
        }
    };
    
    generateThumbnails();
}, [videoUrl, thumbnails.length]);

// 播放/暂停
const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
        videoRef.current.pause();
    } else {
        videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
};

// 更新当前时间
const handleTimeUpdate = () => {
    if (videoRef.current) {
        setLocalTime(videoRef.current.currentTime);
    }
};

// 点击缩略图跳转
const handleThumbnailClick = (index: number) => {
    if (!videoRef.current || thumbnails.length === 0) return;
    const time = (index / thumbnails.length) * duration;
    videoRef.current.currentTime = time;
    setLocalTime(time);
    onUpdate(node.id, { data: { ...node.data, currentFrameTime: time } });
};

// 提取当前帧
const extractCurrentFrame = () => {
    if (onExtractFrameFromExtractor) {
        onExtractFrameFromExtractor(node.id, localTime);
    }
};

// 格式化时间
const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

return (
    <div className="w-full h-full rounded-xl overflow-hidden relative flex flex-col" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
        {/* 标题栏 */}
        <div className="h-8 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
            <div className="flex items-center gap-2">
                <Icons.Scissors size={14} style={{ color: themeColors.textSecondary }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>帧提取器</span>
            </div>
            <span className="text-[9px] font-mono" style={{ color: themeColors.textMuted }}>{formatTime(localTime)} / {formatTime(duration)}</span>
        </div>
        
        {/* 视频预览区 */}
        <div className="flex-1 relative bg-black min-h-0">
            <video
                ref={videoRef}
                src={fullVideoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (!node.data?.videoDuration) {
                        onUpdate(node.id, { data: { ...node.data, videoDuration: v.duration } });
                    }
                }}
                onEnded={() => setIsPlaying(false)}
            />
            
            {/* 播放按钮覆盖层 */}
            <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {!isPlaying && (
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all">
                        <Icons.Play size={24} className="text-white ml-1" />
                    </div>
                )}
            </div>
        </div>
        
        {/* 底部工具栏 */}
        <div className="shrink-0 bg-[#0f0f14] border-t border-white/10 p-2">
            {/* 控制按钮 */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={isPlaying ? '暂停' : '播放'}
                >
                    {isPlaying ? <Icons.Pause size={16} className="text-white" /> : <Icons.Play size={16} className="text-white ml-0.5" />}
                </button>
                
                <button
                    className="flex-1 h-8 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 flex items-center justify-center gap-2 transition-all border border-emerald-500/30"
                    onClick={(e) => { e.stopPropagation(); extractCurrentFrame(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="提取当前帧"
                >
                    <Icons.Camera size={14} className="text-emerald-300" />
                    <span className="text-[11px] text-emerald-200 font-medium">提取此帧</span>
                </button>
            </div>
            
            {/* 帧缩略图时间线 */}
            <div className="relative">
                {isLoadingThumbnails ? (
                    <div className="h-12 flex items-center justify-center bg-black/30 rounded-lg">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="ml-2 text-[10px] text-zinc-500">生成缩略图...</span>
                    </div>
                ) : (
                    <div 
                        className="flex gap-0.5 overflow-x-auto scrollbar-hide rounded-lg"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {thumbnails.map((thumb, idx) => {
                            const thumbTime = (idx / thumbnails.length) * duration;
                            const isActive = Math.abs(thumbTime - localTime) < (duration / thumbnails.length / 2);
                            return (
                                <div
                                    key={idx}
                                    className={`shrink-0 cursor-pointer transition-all rounded overflow-hidden ${isActive ? 'ring-2 ring-emerald-400 scale-105 z-10' : 'opacity-70 hover:opacity-100'}`}
                                    onClick={(e) => { e.stopPropagation(); handleThumbnailClick(idx); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title={formatTime(thumbTime)}
                                >
                                    <img src={thumb} alt={`帧 ${idx + 1}`} className="w-16 h-9 object-cover" draggable={false} />
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* 时间进度指示器 */}
                {thumbnails.length > 0 && (
                    <div 
                        className="absolute top-0 h-full w-0.5 bg-emerald-400 pointer-events-none transition-all"
                        style={{ left: `${(localTime / duration) * 100}%` }}
                    />
                )}
            </div>
        </div>
    </div>
);
});
