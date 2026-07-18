import React, { useState, useMemo, useEffect } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';

export const ReplaceTextNode = React.memo(function ReplaceTextNode(props: NodeRendererProps) {
  const {
    node, themeColors, isLightCanvas, onUpdate,
    inputBaseClass, footerBarBg,
    onStartConnection, onEndConnection, onDragStart,
    onSelect,
    incomingConnections,
    nodeRef, fileInputRef,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload,
  } = props;

  const [localContent, setLocalContent] = useState(node.content || '');
  const [localFind, setLocalFind] = useState(node.data?.findText || '');
  const [localReplace, setLocalReplace] = useState(node.data?.replaceText || '');

  // Sync from node.content (upstream execution result)
  useEffect(() => {
    if (node.content !== undefined && node.content !== localContent) {
      setLocalContent(node.content);
    }
  }, [node.content]);

  // Sync from autoResolvedContent (real-time upstream text)
  useEffect(() => {
    if (props.autoResolvedContent && props.autoResolvedContent !== localContent) {
      setLocalContent(props.autoResolvedContent);
    }
  }, [props.autoResolvedContent]);

  const sourceContent = props.autoResolvedContent || node.content || '';

  // Real-time preview of replacement
  const previewContent = useMemo(() => {
    if (!sourceContent || !localFind) return sourceContent;
    try {
      return sourceContent.split(localFind).join(localReplace);
    } catch {
      return sourceContent;
    }
  }, [sourceContent, localFind, localReplace]);

  const handleBlur = () => {
    onUpdate(node.id, {
      content: localContent,
      data: { ...node.data, findText: localFind, replaceText: localReplace },
    });
  };

  // Amber/peach accent colors
  const accentColor = isLightCanvas ? '#c2410c' : '#fb923c';
  const accentBg = isLightCanvas ? 'rgba(251,146,60,0.06)' : 'rgba(251,146,60,0.1)';
  const accentBorder = 'rgba(251,146,60,0.3)';

  const matchCount = localFind ? (sourceContent.split(localFind).length - 1) : 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl shadow-lg relative"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${accentBorder}` }}>
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{
          borderBottom: `1px solid ${isLightCanvas ? 'rgba(251,146,60,0.2)' : 'rgba(251,146,60,0.2)'}`,
          backgroundColor: accentBg,
        }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icons.Refresh size={12} className="flex-shrink-0" style={{ color: accentColor }} />
          <span className="text-[10px] font-bold truncate max-w-[200px]"
            style={{ color: isLightCanvas ? '#9a3412' : '#fdba74' }}>
            {node.title || '文本替换'}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded"
          style={{
            color: isLightCanvas ? '#9a3412' : 'rgba(253,186,116,0.85)',
            backgroundColor: isLightCanvas ? 'rgba(251,146,60,0.15)' : 'rgba(251,146,60,0.2)',
          }}>
          REPLACE
        </span>
      </div>

      {/* Find / Replace inputs */}
      <div className="p-3 space-y-2 flex-shrink-0">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: themeColors.textSecondary }}>
            查找
          </label>
          <input
            type="text"
            className={inputBaseClass}
            placeholder="要查找的文本..."
            value={localFind}
            onChange={(e) => setLocalFind(e.target.value)}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: themeColors.textSecondary }}>
            替换为
          </label>
          <input
            type="text"
            className={inputBaseClass}
            placeholder="替换后的文本..."
            value={localReplace}
            onChange={(e) => setLocalReplace(e.target.value)}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 px-3 pb-3 overflow-hidden">
        <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: themeColors.textSecondary }}>
          预览 {matchCount > 0 && <span style={{ color: accentColor }}>({matchCount} 处匹配)</span>}
        </label>
        <div className="rounded-lg px-3 py-2 h-full overflow-y-auto"
          style={{
            backgroundColor: isLightCanvas ? 'rgba(251,146,60,0.04)' : 'rgba(251,146,60,0.06)',
            border: `1px solid ${accentBorder}`,
          }}>
          <span className="text-[10px] leading-relaxed whitespace-pre-wrap break-all"
            style={{ color: themeColors.textPrimary }}>
            {previewContent || <span style={{ color: themeColors.textMuted }}>（无内容）</span>}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`}
        style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
        <span>输出: 替换后文本</span>
        <span>{sourceContent.length} 字</span>
      </div>
    </div>
  );
});
