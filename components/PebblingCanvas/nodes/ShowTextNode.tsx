import React from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';

export const ShowTextNode = React.memo(function ShowTextNode(props: NodeRendererProps) {
  const {
    node, themeColors, isLightCanvas,
    inputBaseClass, footerBarBg,
    isRunning, showRunningIndicator,
    onDelete, onDownload, onExecute, onStop,
    onStartConnection, onEndConnection, onDragStart,
    onSelect,
    hasDownstream, incomingConnections,
    nodeRef, fileInputRef,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload,
    imageModels, chatModels, videoModels,
    mediaMetadata, showMediaInfo, setShowMediaInfo, getAspectRatio,
  } = props;

  const content = props.autoResolvedContent || node.content || '';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl shadow-lg relative"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.3)'}` }}>
      {/* 标题栏 */}
      <div className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{
          borderBottom: `1px solid ${isLightCanvas ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.2)'}`,
          backgroundColor: isLightCanvas ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.1)',
        }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icons.Eye size={12} className="flex-shrink-0" style={{ color: isLightCanvas ? '#9333ea' : '#d8b4fe' }} />
          <span className="text-[10px] font-bold truncate max-w-[200px]"
            style={{ color: isLightCanvas ? '#7e22ce' : '#e9d5ff' }}>
            {node.title || '展示文本'}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded"
          style={{
            color: isLightCanvas ? '#7e22ce' : 'rgba(216,180,254,0.6)',
            backgroundColor: isLightCanvas ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.2)',
          }}>
          VIEW
        </span>
      </div>

      {/* 展示区 — 纯展示，不可编辑 */}
      <div
        className="flex-1 p-4 overflow-y-auto scrollbar-hide flex flex-col"
        onWheel={(e) => e.stopPropagation()}
      >
        <p
          className="text-base whitespace-pre-wrap leading-relaxed flex-1 font-medium select-text"
          style={{ color: isLightCanvas ? '#1f2937' : '#e4e4e7' }}
        >
          {content || (
            <span style={{ color: isLightCanvas ? '#9ca3af' : '#52525b' }}>
              连接上游节点以显示内容
            </span>
          )}
        </p>
      </div>

      {/* 底部栏 */}
      <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`}
        style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
        <span>展示</span>
        <span>{content ? `${content.length} 字` : '空'}</span>
      </div>
    </div>
  );
});
