import React, { useRef, useEffect } from 'react';
import { X, Trash2, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { TaskLogEntry } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface TaskLogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskLogEntry[];
  onClear: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function truncatePrompt(prompt: string, maxLen: number = 60): string {
  if (prompt.length <= maxLen) return prompt;
  return prompt.slice(0, maxLen) + '...';
}

const TaskCard: React.FC<{ task: TaskLogEntry }> = ({ task }) => {
  const { themeName } = useTheme();
  const isLight = themeName === 'light';

  const statusConfig = {
    success: { bg: 'bg-emerald-500', text: 'text-white', label: '成功', Icon: CheckCircle2, iconClass: 'text-white' },
    failed: { bg: 'bg-red-500', text: 'text-white', label: '失败', Icon: AlertCircle, iconClass: 'text-white' },
    running: { bg: 'bg-blue-500', text: 'text-white', label: '运行中', Icon: Loader2, iconClass: 'text-white animate-spin' },
  };

  const config = statusConfig[task.status];
  const StatusIcon = config.Icon;
  const duration = task.endTime ? formatDuration(task.endTime - task.startTime) : '—';

  return (
    <div className={`flex gap-3 p-3.5 rounded-xl border transition-colors ${
      task.status === 'failed'
        ? (isLight ? 'bg-red-50/60 border-red-200' : 'bg-red-500/5 border-red-500/15')
        : (isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/[0.02] border-white/[0.06]')
    }`}>
      {/* 左侧内容 */}
      <div className="flex-1 min-w-0">
        {/* 第一行：状态 + 类型 + 模型 + 耗时 */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
            <StatusIcon className={`w-3 h-3 ${config.iconClass}`} />
            {config.label}
          </span>
          <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-zinc-500'}`}>API</span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            isLight ? 'bg-gray-200/80 text-gray-700' : 'bg-white/[0.06] text-zinc-400'
          }`}>
            {task.model}
          </span>
          <span className={`text-xs flex items-center gap-1 ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
            <Clock className="w-3 h-3" />
            {duration}
          </span>
        </div>

        {/* 第二行：时间 + 输出 */}
        <div className={`text-xs mb-1.5 ${isLight ? 'text-gray-500' : 'text-zinc-500'}`}>
          {formatTime(task.startTime)}
          {task.resultCount !== undefined && (
            <span className="ml-2">输出{task.resultCount} custom-api</span>
          )}
        </div>

        {/* 第三行：提示词 */}
        <div className={`text-sm mb-1.5 leading-relaxed ${isLight ? 'text-gray-700' : 'text-zinc-300'}`}
          title={task.prompt}>
          {truncatePrompt(task.prompt)}
        </div>

        {/* 错误信息 */}
        {task.status === 'failed' && task.errorMessage && (
          <div className={`text-xs p-2.5 rounded-lg border ${
            isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {task.errorMessage}
          </div>
        )}
      </div>

      {/* 右侧预览图 */}
      {task.previewUrl && task.status === 'success' && (
        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-white/10">
          <img src={task.previewUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {task.status === 'running' && (
        <div className="flex-shrink-0 w-14 h-14 rounded-lg border border-white/10 flex items-center justify-center"
          style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        </div>
      )}
    </div>
  );
};

export const TaskLog: React.FC<TaskLogProps> = ({ isOpen, onClose, tasks, onClear }) => {
  const { themeName } = useTheme();
  const isLight = themeName === 'light';

  if (!isOpen) return null;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [tasks, isOpen]);

  const handleClear = () => {
    if (tasks.length === 0) return;
    if (window.confirm('确定要清空所有任务日志吗？')) {
      onClear();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗 */}
      <div className={`relative w-full max-w-[760px] rounded-[20px] overflow-hidden animate-fade-in flex flex-col ${
        isLight ? 'bg-white' : ''
      }`}
        style={{
          background: isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(23, 23, 23, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%)',
          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          maxHeight: '92vh',
        }}>

        {/* 头部 */}
        <div className={`px-6 pt-5 pb-4 flex items-center justify-between border-b ${
          isLight ? 'border-gray-200' : 'border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>任务日志</h2>
              <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                生图 & 生视频记录
                {tasks.length > 0 && <span className="ml-2">· {tasks.length} 条</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button
                onClick={handleClear}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isLight ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-white/10 text-zinc-500 hover:text-red-400'
                }`}
                title="清空日志"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'
              }`}
            >
              <X className={`w-4 h-4 ${isLight ? 'text-gray-500' : 'text-zinc-400'}`} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}>
                <Clock className={`w-8 h-8 ${isLight ? 'text-gray-300' : 'text-zinc-600'}`} />
              </div>
              <p className={`text-sm font-medium ${isLight ? 'text-gray-500' : 'text-zinc-500'}`}>暂无任务记录</p>
              <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-zinc-600'}`}>开始生成图片或视频后，任务会记录在这里</p>
            </div>
          ) : (
            tasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  );
};

