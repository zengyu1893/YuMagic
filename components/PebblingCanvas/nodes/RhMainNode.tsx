import React, { useState, useContext } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { Icons } from '../Icons';
import { useRHTaskQueue } from '../../../contexts/RHTaskQueueContext';
import ModelContext from '../../../contexts/ModelContext';
import { RH_PRESETS } from '../../../constants/rhPresets';

export const RhMainNode = React.memo(function RhMainNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute, onStop,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText } = props;
const webappId = node.data?.webappId || '';
const appInfo = node.data?.appInfo;
const coverUrl = node.data?.coverUrl;
const appName = (appInfo as any)?.webappName || appInfo?.title || '配置应用';
const [localBatchCount, setLocalBatchCount] = React.useState(1);

return (
    <div className="w-full h-full flex flex-col gap-2">
        {/* 主体卡片 */}
        <div className="rounded-xl relative shadow-lg overflow-hidden flex-1" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            {/* 头部 */}
            <div className="h-8 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.2)'}`, backgroundColor: isLightCanvas ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-[10px]">R</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold truncate max-w-[180px]" style={{ color: isLightCanvas ? '#059669' : '#a7f3d0' }}>
                            {appName}
                        </span>
                        <span className="text-[7px] truncate" style={{ color: isLightCanvas ? '#047857' : 'rgba(52,211,153,0.6)' }}>
                            ID: {webappId.slice(0, 12)}...
                        </span>
                    </div>
                </div>
            </div>
            
            {/* 封面图 */}
            <div className="w-full flex-1 relative" style={{ minHeight: '150px' }}>
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt="Cover" 
                        className="w-full h-full object-cover" 
                        draggable={false}
                    />
                ) : (
                    <div 
                        className="w-full h-full flex flex-col items-center justify-center"
                        style={{ backgroundColor: isLightCanvas ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.08)' }}
                    >
                        <svg className="w-12 h-12 mb-2" fill="none" stroke={isLightCanvas ? '#059669' : '#34d399'} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[10px] font-medium" style={{ color: isLightCanvas ? '#059669' : '#34d399' }}>应用封面</span>
                    </div>
                )}
                
                {/* 左侧输入连接点 */}
                <div 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
                    style={{ 
                        backgroundColor: 'rgba(16,185,129,0.3)',
                        borderColor: '#10b981',
                        boxShadow: '0 0 8px rgba(16,185,129,0.5)'
                    }}
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        onEndConnection(node.id);
                    }}
                    title="主图输入"
                />
            </div>
        </div>
        
        {/* 操作栏 - 批次控制 + RUN 按钮 */}
        <div className="flex items-center justify-between gap-2 px-1">
            {/* 批次控制 */}
            <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }}>
                <button
                    className="w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}
                    onClick={(e) => { e.stopPropagation(); setLocalBatchCount(Math.max(1, localBatchCount - 1)); }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <span className="text-[12px] font-bold" style={{ color: themeColors.textSecondary }}>−</span>
                </button>
                <span className="text-[11px] font-bold min-w-[16px] text-center" style={{ color: themeColors.textPrimary }}>{localBatchCount}</span>
                <button
                    className="w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}
                    onClick={(e) => { e.stopPropagation(); setLocalBatchCount(Math.min(10, localBatchCount + 1)); }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <span className="text-[12px] font-bold" style={{ color: themeColors.textSecondary }}>+</span>
                </button>
            </div>
            
            {/* RUN 按钮 */}
            <button
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#10b981' }}
                onClick={(e) => {
                    e.stopPropagation();
                    onExecute(node.id, localBatchCount);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isRunning}
            >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="text-[11px]">RUN</span>
            </button>
            
            {/* 停止按钮 */}
            {isRunning && (
                <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500 text-white transition-all hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); onStop(node.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="1"/>
                    </svg>
                </button>
            )}
        </div>
        
        {/* 底部输出连接点（连到第一个参数节点） */}
        <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
            style={{ 
                backgroundColor: '#10b981',
                borderColor: '#10b981'
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onStartConnection(node.id, 'out', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}
            title="连接到参数"
        />
        
        {isRunning && (
            <div className="absolute inset-0 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 rounded-xl" style={{ backgroundColor: isLightCanvas ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                <div className="w-8 h-8 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin mb-2"></div>
                <span className="text-[10px]" style={{ color: isLightCanvas ? '#059669' : '#6ee7b7' }}>正在执行...</span>
            </div>
        )}
    </div>
);
});
