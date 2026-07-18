import React, { useState, useContext } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { Icons } from '../Icons';
import { useRHTaskQueue } from '../../../contexts/RHTaskQueueContext';
import ModelContext from '../../../contexts/ModelContext';
import { RH_PRESETS } from '../../../constants/rhPresets';
import { CustomSelect } from './CustomSelect';

export const RhConfigNode = React.memo(function RhConfigNode(props: NodeRendererProps) {
  const { node, themeColors, isLightCanvas, onUpdate, onExecute, onStop,
    onEndConnection, onStartConnection, isRunning, incomingConnections,
    controlBg, selectedBg, selectedText } = props;
const webappId = node.data?.webappId || '';
const appInfo = node.data?.appInfo;
const nodeInputs = node.data?.nodeInputs || {};
const coverUrl = node.data?.coverUrl;
const errorMsg = node.data?.error;
const mode = (node.data?.mode || 'app') as 'app' | 'workflow';
const keyType = (node.data?.keyType || 'consumer') as 'consumer' | 'enterprise';
const instanceType = (node.data?.instanceType || 'default') as 'default' | 'turbo' | 'plus';
const workflowId = node.data?.workflowId || '';
const workflowNodeList = (node.data?.workflowNodeList || []) as Array<{ nodeId: string; fieldName: string; fieldValue: string }>;
const appName = (appInfo as any)?.webappName || appInfo?.title || '配置应用';
const rhTaskQueue = useRHTaskQueue();
const nodeTaskStatus = rhTaskQueue.getNodeTaskStatus(node.id);

const handleNodeInputChange = (key: string, value: string) => {
    onUpdate(node.id, { data: { ...node.data, nodeInputs: { ...nodeInputs, [key]: value } } });
};

const handleDataUpdate = (updates: any) => {
    onUpdate(node.id, { data: { ...node.data, ...updates } });
};

// 处理文件上传
const handleFileUpload = async (key: string, fieldType: string) => {
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
                        handleNodeInputChange(key, result.data.fileKey);
                    } else {
                        console.error('上传失败:', result.error);
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

return (
    <div className="w-full h-full flex flex-col">
        {/* 头部(32px) + 封面图区域(200px) */}
        <div className="rounded-t-xl relative shadow-lg overflow-hidden shrink-0" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, borderBottom: 'none' }}>
            {/* 头部 - 32px */}
            <div className="h-8 flex items-center justify-between px-3" style={{ backgroundColor: isLightCanvas ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-[10px]">R</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold truncate max-w-[200px]" style={{ color: isLightCanvas ? '#059669' : '#a7f3d0' }}>
                            {appName}
                        </span>
                        <span className="text-[7px] truncate" style={{ color: isLightCanvas ? '#047857' : 'rgba(52,211,153,0.6)' }}>
                            ID: {webappId.slice(0, 12)}...
                        </span>
                    </div>
                </div>
                {/* 队列状态显示 */}
                {nodeTaskStatus && nodeTaskStatus.total > 0 && (
                    <div className="flex items-center gap-1.5">
                        {/* 排队状态 */}
                        {nodeTaskStatus.queued > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                <span>排队 #{nodeTaskStatus.firstQueuePosition || nodeTaskStatus.queued}</span>
                                <button
                                    className="ml-0.5 hover:opacity-70"
                                    onClick={(e) => { e.stopPropagation(); rhTaskQueue.cancelNodeTasks(node.id); }}
                                    title="取消排队"
                                >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {/* 执行中状态 */}
                        {(nodeTaskStatus.running > 0 || nodeTaskStatus.uploading > 0) && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span>
                                    {nodeTaskStatus.uploading > 0 ? '上传中' : `执行中 ${nodeTaskStatus.completed + 1}/${nodeTaskStatus.total}`}
                                </span>
                            </div>
                        )}
                        {/* 已完成状态（全部完成时显示） */}
                        {nodeTaskStatus.completed + nodeTaskStatus.failed >= nodeTaskStatus.total && nodeTaskStatus.queued === 0 && nodeTaskStatus.running === 0 && nodeTaskStatus.uploading === 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ backgroundColor: nodeTaskStatus.failed > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: nodeTaskStatus.failed > 0 ? '#ef4444' : '#22c55e' }}>
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={nodeTaskStatus.failed > 0 ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M5 13l4 4L19 7"} />
                                </svg>
                                <span>
                                    {nodeTaskStatus.failed > 0 ? `${nodeTaskStatus.completed}/${nodeTaskStatus.total} (${nodeTaskStatus.failed}失败)` : `完成 ${nodeTaskStatus.completed}/${nodeTaskStatus.total}`}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* 封面图 - 固定200px高度 */}
            <div 
                className="w-full relative" 
                style={{ height: '200px' }}
                onMouseUp={() => onEndConnection(node.id, 'cover')}
            >
                {/* 封面图左侧连接点 */}
                <div 
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
                    style={{ 
                        backgroundColor: incomingConnections.some(c => c.toPortKey === 'cover') ? '#10b981' : (isLightCanvas ? '#d1d5db' : '#4b5563'), 
                        borderColor: '#10b981' 
                    }}
                    onMouseUp={() => onEndConnection(node.id, 'cover')}
                    title="连接: 封面图"
                />
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt="Cover" 
                        className="w-full h-full object-cover pointer-events-none" 
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: isLightCanvas ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.08)' }}>
                        <svg className="w-10 h-10 mb-1" fill="none" stroke={isLightCanvas ? '#059669' : '#34d399'} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[9px] font-medium" style={{ color: isLightCanvas ? '#059669' : '#34d399' }}>应用封面</span>
                    </div>
                )}
            </div>
        </div>

        {/* 模式 / 秘钥 / 实例 选择器 */}
        <div className="px-3 py-2 grid grid-cols-3 gap-2" style={{ backgroundColor: themeColors.nodeBg, borderLeft: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRight: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <div>
                <label className="text-[9px] font-medium block mb-0.5" style={{ color: isLightCanvas ? '#059669' : 'rgba(52,211,153,0.8)' }}>模式</label>
                <select value={mode}
                    onChange={(e) => handleDataUpdate({ mode: e.target.value, webappId: '', workflowId: '', appInfo: undefined, workflowNodeList: [], nodeInputs: {} })}
                    className="w-full rounded px-1 py-0.5 text-[10px] font-bold outline-none"
                    style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, color: themeColors.textPrimary }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <option value="app">AI应用</option>
                    <option value="workflow">工作流</option>
                </select>
            </div>
            <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">秘钥</label>
                <select value={keyType}
                    onChange={(e) => handleDataUpdate({ keyType: e.target.value })}
                    className="w-full rounded px-1 py-0.5 text-[9px] outline-none"
                    style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.2)'}`, color: themeColors.textPrimary }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <option value="consumer">消费级</option>
                    <option value="enterprise">企业级</option>
                </select>
            </div>
            <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">实例</label>
                <select value={instanceType}
                    onChange={(e) => handleDataUpdate({ instanceType: e.target.value })}
                    className="w-full rounded px-1 py-0.5 text-[9px] outline-none"
                    style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.2)'}`, color: themeColors.textPrimary }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <option value="default">default</option>
                    <option value="turbo">turbo</option>
                    <option value="plus">plus</option>
                </select>
            </div>
        </div>

        {/* 预设选择器：始终可见 */}
        <div className="px-3 py-2" style={{ backgroundColor: themeColors.nodeBg, borderLeft: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRight: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <label className="text-[10px] font-medium block mb-1" style={{ color: isLightCanvas ? '#059669' : 'rgba(52,211,153,0.8)' }}>
                {mode === 'app' ? '选择应用' : '选择工作流'}
            </label>
            <select
                value={mode === 'app' ? webappId : workflowId}
                onChange={async (e) => {
                    const pid = e.target.value;
                    if (!pid) return;
                    const preset = RH_PRESETS.find(p => p.id === pid);
                    if (!preset) return;
                    if (preset.mode === 'app') {
                        onUpdate(node.id, { data: { ...node.data, mode: preset.mode, webappId: preset.id, workflowId: '', workflowNodeList: [], appInfo: undefined, nodeInputs: {} } });
                        try {
                            const { getAIAppInfo } = await import('../../../services/api/runninghub');
                            const result = await getAIAppInfo(preset.id, node.data?.keyType);
                            if (result.success && result.data) {
                                const appInfo = result.data;
                                const paramCount = appInfo.nodeInfoList?.length || 0;
                                const totalH = 32 + 200 + 48 + 40 + 16 + paramCount * 60 + 16;
                                const defaultInputs: Record<string, string> = {};
                                appInfo.nodeInfoList?.forEach((info: any) => {
                                    const k = `${info.nodeId}_${info.fieldName}`;
                                    const ft = (info.fieldType || '').toUpperCase();
                                    defaultInputs[k] = ['IMAGE','VIDEO','AUDIO'].includes(ft) ? '' : (info.fieldValue || '');
                                });
                                onUpdate(node.id, {
                                    status: 'idle', height: totalH,
                                    data: { mode: 'app', webappId: preset.id, keyType: node.data?.keyType || 'consumer', instanceType: node.data?.instanceType || 'default', appInfo, nodeInputs: defaultInputs, coverUrl: appInfo.covers?.[0]?.url || appInfo.covers?.[0]?.thumbnailUri, workflowId: '', workflowNodeList: [] },
                                });
                            } else throw new Error(result.error || '获取应用信息失败');
                        } catch (err: any) {
                            onUpdate(node.id, { status: 'error', data: { ...node.data, error: err.message || '获取应用信息失败', nodeInputs: {} } });
                        }
                    } else {
                        const wfl = (preset.fields || []).map(f => ({ nodeId: f.nodeId, fieldName: f.fieldName, fieldValue: f.fieldValue || '' }));
                        const totalH = 32 + 200 + 48 + 40 + 16 + (wfl.length || 1) * 60 + 16;
                        onUpdate(node.id, {
                            height: Math.max(totalH, 400),
                            data: { mode: 'workflow', workflowId: preset.id, workflowNodeList: wfl, webappId: '', appInfo: undefined, nodeInputs: {}, keyType: node.data?.keyType || 'consumer', instanceType: node.data?.instanceType || 'default' },
                        });
                    }
                }}
                className="w-full rounded-lg px-3 py-2 text-xs font-bold outline-none"
                style={{ backgroundColor: themeColors.inputBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, color: themeColors.textPrimary }}
                onMouseDown={(e) => e.stopPropagation()}>
                <option value="">-- 请选择 --</option>
                {RH_PRESETS.filter(p => p.mode === mode).map(p => (
                    <option key={p.id} value={p.id}>{p.mode === 'app' ? '📱' : '🔧'} {p.title}</option>
                ))}
            </select>
        </div>

        {/* Ticket 参数卡片区 / 加载状态 */}
        <div className="flex-1 overflow-hidden rounded-b-xl" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)'}`, borderTop: 'none' }}>
            <div className="p-2 flex flex-col gap-2">
                {isRunning && webappId && !appInfo && mode === 'app' ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <div className="w-6 h-6 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin"></div>
                        <span className="text-[11px]" style={{ color: isLightCanvas ? '#059669' : '#6ee7b7' }}>加载应用信息...</span>
                    </div>
                ) : (
                (() => {
                    let displayList: any[] = [];
                    if (mode === 'workflow') {
                        displayList = workflowNodeList.map((entry: any) => ({ nodeId: entry.nodeId || '', fieldName: entry.fieldName || '', fieldValue: entry.fieldValue || '', fieldType: 'STRING', description: entry.fieldName || '' }));
                    } else if (appInfo?.nodeInfoList) {
                        displayList = appInfo.nodeInfoList;
                    }
                    if (displayList.length === 0) return (
                        <div className="text-center py-4 text-[11px]" style={{ color: themeColors.textMuted }}>{mode === 'app' ? '请选择应用加载参数' : '请选择工作流加载参数'}</div>
                    );
                    return displayList.map((info: any, idx: number) => {
                        const key = `${info.nodeId}_${info.fieldName}`;
                        const fieldType = info.fieldType?.toUpperCase() || 'STRING';
                        const isFileType = ['IMAGE', 'VIDEO', 'AUDIO'].includes(fieldType);
                        const hasConnection = incomingConnections.some(c => c.toPortKey === key);
                        
                        // 类型颜色配置
                        const typeConfigs: Record<string, { bg: string; border: string; text: string }> = {
                            'IMAGE': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6' },
                            'VIDEO': { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.25)', text: '#a855f7' },
                            'AUDIO': { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)', text: '#ec4899' },
                            'STRING': { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#10b981' },
                            'LIST': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
                            'COMBO': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
                        };
                        const typeConfig = typeConfigs[fieldType] || typeConfigs['STRING'];
                        
                        // 类型图标
                        const renderTypeIcon = () => {
                            const iconClass = "w-3.5 h-3.5";
                            switch (fieldType) {
                                case 'IMAGE': return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
                                case 'VIDEO': return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
                                case 'LIST': case 'COMBO': return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
                                default: return <svg className={iconClass} fill="none" stroke={typeConfig.text} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
                            }
                        };
                        
                        // LIST 选项解析
                        let listOptions: string[] = [];
                        let defaultValue = info.fieldValue || '';
                        if ((fieldType === 'LIST' || fieldType === 'COMBO') && info.fieldData) {
                            try {
                                const parsed = JSON.parse(info.fieldData);
                                if (Array.isArray(parsed)) {
                                    if (parsed.length === 2 && Array.isArray(parsed[0])) {
                                        listOptions = parsed[0].map((v: any) => typeof v === 'object' ? (v.label || v.name || String(v)) : String(v));
                                        if (parsed[1]?.default !== undefined) defaultValue = String(parsed[1].default);
                                    } else {
                                        listOptions = parsed.map((v: any) => typeof v === 'object' ? (v.label || v.name || String(v)) : String(v));
                                    }
                                }
                            } catch { listOptions = info.fieldData.split(',').map((s: string) => s.trim()); }
                        }
                        
                        return (
                            <div 
                                key={key}
                                className="relative rounded-lg transition-all"
                                style={{ 
                                    height: '52px',
                                    backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${hasConnection ? 'rgba(16,185,129,0.4)' : (isLightCanvas ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)')}`,
                                    boxShadow: hasConnection ? '0 0 8px rgba(16,185,129,0.15)' : undefined
                                }}
                                onMouseUp={() => onEndConnection(node.id, key)}
                            >
                                {/* 左侧连接点 */}
                                <div 
                                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair hover:scale-125 transition-all z-10"
                                    style={{ backgroundColor: hasConnection ? '#10b981' : (isLightCanvas ? '#d1d5db' : '#4b5563'), borderColor: '#10b981' }}
                                    onMouseUp={() => onEndConnection(node.id, key)}
                                    title={`连接: ${info.description || info.fieldName}`}
                                />
                                
                                <div className="h-full px-3 flex items-center gap-2">
                                    {/* 类型图标 */}
                                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: typeConfig.bg }}>
                                        {renderTypeIcon()}
                                    </div>
                                    
                                    {/* 内容区 */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="text-[9px] font-medium truncate" style={{ color: themeColors.textPrimary }}>
                                                {info.description || info.fieldName}
                                            </span>
                                            <span className="text-[7px] px-1 rounded shrink-0" style={{ backgroundColor: typeConfig.bg, color: typeConfig.text }}>
                                                {fieldType}
                                            </span>
                                        </div>
                                        
                                        {/* 输入控件 */}
                                        {hasConnection ? (
                                            <div className="flex items-center gap-1">
                                                <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-[8px] text-emerald-400">已连接</span>
                                            </div>
                                        ) : isFileType ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    className="flex-1 rounded px-1.5 py-0.5 text-[8px] outline-none"
                                                    style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: themeColors.textSecondary }}
                                                    placeholder="Key或拉线"
                                                    value={nodeInputs[key] || ''}
                                                    onChange={(e) => handleNodeInputChange(key, e.target.value)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    className="p-0.5 rounded hover:scale-105 shrink-0"
                                                    style={{ backgroundColor: typeConfig.bg }}
                                                    onClick={() => handleFileUpload(key, fieldType)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke={typeConfig.text} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (fieldType === 'LIST' || fieldType === 'COMBO') && listOptions.length > 0 ? (
                                            <CustomSelect
                                                options={listOptions}
                                                value={nodeInputs[key] || defaultValue || listOptions[0] || ''}
                                                onChange={(val) => handleNodeInputChange(key, val)}
                                                isLightCanvas={isLightCanvas}
                                                themeColors={themeColors}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full rounded px-1.5 py-0.5 text-[8px] outline-none"
                                                style={{ backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: themeColors.textSecondary }}
                                                placeholder={info.fieldValue || '输入...'}
                                                value={nodeInputs[key] || ''}
                                                onChange={(e) => handleNodeInputChange(key, e.target.value)}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
            })())}
            </div>
        </div>
        
        {/* 错误提示 */}
        {errorMsg && (
            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-red-500/10 border border-red-500/30 px-2 py-1.5 text-[8px] text-red-300 flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errorMsg}
            </div>
        )}
        
        {isRunning && (
            <div className="absolute inset-0 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 rounded-xl" style={{ backgroundColor: isLightCanvas ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                <div className="w-8 h-8 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin mb-2"></div>
                <span className="text-[10px]" style={{ color: isLightCanvas ? '#059669' : '#6ee7b7' }}>正在执行...</span>
            </div>
        )}
    </div>
);
});
