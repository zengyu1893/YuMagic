import React, { useState, useContext } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { Icons } from '../Icons';
import { useRHTaskQueue } from '../../../contexts/RHTaskQueueContext';
import ModelContext from '../../../contexts/ModelContext';
import { RH_PRESETS } from '../../../constants/rhPresets';

export const RhParamNode = React.memo(function RhParamNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute, onStop,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText } = props;
const paramInfo = node.data?.rhParamInfo;
const nodeInputs = node.data?.nodeInputs || {};
const parentNodeId = node.data?.rhParentNodeId;

if (!paramInfo) {
    return (
        <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}` }}>
            <span className="text-[10px]" style={{ color: themeColors.textMuted }}>无参数信息</span>
        </div>
    );
}

const key = `${paramInfo.nodeId}_${paramInfo.fieldName}`;
const fieldType = paramInfo.fieldType?.toUpperCase() || 'STRING';
const isFileType = ['IMAGE', 'VIDEO', 'AUDIO'].includes(fieldType);
const hasConnection = incomingConnections.some(c => c.toPortKey === key || (!c.toPortKey && c.toNode === node.id));

// 类型配色
const typeConfigs: Record<string, { bg: string; border: string; text: string }> = {
    'IMAGE': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6' },
    'VIDEO': { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.25)', text: '#a855f7' },
    'AUDIO': { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)', text: '#ec4899' },
    'STRING': { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#10b981' },
    'LIST': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
    'COMBO': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
};
const typeConfig = typeConfigs[fieldType] || typeConfigs['STRING'];

// 处理参数值变更
const handleParamChange = (value: string) => {
    onUpdate(node.id, { data: { ...node.data, nodeInputs: { ...nodeInputs, [key]: value } } });
};

// 处理文件上传
const handleFileUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fieldType === 'IMAGE' ? 'image/*' : (fieldType === 'VIDEO' ? 'video/*' : (fieldType === 'AUDIO' ? 'audio/*' : '*/*'));
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (ev) => {
            if (ev.target?.result) {
                try {
                    const { uploadImage } = await import('../../../services/api/runninghub');
                    const result = await uploadImage(ev.target.result as string, node.data?.keyType);
                    if (result.success && result.data?.fileKey) {
                        handleParamChange(result.data.fileKey);
                    }
                } catch (err) {
                    console.error('上传异常:', err);
                }
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
};

// 类型图标
const renderTypeIcon = () => {
    const iconClass = "w-4 h-4";
    switch (fieldType) {
        case 'IMAGE':
            return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        case 'VIDEO':
            return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
        case 'AUDIO':
            return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>;
        case 'LIST':
        case 'COMBO':
            return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
        default:
            return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
    }
};

// LIST 类型选项解析
let listOptions: string[] = [];
let defaultValue = paramInfo.fieldValue || '';
if ((fieldType === 'LIST' || fieldType === 'COMBO') && paramInfo.options) {
    listOptions = paramInfo.options;
}

return (
    <div 
        className="w-full h-full rounded-xl shadow-md transition-all hover:shadow-lg relative"
        style={{ 
            backgroundColor: themeColors.nodeBg,
            border: `1px solid ${hasConnection ? 'rgba(16,185,129,0.5)' : (isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
            boxShadow: hasConnection ? '0 0 12px rgba(16,185,129,0.2)' : undefined
        }}
        onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection(node.id, key);
        }}
    >
        {/* 顶部连接点（接收上一个节点的连线） */}
        <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
            style={{ 
                backgroundColor: 'rgba(16,185,129,0.3)',
                borderColor: '#10b981'
            }}
            onMouseUp={(e) => {
                e.stopPropagation();
                onEndConnection(node.id);
            }}
            title="串联输入"
        />
        
        {/* 左侧输入连接点（接收图片等数据连线） */}
        <div 
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
            style={{ 
                backgroundColor: hasConnection ? '#10b981' : (isLightCanvas ? '#d1d5db' : '#4b5563'),
                borderColor: '#10b981'
            }}
            onMouseUp={(e) => {
                e.stopPropagation();
                onEndConnection(node.id, key);
            }}
            title={`连接: ${paramInfo.description || paramInfo.fieldName}`}
        />
        
        {/* 底部连接点（连到下一个参数节点） */}
        <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
            style={{ 
                backgroundColor: '#10b981',
                borderColor: '#10b981'
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onStartConnection(node.id, 'out', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}
            title="串联输出"
        />
        
        {/* 内容区 */}
        <div className="px-3 py-2.5 flex items-center gap-3">
            {/* 类型图标 */}
            <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: typeConfig.bg, border: `1px solid ${typeConfig.border}` }}
            >
                {renderTypeIcon()}
            </div>
            
            {/* 参数名 + 输入区 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium truncate" style={{ color: themeColors.textPrimary }}>
                        {paramInfo.description || paramInfo.fieldName}
                    </span>
                    <span 
                        className="text-[8px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2"
                        style={{ backgroundColor: typeConfig.bg, color: typeConfig.text, border: `1px solid ${typeConfig.border}` }}
                    >
                        {fieldType}
                    </span>
                </div>
                
                {/* 输入控件 */}
                {hasConnection ? (
                    <div className="flex items-center gap-1.5 rounded px-2 py-1" style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[9px] font-medium text-emerald-400">已连接</span>
                    </div>
                ) : isFileType ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            className="flex-1 rounded px-2 py-1 text-[9px] outline-none"
                            style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`, color: themeColors.textPrimary }}
                            placeholder="Key或拉线"
                            value={nodeInputs[key] || ''}
                            onChange={(e) => handleParamChange(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <button
                            className="p-1 rounded transition-all hover:scale-105 shrink-0"
                            style={{ backgroundColor: typeConfig.bg, border: `1px solid ${typeConfig.border}` }}
                            onClick={handleFileUpload}
                            onMouseDown={(e) => e.stopPropagation()}
                            title="上传"
                        >
                            <svg className="w-3 h-3" fill="none" stroke={typeConfig.text} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </button>
                    </div>
                ) : (fieldType === 'LIST' || fieldType === 'COMBO') && listOptions.length > 0 ? (
                    <select
                        className="w-full rounded px-2 py-1 text-[9px] outline-none cursor-pointer"
                        style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`, color: themeColors.textPrimary }}
                        value={nodeInputs[key] || defaultValue || listOptions[0] || ''}
                        onChange={(e) => handleParamChange(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {listOptions.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        className="w-full rounded px-2 py-1 text-[9px] outline-none"
                        style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`, color: themeColors.textPrimary }}
                        placeholder={paramInfo.fieldValue || '输入...'}
                        value={nodeInputs[key] || ''}
                        onChange={(e) => handleParamChange(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </div>
    </div>
);
});
