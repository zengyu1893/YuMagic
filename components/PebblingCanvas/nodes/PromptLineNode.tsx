import React, { useState, useMemo, useEffect } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';

export const PromptLineNode = React.memo(function PromptLineNode(props: NodeRendererProps) {
  const {
    node, themeColors, isLightCanvas, onUpdate,
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

  const [localContent, setLocalContent] = useState(node.content || '');

  // 当 node.content 被外部更新（上游执行结果流入）时同步到 textarea
  useEffect(() => {
    if (node.content !== undefined && node.content !== localContent) {
      setLocalContent(node.content);
    }
  }, [node.content]);

  // 当 autoResolvedContent 有值时同步显示（上游节点自动解析的文字流入）
  useEffect(() => {
    if (props.autoResolvedContent && props.autoResolvedContent !== localContent) {
      setLocalContent(props.autoResolvedContent);
    }
  }, [props.autoResolvedContent]);

  const lineIndex = node.data?.lineIndex ?? 1;

  // 源内容：优先上游自动解析文字，其次 node.content
  const sourceContent = props.autoResolvedContent || node.content || '';

  const lines = useMemo(() => {
    if (!sourceContent) return [];
    return sourceContent.split('\n').map(l => l.trim()).filter(l => l);
  }, [sourceContent]);

  // 预览选中的那一行
  const selectedLine = lines[Math.min(lineIndex - 1, Math.max(0, lines.length - 1))] || '';

  const handleLineIndexChange = (delta: number) => {
    const newIndex = Math.max(1, lineIndex + delta);
    onUpdate(node.id, {
      data: { ...node.data, lineIndex: newIndex },
    });
  };

  const handleBlur = () => {
    onUpdate(node.id, {
      content: localContent,
      data: { ...node.data, lineIndex },
    });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl shadow-lg relative"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.3)'}` }}>
      {/* 标题栏 */}
      <div className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{
          borderBottom: `1px solid ${isLightCanvas ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.2)'}`,
          backgroundColor: isLightCanvas ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.1)',
        }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icons.List size={12} className="flex-shrink-0" style={{ color: isLightCanvas ? '#0891b2' : '#67e8f9' }} />
          <span className="text-[10px] font-bold truncate max-w-[200px]"
            style={{ color: isLightCanvas ? '#0e7490' : '#a5f3fc' }}>
            {node.title || '提示词行'}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded"
          style={{
            color: isLightCanvas ? '#0e7490' : 'rgba(103,232,249,0.85)',
            backgroundColor: isLightCanvas ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.2)',
          }}>
          LINE
        </span>
      </div>

      {/* 文本编辑区 */}
      <div className="flex-1 p-3 flex flex-col overflow-hidden" onWheel={(e) => e.stopPropagation()}>
        <label className="text-[10px] uppercase tracking-wider font-medium block mb-1.5 flex-shrink-0" style={{ color: themeColors.textSecondary }}>
          提示词
        </label>
        <textarea
          className={`w-full flex-1 min-h-0 resize-none overflow-y-auto scrollbar-hide text-sm leading-relaxed rounded-lg px-3 py-2 outline-none transition-colors ${isLightCanvas ? 'text-gray-800 placeholder-gray-400' : 'text-zinc-200 placeholder-zinc-500'}`}
          placeholder={"line 1: a cat\nline 2: a dog\nline 3: a bird"}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* 行号选择器 + 预览 */}
      <div className="px-3 pb-3 space-y-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium" style={{ color: themeColors.textSecondary }}>
            行号
          </span>
          <button
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors"
            style={{ backgroundColor: isLightCanvas ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.15)', color: themeColors.textPrimary }}
            onClick={() => handleLineIndexChange(-1)}
          >
            −
          </button>
          <span className="text-xs font-bold min-w-[20px] text-center" style={{ color: themeColors.textPrimary }}>
            {lineIndex}
          </span>
          <button
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors"
            style={{ backgroundColor: isLightCanvas ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.15)', color: themeColors.textPrimary }}
            onClick={() => handleLineIndexChange(1)}
          >
            +
          </button>
          <span className="text-[9px] ml-1" style={{ color: themeColors.textMuted }}>
            / {lines.length || 0} 行
          </span>
        </div>

        {/* 选中行预览 */}
        <div className="rounded-lg px-3 py-2 min-h-[28px]"
          style={{
            backgroundColor: isLightCanvas ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.08)',
            border: `1px solid ${isLightCanvas ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)'}`,
          }}>
          <span className="text-[10px] leading-relaxed whitespace-pre-wrap break-all"
            style={{ color: themeColors.textPrimary }}>
            {selectedLine || <span style={{ color: themeColors.textMuted }}>（空行）</span>}
          </span>
        </div>
      </div>

      {/* 底部栏 */}
      <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`}
        style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
        <span>输出: 第 {lineIndex} 行</span>
        <span>{lines.length} 行</span>
      </div>
    </div>
  );
});
