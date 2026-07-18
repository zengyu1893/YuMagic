import React from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { AspectRatioSelector } from '../shared/AspectRatioSelector';
import { ResolutionSelector } from '../shared/ResolutionSelector';
import { ModelSelect } from './ModelSelect';
import { ImageGenerationOptions } from './ImageGenerationOptions';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';

export const BpNode = React.memo(function BpNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText, footerBarBg, inputBaseClass,
    imageModels, chatModels, videoModels, showRunningIndicator,
    onDownload, onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload, onDragStart,
    hasDownstream, nodeRef, fileInputRef, onSelect, onStop,
    localPrompt, setLocalPrompt, handleUpdate, handleFileUpload } = props;
const bpTemplate = node.data?.bpTemplate;
const bpInputs = node.data?.bpInputs || {};
const bpFields = bpTemplate?.bpFields || [];
const settings = node.data?.settings || {};
// 检查是否有有效图片（支持 data:image, http://, https://, // 协议相对URL, /files/ 相对路径）
// 注意：如果有下游连接，不显示图片（结果应该在下游节点显示）
const hasImage = !hasDownstream && node.content && node.content.length > 10 && (
    node.content.startsWith('data:image') || 
    node.content.startsWith('http://') || 
    node.content.startsWith('https://') ||
    node.content.startsWith('//') ||
    node.content.startsWith('/files/') ||
    node.content.startsWith('/api/')
);
console.log('[BP节点渲染] content:', node.content?.slice(0, 80), 'hasImage:', hasImage);

// 只筛选input类型的字段（变量），不显示agent类型
const inputFields = bpFields.filter((f: any) => f.type === 'input');

const handleBpInputChange = (fieldName: string, value: string) => {
    const newInputs = { ...bpInputs, [fieldName]: value };
    onUpdate(node.id, {
        data: { ...node.data, bpInputs: newInputs }
    });
};

const handleSettingChange = (key: string, value: string) => {
    onUpdate(node.id, {
        data: { ...node.data, settings: { ...settings, [key]: value } }
    });
};

const resolutions = ['1K', '2K', '4K'];

return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
        {/* 头部 */}
        <div className="h-8 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.2)'}`, backgroundColor: isLightCanvas ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.1)' }}>
            <div className="flex items-center gap-2">
                <Icons.Sparkles size={12} style={{ color: isLightCanvas ? '#3b82f6' : '#93c5fd' }} />
                <span className="text-[10px] font-bold truncate max-w-[200px]" style={{ color: isLightCanvas ? '#2563eb' : '#bfdbfe' }}>
                    {bpTemplate?.title || 'BP 模板'}
                </span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: isLightCanvas ? '#1d4ed8' : 'rgba(147,197,253,0.6)', backgroundColor: isLightCanvas ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.2)' }}>BP</span>
        </div>
        
        {hasImage ? (
            // 有图片：显示结果
            <div className="flex-1 relative bg-black">
                <img 
                    src={node.content} 
                    alt="Result" 
                    className="w-full h-full object-contain" 
                    draggable={false}
                    style={{
                        imageRendering: 'auto',
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
                    } as React.CSSProperties}
                />
            </div>
        ) : (
            // 无图片：显示输入和设置
            <>
                {/* 变量输入 */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3" onWheel={(e) => e.stopPropagation()}>
                    {inputFields.length === 0 ? (
                        <div className="text-center text-zinc-500 text-xs py-4">
                            无变量输入
                        </div>
                    ) : (
                        inputFields.map((field: any) => (
                            <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                    {field.label}
                                </label>
                                <input
                                    type="text"
                                    className={`w-full ${controlBg} border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${isLightCanvas ? 'border-gray-200 text-gray-800 focus:border-blue-400 placeholder-gray-400' : 'border-white/10 text-zinc-200 focus:border-blue-500/50 placeholder-zinc-600'}`}
                                    placeholder={`输入 ${field.label}`}
                                    value={bpInputs[field.name] || ''}
                                    onChange={(e) => handleBpInputChange(field.name, e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        ))
                    )}
                </div>
                
                {/* 设置区 */}
                <div className="px-3 pb-3 space-y-1.5">
                    <AspectRatioSelector
                        label="比例"
                        selected={settings.aspectRatio || 'AUTO'}
                        onChange={(r) => handleSettingChange('aspectRatio', r)}
                        controlBg={controlBg}
                        selectedClass={`${selectedBg} ${selectedText}`}
                    />
                    <ResolutionSelector
                        label="清晰度"
                        options={resolutions}
                        selected={settings.resolution || '2K'}
                        onChange={(r) => handleSettingChange('resolution', r)}
                        controlBg={controlBg}
                        selectedClass={`${selectedBg} ${selectedText}`}
                    />
                    {/* 模型选择 */}
                    <ImageGenerationOptions
                        settings={settings}
                        onChange={handleSettingChange}
                        controlBg={controlBg}
                        selectedClass={`${selectedBg} ${selectedText}`}
                        isLightCanvas={isLightCanvas}
                    />
                    {imageModels.length > 0 && (
                      <div className="px-0.5">
                        <ModelSelect
                          models={imageModels}
                          value={settings.model || imageModels[0] || ''}
                          onChange={(m) => handleSettingChange('model', m)}
                          colorClass="bg-blue-100 text-blue-700"
                        />
                      </div>
                    )}
                </div>
            </>
        )}

        {/* 底部状态 */}
        <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`} style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
            <span>{hasImage ? '✅ 已生成' : `输入: ${Object.values(bpInputs).filter(v => v).length}/${inputFields.length}`}</span>
            <span>{settings.aspectRatio || '1:1'} · {settings.resolution || '2K'}</span>
        </div>
        
        {isRunning && (
            <SpinnerOverlay size="lg" colorClass="border-blue-400/50 border-t-blue-400" zIndex="z-30" />
        )}
    </div>
);
});
