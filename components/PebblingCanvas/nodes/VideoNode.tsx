import React from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { Icons } from '../Icons';
import { AspectRatioSelector } from '../shared/AspectRatioSelector';
import { ProviderModelSelect } from './ProviderModelSelect';

export const VideoNode = React.memo(function VideoNode(props: NodeRendererProps) {
  const {
    node, themeColors, isLightCanvas, onUpdate, controlBg,
    localPrompt, setLocalPrompt, handleUpdate,
  } = props;
// 视频节点 — 模型从中转站动态拉取，界面跟创意节点一致
const videoResolution = node.data?.videoResolution || '720p';
const videoAspect = node.data?.videoAspect || '16:9';
const videoSeconds = node.data?.videoSeconds || node.data?.seconds || '10';
const handleVideoSettingChange = (key: string, value: string) => {
    onUpdate(node.id, { data: { ...node.data, [key]: value } });
};

const selBg = isLightCanvas ? 'bg-gray-200 text-gray-800' : 'bg-white/20 text-white';

return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
        {/* Header */}
        <div className="h-8 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
            <div className="flex items-center gap-2">
                <Icons.Video size={12} style={{ color: themeColors.textSecondary }} />
                <span className="text-[10px] font-bold truncate max-w-[160px]" style={{ color: themeColors.textPrimary }}>视频生成</span>
            </div>
        </div>

        {/* Prompt */}
        <div className="px-3 pt-2 shrink-0">
            <textarea
                className={`w-full min-h-[52px] max-h-[80px] ${controlBg} border rounded-lg p-2 text-[11px] outline-none resize-none ${isLightCanvas ? 'border-gray-200 text-gray-800 focus:border-yellow-500 placeholder-gray-400' : 'border-white/10 text-zinc-200 focus:border-yellow-500/50 placeholder-zinc-600'}`}
                placeholder="描述视频场景..."
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                onBlur={handleUpdate}
                onMouseDown={(e) => e.stopPropagation()}
            />
        </div>


        {/* 比例选择器 */}
        <div className="px-3 pb-1">
            <AspectRatioSelector
                selected={videoAspect}
                onChange={(r) => handleVideoSettingChange('videoAspect', r)}
                controlBg={controlBg}
                selectedClass={selBg}
            />
        </div>

        {/* Model + Resolution + Seconds */}
        <div className="px-3 pb-3 flex gap-2 shrink-0 items-center">
            <div className="flex-1 min-w-0">
                <ProviderModelSelect node={node} kind="video" onUpdate={onUpdate} isLightCanvas={isLightCanvas} />
            </div>
            <select
                value={videoResolution}
                onChange={(e) => handleVideoSettingChange('videoResolution', e.target.value)}
                className="rounded-lg px-2 py-1 text-[10px] font-medium outline-none shrink-0"
                style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`, color: themeColors.textPrimary, width: '68px' }}
                onMouseDown={(e) => e.stopPropagation()}>
                <option value="480p">480p</option>
                <option value="720p">720p</option>
            </select>
            <div className="flex items-center gap-1 shrink-0">
                <select
                    value={videoSeconds}
                    onChange={(e) => handleVideoSettingChange('videoSeconds', e.target.value)}
                    className="rounded-lg px-1 py-1 text-[10px] font-medium outline-none shrink-0"
                    style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`, color: themeColors.textPrimary }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <option value="6">6s</option>
                    <option value="10">10s</option>
                    <option value="12">12s</option>
                    <option value="16">16s</option>
                    <option value="20">20s</option>
                </select>
            </div>
        </div>
    </div>
);
});
