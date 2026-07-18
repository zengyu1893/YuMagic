import React, { useState } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { AspectRatioSelector } from '../shared/AspectRatioSelector';
import { ResolutionSelector } from '../shared/ResolutionSelector';
import { ProviderModelSelect } from './ProviderModelSelect';
import { ImageGenerationOptions } from './ImageGenerationOptions';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';

export const IdeaNode = React.memo(function IdeaNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText, footerBarBg, inputBaseClass,
    imageModels, chatModels, videoModels, showRunningIndicator,
    onDownload, onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload, onDragStart,
    hasDownstream, nodeRef, fileInputRef, onSelect, onStop,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload } = props;
const settings = node.data?.settings || {};
const ideaTitle = node.title || '创意';
const [localContent, setLocalContent] = useState(node.content || '');

return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl shadow-lg relative" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
        {/* 标题栏 - 与BP一致 */}
        <div className="h-8 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.2)'}`, backgroundColor: isLightCanvas ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.1)' }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icons.Sparkles size={12} className="flex-shrink-0" style={{ color: isLightCanvas ? '#3b82f6' : '#93c5fd' }} />
                <span className="text-[10px] font-bold truncate max-w-[200px]" style={{ color: isLightCanvas ? '#2563eb' : '#bfdbfe' }}>{ideaTitle}</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: isLightCanvas ? '#1d4ed8' : 'rgba(147,197,253,0.6)', backgroundColor: isLightCanvas ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.2)' }}>IDEA</span>
        </div>
        
        {/* 提示词编辑区 - 固定高度，内容滚动 */}
        <div className="flex-1 p-3 flex flex-col overflow-hidden" onWheel={(e) => e.stopPropagation()}>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium block mb-1.5 flex-shrink-0">提示词</label>
            <div className="flex-1 min-h-0 overflow-hidden">
                <textarea 
                    className={`w-full h-full ${controlBg} border rounded-lg px-3 py-2 text-xs outline-none transition-colors resize-none overflow-y-auto scrollbar-hide ${isLightCanvas ? 'border-gray-200 text-gray-800 focus:border-blue-400 placeholder-gray-400' : 'border-white/10 text-zinc-200 focus:border-blue-500/50'}`}
                    placeholder="输入提示词..."
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    onBlur={(e) => {
                        onUpdate(node.id, { content: localContent });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </div>
        </div>
        
        {/* 设置区 - 与BP一致的样式 */}
        <div className="px-3 pb-3 space-y-1.5 flex-shrink-0">
            <AspectRatioSelector
                label="比例"
                selected={settings.aspectRatio || 'AUTO'}
                onChange={(ratio) => onUpdate(node.id, { data: { ...node.data, settings: { ...settings, aspectRatio: ratio } } })}
                controlBg={controlBg}
                selectedClass={`${selectedBg} ${selectedText}`}
            />
            <ResolutionSelector
                label="清晰度"
                options={['1K', '2K', '4K']}
                selected={settings.resolution || '2K'}
                onChange={(res) => onUpdate(node.id, { data: { ...node.data, settings: { ...settings, resolution: res } } })}
                controlBg={controlBg}
                selectedClass={`${selectedBg} ${selectedText}`}
            />
            {/* 模型选择 */}
            <ImageGenerationOptions
                settings={settings}
                onChange={(key, value) => onUpdate(node.id, { data: { ...node.data, settings: { ...settings, [key]: value } } })}
                controlBg={controlBg}
                selectedClass={`${selectedBg} ${selectedText}`}
                isLightCanvas={isLightCanvas}
            />
            <div className="px-0.5">
                <ProviderModelSelect node={node} kind="image" onUpdate={onUpdate} isLightCanvas={isLightCanvas} />
            </div>
        </div>

        {/* 底部状态 - 与BP一致 */}
        <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`} style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
            <span>输入: 1/1</span>
            <span>{settings.aspectRatio || 'AUTO'} · {settings.resolution || '2K'}</span>
        </div>

        {isRunning && (
            <SpinnerOverlay size="lg" colorClass="border-blue-400/50 border-t-blue-400" zIndex="z-30" />
        )}
    </div>
);
});
