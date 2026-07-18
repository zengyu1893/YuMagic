import React from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { Icons } from '../Icons';
import { ProviderModelSelect } from './ProviderModelSelect';

export const LlmNode = React.memo(function LlmNode(props: NodeRendererProps & { localSystem: string; setLocalSystem: (v: string) => void }) {
  const { node, themeColors, isRunning, onUpdate, inputBaseClass,
    localSystem, setLocalSystem, localPrompt, setLocalPrompt, handleUpdate,
    onStartConnection, onEndConnection, incomingConnections, isLightCanvas } = props;
  // 复制到剪贴板
  const handleCopyContent = (e: React.MouseEvent) => {
      e.stopPropagation();
      // 复制 data.output 的内容
      if (node.data?.output) {
          navigator.clipboard.writeText(node.data.output);
      }
  };

  // 阻止滚轮事件冒泡到画布
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
  };

  // 检测系统端口和普通端口的连接
  const hasSystemConnection = incomingConnections.some(c => c.toPortKey === 'system');
  const hasDefaultConnection = incomingConnections.some(c => !c.toPortKey);

  // 获取系统端口上游文本（连接时显示预览）
  const systemUpstreamText = hasSystemConnection ? (node.data?.systemInstruction || '（已连接，执行时使用上游文本）') : null;

  // LLM节点始终显示配置界面，不根据 content 切换
  const hasOutput = !!node.data?.output;

  // 端口颜色
  const systemPortColor = hasSystemConnection ? '#a855f7' : 'rgba(168,85,247,0.35)';
  const defaultPortColor = hasDefaultConnection ? themeColors.nodeBorder : themeColors.nodeBorder;

  // 作为 drop target 接收上游连线（鼠标松开时创建连接）
  const handleSystemPortDrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndConnection(node.id, 'system');
  };
  const handleDefaultPortDrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndConnection(node.id);
  };
  // 端口圆点 mousedown：阻止节点拖拽（输入端口不发起连线，只作为 drop target）
  const handleSystemPortMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const handleDefaultPortMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="w-full h-full flex flex-col rounded-xl overflow-visible relative shadow-lg"
      style={{
        backgroundColor: themeColors.nodeBg,
        border: `1px solid ${themeColors.nodeBorder}`
      }}
    >
        {/* System Prompt Port — 左上角紫色端口 */}
        <div
          className="absolute left-0 top-[40px] -translate-x-1/2 w-3 h-3 rounded-full z-50 hover:scale-150 transition-all cursor-crosshair flex items-center justify-center border"
          style={{
            backgroundColor: systemPortColor,
            borderColor: '#a855f7',
            boxShadow: hasSystemConnection ? '0 0 6px rgba(168,85,247,0.5)' : 'none',
          }}
          onMouseDown={handleSystemPortMouseDown}
          onMouseUp={handleSystemPortDrop}
          title="系统提示词输入端口"
        />
        {/* Default User Prompt Port — 左侧中间端口 */}
        <div
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-50 hover:scale-150 transition-all cursor-crosshair flex items-center justify-center border"
          style={{
            backgroundColor: hasDefaultConnection ? themeColors.nodeBorder : 'rgba(128,128,128,0.3)',
            borderColor: hasDefaultConnection ? themeColors.textSecondary : themeColors.nodeBorder,
          }}
          onMouseDown={handleDefaultPortMouseDown}
          onMouseUp={handleDefaultPortDrop}
          title="用户提示词输入端口"
        />
        {/* Header */}
        <div
          className="h-8 flex items-center justify-between px-3"
          style={{
            backgroundColor: themeColors.headerBg,
            borderBottom: `1px solid ${themeColors.headerBorder}`
          }}
        >
            <div className="flex items-center gap-2">
                <Icons.Sparkles size={14} style={{ color: themeColors.textSecondary }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>{node.title || "LLM Logic"}</span>
            </div>
            <div className="flex items-center gap-1">
              {node.data?.llmProgress && (() => {
                const p = node.data.llmProgress;
                const isRunning = p.startsWith('执行中');
                const isCompleted = p.startsWith('完成');
                const hasFailed = p.includes('失败');
                return (
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: hasFailed ? 'rgba(239,68,68,0.15)' : isRunning ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                      color: hasFailed ? '#ef4444' : isRunning ? '#3b82f6' : '#22c55e',
                    }}>
                    {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    {isCompleted && <Icons.Check size={10} />}
                    <span>{p}</span>
                  </span>
                );
              })()}
              {hasOutput && !node.data?.llmProgress && (
                <button
                    onClick={handleCopyContent}
                    className="p-1 rounded hover:bg-black/5 transition-colors"
                    style={{ color: themeColors.textMuted }}
                    title="复制输出内容"
                >
                    <Icons.Copy size={12} />
                </button>
              )}
            </div>
        </div>

        <div
            className="flex-1 flex flex-col p-2 gap-2 overflow-hidden"
            onWheel={handleWheel}
        >
            {/* System Prompt (Optional) — 整个 section 作为 system 端口的 drop target */}
            <div className="flex flex-col gap-1 min-h-[30%]" onMouseDown={handleSystemPortMouseDown} onMouseUp={handleSystemPortDrop}>
                <label className="text-[9px] font-bold uppercase px-1 flex items-center gap-1" style={{ color: hasSystemConnection ? '#a855f7' : themeColors.textMuted }}>
                  {hasSystemConnection ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      System (已连接)
                    </>
                  ) : 'System Instruction (Optional)'}
                </label>
                {hasSystemConnection ? (
                  <div className="flex-1 rounded-md px-2 py-1 text-[10px] font-mono overflow-y-auto"
                    style={{
                      backgroundColor: isLightCanvas ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.1)',
                      border: '1px solid rgba(168,85,247,0.2)',
                      color: '#a78bfa',
                      opacity: 0.85,
                    }}>
                    {systemUpstreamText}
                  </div>
                ) : (
                  <textarea
                      className={inputBaseClass + " flex-1 resize-none font-mono"}
                      placeholder="Define behavior (e.g., 'You are a poet')..."
                      value={localSystem}
                      onChange={(e) => setLocalSystem(e.target.value)}
                      onBlur={handleUpdate}
                      onMouseDown={(e) => e.stopPropagation()}
                  />
                )}
            </div>

            {/* User Prompt — 整个 section 作为 default 端口的 drop target */}
            <div className="flex flex-col gap-1 flex-1" onMouseDown={handleDefaultPortMouseDown} onMouseUp={handleDefaultPortDrop}>
                <label className="text-[9px] font-bold uppercase px-1" style={{ color: themeColors.textMuted }}>User Prompt (Optional)</label>
                <textarea
                    className={inputBaseClass + " flex-1 resize-none"}
                    placeholder="Additional instruction..."
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    onBlur={handleUpdate}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </div>
        </div>

        {/* Badges */}
        {/* 聊天模型选择 */}
        <div className="px-2 py-1 border-t" style={{ borderColor: themeColors.headerBorder }}>
          <ProviderModelSelect node={node} kind="chat" onUpdate={onUpdate} isLightCanvas={isLightCanvas} />
        </div>
        {/* 最大输出 Token 数 */}
        <div className="px-2 py-1 border-t" style={{ borderColor: themeColors.headerBorder }}>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-bold uppercase whitespace-nowrap" style={{ color: themeColors.textMuted }}>
              Max Tokens
            </label>
            <input
              type="number"
              className={inputBaseClass + " w-20 text-center"}
              placeholder="20000"
              min={1}
              max={131072}
              step={1}
              value={node.data?.maxTokens ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Math.max(1, parseInt(e.target.value, 10) || 20000);
                onUpdate(node.id, { data: { ...node.data, maxTokens: val } });
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {/* 去除思考过程开关 */}
        <div className="px-2 py-1 border-t" style={{ borderColor: themeColors.headerBorder }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-3 h-3 accent-emerald-500"
              checked={node.data?.stripThinking !== false}
              onChange={(e) => {
                onUpdate(node.id, { data: { ...node.data, stripThinking: e.target.checked } });
              }}
            />
            <span className="text-[9px] font-bold uppercase" style={{ color: themeColors.textMuted }}>
              去除思考过程
            </span>
          </label>
        </div>
        <div
          className="h-6 px-2 flex items-center justify-between text-[9px] font-mono"
          style={{
            backgroundColor: themeColors.footerBg,
            borderTop: `1px solid ${themeColors.headerBorder}`,
            color: themeColors.textMuted
          }}
        >
            <span className={`flex items-center gap-1 ${hasOutput ? 'text-emerald-500' : ''}`}>
               {hasOutput ? 'COMPLETED' : `模型: ${node.data?.chatModel || '默认'}`}
            </span>
            <span className="flex items-center gap-1">
               OUT: <span style={{ color: themeColors.textSecondary }}>TEXT</span>
            </span>
        </div>

        {isRunning && (
            <SpinnerOverlay size="sm" />
        )}
    </div>
  );
});
