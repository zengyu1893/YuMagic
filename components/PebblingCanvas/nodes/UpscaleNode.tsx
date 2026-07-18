import React from 'react';
import type { NodeRendererProps } from './NodeRendererProps';
import { ResolutionSelector } from '../shared/ResolutionSelector';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';

export const UpscaleNode = React.memo(function UpscaleNode(props: NodeRendererProps) {
  const { node, onUpdate, themeColors, showRunningIndicator, controlBg } = props;

  const upscaleResolution = node.data?.settings?.resolution || '2K';

  const handleSettingChange = (key: string, value: string) => {
    onUpdate(node.id, {
      data: { ...node.data, settings: { ...node.data?.settings, [key]: value }, output: undefined },
      content: '',
      status: 'idle'
    });
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
      <div className="h-7 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>Upscale HD</span>
        </div>
        <span className="text-[7px] uppercase" style={{ color: themeColors.textMuted }}>IMG → HD</span>
      </div>
      <div className="flex-1 p-3 flex flex-col justify-center gap-3">
        <div className="text-center">
          <div className="text-zinc-400 text-[10px] mb-1">高清放大处理</div>
          <div className="text-zinc-600 text-[8px]">保持原始比例，提升分辨率</div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase px-1">目标分辨率</label>
          <ResolutionSelector options={['2K', '4K']} selected={upscaleResolution}
            onChange={(r) => handleSettingChange('resolution', r)} controlBg={controlBg}
            selectedClass="bg-white/20 text-white" textSize="text-[11px]" />
        </div>
        <div className="text-center text-[8px] text-zinc-600">
          {upscaleResolution === '2K' ? '输出约 2048px' : '输出约 4096px'}
        </div>
      </div>
      <div className="h-6 bg-black/20 border-t border-white/5 px-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
        <span className="flex items-center gap-1">IN: <span className="text-zinc-300">IMG</span></span>
        <span className="flex items-center gap-1">OUT: <span className="text-zinc-300">{upscaleResolution}</span></span>
      </div>
      {showRunningIndicator && <SpinnerOverlay size="lg" zIndex="z-30" />}
    </div>
  );
});
