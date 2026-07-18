import React, { useState } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { getNodeTypeColor } from '../../../types/pebblingTypes';

export const VideoOutputNode = React.memo(function VideoOutputNode(props: NodeRendererProps) {
  const {
    node, isLightCanvas, isRunning,
    onExtractFrame, onCreateFrameExtractor, onRetryVideoDownload,
    mediaMetadata, showMediaInfo, setShowMediaInfo, getAspectRatio } = props;
  const [showToolbox, setShowToolbox] = useState(false);
  const [customFrameTime, setCustomFrameTime] = useState<string>('');
const hasVideo = node.content && (node.content.startsWith('data:video') || node.content.includes('.mp4') || node.content.includes('.webm') || node.content.startsWith('/files/'));
const videoNodeColor = getNodeTypeColor(node.type);

const videoSrc = node.content || '';

return (
    <div className="w-full h-full bg-black rounded-xl overflow-hidden relative">
        {hasVideo ? (
            <>
                <video 
                    src={videoSrc} 
                    controls
                    loop
                    autoPlay
                    muted
                    className="w-full h-full object-contain" 
                />
                
                {/* 状态标签 */}
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded text-[9px] font-bold uppercase backdrop-blur-md bg-white/20 text-white">
                    Video
                </div>
                
                {/* 信息查询按钮 */}
                <div 
                  className="absolute top-2 right-2 z-20"
                  onMouseEnter={() => setShowMediaInfo(true)}
                  onMouseLeave={() => setShowMediaInfo(false)}
                >
                  <div 
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all"
                    title="视频信息"
                  >
                    <Icons.Info size={14} className="text-white/70" />
                  </div>
                  
                  {showMediaInfo && mediaMetadata && (
                    <div 
                      className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-0.5">
                        <div><span className="text-zinc-500">宽度:</span> {mediaMetadata.width} px</div>
                        <div><span className="text-zinc-500">高度:</span> {mediaMetadata.height} px</div>
                        <div><span className="text-zinc-500">比例:</span> {getAspectRatio(mediaMetadata.width, mediaMetadata.height)}</div>
                        {mediaMetadata.duration && <div><span className="text-zinc-500">时长:</span> {mediaMetadata.duration}</div>}
                        <div><span className="text-zinc-500">大小:</span> {mediaMetadata.size}</div>
                        <div><span className="text-zinc-500">格式:</span> {mediaMetadata.format}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 工具箱按钮 */}
                <div className="absolute bottom-6 right-6 z-20">
                  <button
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowToolbox(!showToolbox);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="视频工具"
                  >
                    <Icons.Wrench size={16} className="text-white/70" />
                  </button>
                  
                  {/* 工具球 - 向上弹出 */}
                  {showToolbox && (onExtractFrame || onCreateFrameExtractor) && (
                    <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-2">
                      {/* 帧提取器 - 新增 */}
                      {onCreateFrameExtractor && (
                        <button
                          className="w-8 h-8 rounded-full bg-emerald-500/30 hover:bg-emerald-500/50 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateFrameExtractor(node.id);
                            setShowToolbox(false);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="打开帧提取器"
                          style={{ filter: `drop-shadow(0 0 4px rgb(16, 185, 129))` }}
                        >
                          <Icons.Scissors size={14} className="text-emerald-300" />
                        </button>
                      )}
                      
                      {/* 任意帧提取 */}
                      {onExtractFrame && (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="秒"
                          value={customFrameTime}
                          onChange={(e) => setCustomFrameTime(e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`w-12 h-6 text-[10px] text-center rounded border focus:outline-none ${isLightCanvas ? 'bg-gray-100 text-gray-800 border-gray-300 focus:border-gray-500' : 'bg-white/10 text-zinc-200 border-white/20 focus:border-white/40'}`}
                        />
                        <button
                          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            const time = parseFloat(customFrameTime);
                            if (!isNaN(time) && time >= 0) {
                              onExtractFrame(node.id, time);
                              setShowToolbox(false);
                              setCustomFrameTime('');
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="提取指定时间帧"
                        >
                          <Icons.Scissors size={12} className="text-white" />
                        </button>
                      </div>
                      )}
                      
                      {onExtractFrame && (
                      <>
                      {/* 提取尾帧 */}
                      <button
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtractFrame(node.id, 'last');
                          setShowToolbox(false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="提取尾帧"
                        style={{ filter: `drop-shadow(0 0 4px ${videoNodeColor.light})` }}
                      >
                        <Icons.Image size={14} className="text-white" />
                      </button>
                      
                      {/* 提取首帧 */}
                      <button
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtractFrame(node.id, 'first');
                          setShowToolbox(false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="提取首帧"
                        style={{ filter: `drop-shadow(0 0 4px ${videoNodeColor.light})` }}
                      >
                        <Icons.Play size={14} className="text-white" />
                      </button>
                      </>
                      )}
                    </div>
                  )}
                </div>
            </>
        ) : node.status === 'error' ? (
            // 错误状态 - 提供重试和打开原始URL的选项
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-red-950/30 border-2 border-red-500/50 rounded-xl p-4">
                <Icons.Close size={24} className="text-red-400" />
                <span className="text-[11px] text-red-400 font-medium">生成失败</span>
                {node.data?.videoFailReason && (
                    <span className="text-[9px] text-red-400/70 text-center px-2 max-w-full break-words">
                        {node.data.videoFailReason.length > 80 
                            ? node.data.videoFailReason.slice(0, 80) + '...' 
                            : node.data.videoFailReason}
                    </span>
                )}
                {/* 操作按钮 */}
                <div className="flex gap-2 mt-1">
                    {/* 重试下载按钮 */}
                    {node.data?.videoUrl && onRetryVideoDownload && (
                        <button
                            className="px-3 py-1.5 text-[10px] font-medium bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-colors flex items-center gap-1.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRetryVideoDownload(node.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <Icons.Refresh size={12} />
                            重试下载
                        </button>
                    )}
                    {/* 在新标签页打开原始URL */}
                    {node.data?.videoUrl && (
                        <button
                            className="px-3 py-1.5 text-[10px] font-medium bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors flex items-center gap-1.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(node.data?.videoUrl, '_blank');
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <Icons.ExternalLink size={12} />
                            打开链接
                        </button>
                    )}
                </div>
            </div>
        ) : (
            // Loading 状态
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-900/50">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-[10px] text-zinc-500">等待视频生成...</span>
                {node.data?.videoTaskStatus && (
                    <span className="text-[9px] text-zinc-600">
                        {node.data.videoTaskStatus === 'PENDING' && '任务排队中...'}
                        {node.data.videoTaskStatus === 'RUNNING' && `生成中 ${node.data.videoProgress || 0}%`}
                    </span>
                )}
            </div>
        )}
        
        {isRunning && (
            <SpinnerOverlay size="lg" zIndex="z-30" />
        )}
    </div>
);
});
