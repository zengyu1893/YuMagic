import React from 'react';
import type { NodeRendererProps } from './NodeRendererProps';
import { AspectRatioSelector } from '../shared/AspectRatioSelector';
import { ResolutionSelector } from '../shared/ResolutionSelector';
import { ProviderModelSelect } from './ProviderModelSelect';
import { ImageGenerationOptions } from './ImageGenerationOptions';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';

// 香蕉SVG图标
const BananaIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5,10.5c-0.8-0.8-1.9-1.3-3-1.4c0.1-0.5,0.2-1.1,0.2-1.6c0-2.2-1.8-4-4-4c-1.4,0-2.6,0.7-3.3,1.8 C9.6,4.2,8.4,3.5,7,3.5c-2.2,0-4,1.8-4,4c0,0.5,0.1,1.1,0.2,1.6c-1.1,0.1-2.2,0.6-3,1.4c-1.4,1.4-1.4,3.7,0,5.1 c0.7,0.7,1.6,1.1,2.5,1.1c0.9,0,1.8-0.4,2.5-1.1c0.7-0.7,1.1-1.6,1.1-2.5c0-0.9-0.4-1.8-1.1-2.5c-0.2-0.2-0.4-0.4-0.7-0.5 c-0.1-0.4-0.2-0.9-0.2-1.3c0-1.1,0.9-2,2-2s2,0.9,2,2c0,0.5-0.2,0.9-0.5,1.3c-0.5,0.6-0.7,1.3-0.7,2.1c0,0.9,0.4,1.8,1.1,2.5 c0.7,0.7,1.6,1.1,2.5,1.1s1.8-0.4,2.5-1.1c0.7-0.7,1.1-1.6,1.1-2.5c0-0.8-0.3-1.5-0.7-2.1c-0.3-0.4-0.5-0.8-0.5-1.3 c0-1.1,0.9-2,2-2s2,0.9,2,2c0,0.5-0.1,0.9-0.2,1.3c-0.2,0.1-0.5,0.3-0.7,0.5c-0.7,0.7-1.1,1.6-1.1,2.5c0,0.9,0.4,1.8,1.1,2.5 c0.7,0.7,1.6,1.1,2.5,1.1c0.9,0,1.8-0.4,2.5-1.1C21.9,14.2,21.9,11.9,20.5,10.5z"/>
  </svg>
);

export const EditNode = React.memo(function EditNode(props: NodeRendererProps) {
  const { node, onUpdate, localPrompt, setLocalPrompt, handleUpdate,
    isLightCanvas, controlBg, themeColors, showRunningIndicator, footerBarBg } = props;

  const editAspectRatio = node.data?.settings?.aspectRatio || 'AUTO';
  const editResolution = node.data?.settings?.resolution || 'AUTO';
  const resolutions = ['AUTO', '1K', '2K', '4K'];
  const selectedYellowClass = 'bg-yellow-300/80 text-yellow-900 dark:bg-yellow-500/30 dark:text-yellow-100';

  const handleEditSettingChange = (key: string, value: string) => {
    onUpdate(node.id, {
      data: { ...node.data, settings: { ...node.data?.settings, [key]: value }, output: undefined },
      content: '',
      status: 'idle'
    });
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.3)'}` }}>
      <div className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.2)'}`,
          backgroundColor: isLightCanvas ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.1)' }}>
        <div className="flex items-center gap-2">
          <BananaIcon size={12} className={isLightCanvas ? 'text-yellow-600' : 'text-yellow-300'} />
          <span className="text-[10px] font-bold truncate max-w-[200px]"
            style={{ color: isLightCanvas ? '#a16207' : '#fef08a' }}>Magic</span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded"
          style={{ color: isLightCanvas ? '#854d0e' : 'rgba(253,224,71,0.6)',
            backgroundColor: isLightCanvas ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.2)' }}>MAGIC</span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium block mb-1.5 flex-shrink-0">编辑指令</label>
          <textarea className={`flex-1 w-full ${controlBg} border rounded-lg px-3 py-2 text-xs outline-none resize-none overflow-y-auto scrollbar-hide transition-colors ${isLightCanvas ? 'border-gray-200 text-gray-800 focus:border-yellow-500 placeholder-gray-400' : 'border-white/10 text-zinc-200 focus:border-yellow-500/50 placeholder-zinc-600'}`}
            placeholder="输入编辑指令..." value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)}
            onBlur={handleUpdate} onMouseDown={(e) => e.stopPropagation()} />
        </div>
      </div>
      <div className="px-3 pb-3 space-y-1.5 flex-shrink-0">
        <AspectRatioSelector label="比例" selected={editAspectRatio} onChange={(r) => handleEditSettingChange('aspectRatio', r)}
          controlBg={controlBg} selectedClass={selectedYellowClass} />
        <ResolutionSelector options={resolutions} selected={editResolution}
          label="清晰度" onChange={(r) => handleEditSettingChange('resolution', r)} controlBg={controlBg} selectedClass={selectedYellowClass} />
        <ImageGenerationOptions
          settings={node.data?.settings || {}}
          onChange={handleEditSettingChange}
          controlBg={controlBg}
          selectedClass={selectedYellowClass}
          isLightCanvas={isLightCanvas}
        />
        <div className="px-0.5">
          <ProviderModelSelect node={node} kind="image" onUpdate={onUpdate} isLightCanvas={isLightCanvas} />
        </div>
      </div>
      <div className={`h-6 ${footerBarBg} border-t px-3 flex items-center justify-between text-[10px]`}
        style={{ borderColor: themeColors.headerBorder, color: themeColors.textMuted }}>
        <span>输入: 1/1</span>
        <span>{editAspectRatio} · {editResolution}</span>
      </div>
      {showRunningIndicator && (
        <SpinnerOverlay size="lg" colorClass="border-yellow-400/50 border-t-yellow-400" zIndex="z-30" />
      )}
    </div>
  );
});
