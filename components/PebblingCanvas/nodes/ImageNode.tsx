import React, { useState } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { getNodeTypeColor } from '../../../types/pebblingTypes';

export const ImageNode = React.memo(function ImageNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText, footerBarBg, inputBaseClass,
    imageModels, chatModels, videoModels, showRunningIndicator,
    onDownload, onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload, onDragStart,
    hasDownstream, nodeRef, fileInputRef, folderInputRef, onSelect, onStop,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload,
    mediaMetadata, showMediaInfo, setShowMediaInfo, getAspectRatio, onClearImage } = props;
  const [showToolbox, setShowToolbox] = useState(false);

  // 文件夹文件
  const folderFiles = node.data?.files || [];
  const hasFolder = folderFiles.length > 0;

  // 文件夹上传处理
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
      const readers = fileList.map(file => new Promise<{ name: string; type: string; data: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            name: file.name,
            type: file.type,
            data: ev.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      }));

      Promise.all(readers).then(files => {
        onUpdate(node.id, {
          data: { ...node.data, files },
          content: `${files.length} 个文件`,
          status: 'completed'
        });
      });
    }
    // reset input value
    if (e.target) e.target.value = '';
  };

  const handleClearFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(node.id, {
      data: { ...node.data, files: undefined },
      content: '',
      status: 'idle'
    });
  };
      // 检查媒体类型（图片 / 视频 / 音频）
      const isImage = node.content && (
		node.content.startsWith('data:image') ||
		(!node.content.startsWith('data:video') && !node.content.startsWith('data:audio') && (
		  node.content.startsWith('http://') ||
		  node.content.startsWith('https://') ||
		  node.content.startsWith('/files/') ||
		  node.content.startsWith('/api/')
		))
      );
      const isVideo = node.content && (
		node.content.startsWith('data:video') ||
		(node.content.startsWith('http') && (node.content.endsWith('.mp4') || node.content.endsWith('.webm') || node.content.endsWith('.mov'))) ||
		(node.content.startsWith('/files/') && (node.content.endsWith('.mp4') || node.content.endsWith('.webm') || node.content.endsWith('.mov')))
      );
      const isAudio = node.content && (
		node.content.startsWith('data:audio') ||
		(node.content.startsWith('http') && (node.content.endsWith('.mp3') || node.content.endsWith('.wav') || node.content.endsWith('.ogg'))) ||
		(node.content.startsWith('/files/') && (node.content.endsWith('.mp3') || node.content.endsWith('.wav') || node.content.endsWith('.ogg')))
      );
      const hasMedia = isImage || isVideo || isAudio || hasFolder;
      const mediaLabel = hasFolder ? `文件夹 (${folderFiles.length})` : (isVideo ? 'Video' : (isAudio ? 'Audio' : 'Image'));
      const nodeColor = getNodeTypeColor(node.type);

      return (
		<div
		  className={`w-full h-full relative group flex flex-col overflow-hidden rounded-xl ${!hasMedia ? 'border-2 border-dashed' : ''}`}
		  style={{
		    backgroundColor: !hasMedia ? themeColors.nodeBg : (hasFolder ? themeColors.nodeBg : '#000000'),
		    borderColor: !hasMedia ? themeColors.inputBorder : (hasFolder ? themeColors.inputBorder : 'transparent')
		  }}
		>
		   {!hasMedia ? (
		       // 空状态：显示上传按钮
		       <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: themeColors.textMuted }}>
		           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLightCanvas ? 'bg-gray-100' : 'bg-white/5'}`}>
		              <Icons.Image size={18} className={isLightCanvas ? 'text-gray-400' : 'text-zinc-500'} />
		           </div>
		           <div className={`text-[9px] font-medium uppercase tracking-widest text-center ${isLightCanvas ? 'text-gray-500' : 'text-zinc-600'}`}>
		               上传媒体或连接上游
		           </div>
		           <div className="flex items-center gap-2">
		             <button
		               className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 border border-blue-500/20 transition-colors"
		               onClick={() => fileInputRef.current?.click()}
		               onMouseDown={(e) => e.stopPropagation()}
		             >
		                 <Icons.Upload size={10} /> 上传
		             </button>
		             <button
		               className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20 transition-colors"
		               onClick={() => folderInputRef?.current?.click()}
		               onMouseDown={(e) => e.stopPropagation()}
		             >
		                 <Icons.Layers size={10} /> 文件夹
		             </button>
		           </div>
		           <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
		           <input type="file" ref={folderInputRef as React.RefObject<HTMLInputElement>} className="hidden" /* @ts-ignore */ webkitdirectory="" multiple accept="image/*,video/*,audio/*" onChange={handleFolderUpload} />
		       </div>
		   ) : hasFolder ? (
		     <div className="absolute inset-0 flex flex-col overflow-hidden">
		       <div className="flex-1 overflow-y-auto p-2">
		         <div className="grid grid-cols-3 gap-1">
		           {folderFiles.slice(0, 12).map((file, i) => (
		             <div key={i} className="aspect-square rounded overflow-hidden bg-black/30 flex items-center justify-center"
		               style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
		               {file.type.startsWith('image/') ? (
		                 <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
		               ) : (
		                 <div className="text-[8px] text-zinc-500 text-center px-1">{file.name.slice(-8)}</div>
		               )}
		             </div>
		           ))}
		           {folderFiles.length > 12 && (
		             <div className="aspect-square rounded overflow-hidden bg-black/20 flex items-center justify-center"
		               style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
		               <span className="text-[9px] text-zinc-400">+{folderFiles.length - 12}</span>
		             </div>
		           )}
		         </div>
		       </div>
		       <div className="px-2 py-1 border-t flex items-center justify-between text-[9px]"
		         style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
		         <span style={{ color: '#6ee7b7' }}>{folderFiles.length} 个文件</span>
		         <button
		           className="text-red-400 hover:text-red-300 transition-colors"
		           onClick={handleClearFolder}
		           onMouseDown={(e) => e.stopPropagation()}
		         >
		           清空文件夹
		         </button>
		       </div>
		     </div>
		   ) : (
		     // 有媒体状态：根据类型显示不同播放器
		     <>
		        <div className="absolute inset-0 bg-zinc-900 z-0" />
		        {isVideo ? (
		          <video
		            src={node.content}
		            controls
		            className="relative z-10 w-full h-full object-contain"
		            style={{
		                transform: 'translateZ(0)',
		                willChange: 'transform',
		                backfaceVisibility: 'hidden',
		                WebkitBackfaceVisibility: 'hidden',
		            } as React.CSSProperties}
		          />
		        ) : isAudio ? (
		          <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
		            <audio
		              src={node.content}
		              controls
		              className="w-full max-w-md"
		            />
		          </div>
		        ) : (
		          <img
		            src={node.content}
		            alt="Image"
		            className="relative z-10 w-full h-full object-contain select-none pointer-events-none"
		            draggable={false}
		            style={{
		                imageRendering: 'auto',
		                transform: 'translateZ(0)',
		                willChange: 'transform',
		                backfaceVisibility: 'hidden',
		                WebkitBackfaceVisibility: 'hidden',
		            } as React.CSSProperties}
		          />
		        )}

		        {/* 信息查询按钮 - 移动到右上角 */}
		        {isImage && (
		        <div
		          className="absolute top-2 right-2 z-20"
		          onMouseEnter={() => setShowMediaInfo(true)}
		          onMouseLeave={() => setShowMediaInfo(false)}
		        >
		          <div
		            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all"
		            title="媒体信息"
		          >
		            <Icons.Info size={14} className="text-white/70" />
		          </div>

		          {/* 信息浮窗 - 从右侧弹出 */}
		          {showMediaInfo && mediaMetadata && (
		            <div
		              className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg"
		              onMouseDown={(e) => e.stopPropagation()}
		            >
		              <div className="space-y-0.5">
		                <div><span className="text-zinc-500">宽度:</span> {mediaMetadata.width} px</div>
		                <div><span className="text-zinc-500">高度:</span> {mediaMetadata.height} px</div>
		                <div><span className="text-zinc-500">比例:</span> {getAspectRatio(mediaMetadata.width, mediaMetadata.height)}</div>
		                <div><span className="text-zinc-500">大小:</span> {mediaMetadata.size}</div>
		                <div><span className="text-zinc-500">格式:</span> {mediaMetadata.format}</div>
		              </div>
		            </div>
		          )}
		        </div>
		        )}

		        {/* 工具箱按钮 — 仅图片可用（视频/音频无对应工具） */}
		        {isImage && (
		        <div className="absolute bottom-6 right-6 z-20">
		          <button
		            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all"
		            onClick={(e) => {
		              e.stopPropagation();
		              setShowToolbox(!showToolbox);
		            }}
		            onMouseDown={(e) => e.stopPropagation()}
		            title="工具箱"
		          >
		            <Icons.Wrench size={16} className="text-white/70" />
		          </button>

		          {/* 工具球 - 向上弹出 */}
		          {showToolbox && onCreateToolNode && (
		            <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-2">
		              {/* 高清 */}
		              <button
		                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
		                onClick={(e) => {
		                  e.stopPropagation();
		                  onCreateToolNode(node.id, 'upscale', { x: node.x + node.width + 100, y: node.y });
		                  setShowToolbox(false);
		                }}
		                onMouseDown={(e) => e.stopPropagation()}
		                title="高清化"
		                style={{ filter: `drop-shadow(0 0 4px ${nodeColor.light})` }}
		              >
		                <Icons.Sparkles size={14} className="text-white" />
		              </button>

		              {/* 提取主体 */}
		              <button
		                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
		                onClick={(e) => {
		                  e.stopPropagation();
		                  onCreateToolNode(node.id, 'remove-bg', { x: node.x + node.width + 100, y: node.y });
		                  setShowToolbox(false);
		                }}
		                onMouseDown={(e) => e.stopPropagation()}
		                title="移除背景"
		                style={{ filter: `drop-shadow(0 0 4px ${nodeColor.light})` }}
		              >
		                <Icons.Scissors size={14} className="text-white" />
		              </button>

		              {/* 扩图 */}
		              <button
		                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110"
		                onClick={(e) => {
		                  e.stopPropagation();
		                  onCreateToolNode(node.id, 'edit', { x: node.x + node.width + 100, y: node.y });
		                  setShowToolbox(false);
		                }}
		                onMouseDown={(e) => e.stopPropagation()}
		                title="扩展图片"
		                style={{ filter: `drop-shadow(0 0 4px ${nodeColor.light})` }}
		              >
		                <Icons.Expand size={14} className="text-white" />
		              </button>
		            </div>
		          )}
		        </div>
		        )}
		     </>
		   )}
		   {/* 状态标签 - 保持在左上角 */}
		   <div
		     className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded text-[9px] font-bold uppercase backdrop-blur-md"
		     style={{
		       backgroundColor: hasMedia ? `${nodeColor.primary}40` : (isLightCanvas ? 'rgb(229, 231, 235)' : 'rgb(39, 39, 42)'),
		       color: hasMedia ? nodeColor.light : (isLightCanvas ? 'rgb(75, 85, 99)' : 'rgb(113, 113, 122)')
		     }}
		   >
		       {mediaLabel}
		   </div>
		   {/* 清除媒体按钮 — 仅在有媒体时 hover 显示 */}
		   {hasMedia && (
		     <button
		       className="absolute top-2 z-20 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center
		         opacity-0 group-hover:opacity-100 transition-opacity"
		       style={{ left: '3.5rem' }}
		       onClick={(e) => { e.stopPropagation(); onClearImage?.(node.id); }}
		       onMouseDown={(e) => e.stopPropagation()}
		       title="清除媒体"
		     >
		       <Icons.Close size={10} color="white" />
		     </button>
		   )}
		   {isRunning && (
		        <SpinnerOverlay size="lg" zIndex="z-30" />
		    )}
		</div>
		      );
		});
