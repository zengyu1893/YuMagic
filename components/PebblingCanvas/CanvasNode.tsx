
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, useContext, useCallback } from 'react';
import { CanvasNode, NodeType, getNodeTypeColor, CASCADE_EXECUTABLE_TYPES } from '../../types/pebblingTypes';
import { Icons } from './Icons';
import { ChevronDown } from 'lucide-react';
import { useRHTaskQueue } from '../../contexts/RHTaskQueueContext';
import ModelContext from '../../contexts/ModelContext';
import { categorizeModel } from '../../services/modelService';
import { RH_PRESETS } from '../../constants/rhPresets';
import { AspectRatioSelector } from './shared/AspectRatioSelector';
import { ResolutionSelector } from './shared/ResolutionSelector';
import { SpinnerOverlay } from './shared/SpinnerOverlay';
import { DrawingBoardNode } from "./nodes/DrawingBoardNode";
import { RunningHubNode } from "./nodes/RunningHubNode";
import { BpNode } from "./nodes/BpNode";
import { IdeaNode } from "./nodes/IdeaNode";
import { ImageNode } from "./nodes/ImageNode";
import { VideoNode } from "./nodes/VideoNode";
import { VideoOutputNode } from "./nodes/VideoOutputNode";
import { FrameExtractorNode } from "./nodes/FrameExtractorNode";
import { RhMainNode } from "./nodes/RhMainNode";
import { RhParamNode } from "./nodes/RhParamNode";
import { RhConfigNode } from "./nodes/RhConfigNode";
import { ModelSelect } from "./nodes/ModelSelect";
import { CustomSelect } from "./nodes/CustomSelect";
import { LlmNode } from "./nodes/LlmNode";
import { PromptLineNode } from "./nodes/PromptLineNode";
import { ShowTextNode } from "./nodes/ShowTextNode";
import { ReplaceTextNode } from "./nodes/ReplaceTextNode";
import { OutputNode } from "./nodes/OutputNode";
import { EditNode } from "./nodes/EditNode";
import { UpscaleNode } from "./nodes/UpscaleNode";
import { RemoveBgNode } from "./nodes/RemoveBgNode";

// 动态导入 3D 组件以避免影响初始加载
const MultiAngle3D = lazy(() => import('./MultiAngle3D'));

// 香蕉SVG图标（edit 节点使用）
const BananaIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5,10.5c-0.8-0.8-1.9-1.3-3-1.4c0.1-0.5,0.2-1.1,0.2-1.6c0-2.2-1.8-4-4-4c-1.4,0-2.6,0.7-3.3,1.8 C9.6,4.2,8.4,3.5,7,3.5c-2.2,0-4,1.8-4,4c0,0.5,0.1,1.1,0.2,1.6c-1.1,0.1-2.2,0.6-3,1.4c-1.4,1.4-1.4,3.7,0,5.1 c0.7,0.7,1.6,1.1,2.5,1.1c0.9,0,1.8-0.4,2.5-1.1c0.7-0.7,1.1-1.6,1.1-2.5c0-0.9-0.4-1.8-1.1-2.5c-0.2-0.2-0.4-0.4-0.7-0.5 c-0.1-0.4-0.2-0.9-0.2-1.3c0-1.1,0.9-2,2-2s2,0.9,2,2c0,0.5-0.2,0.9-0.5,1.3c-0.5,0.6-0.7,1.3-0.7,2.1c0,0.9,0.4,1.8,1.1,2.5 c0.7,0.7,1.6,1.1,2.5,1.1s1.8-0.4,2.5-1.1c0.7-0.7,1.1-1.6,1.1-2.5c0-0.8-0.3-1.5-0.7-2.1c-0.3-0.4-0.5-0.8-0.5-1.3 c0-1.1,0.9-2,2-2s2,0.9,2,2c0,0.5-0.1,0.9-0.2,1.3c-0.2,0.1-0.5,0.3-0.7,0.5c-0.7,0.7-1.1,1.6-1.1,2.5c0,0.9,0.4,1.8,1.1,2.5 c0.7,0.7,1.6,1.1,2.5,1.1c0.9,0,1.8-0.4,2.5-1.1C21.9,14.2,21.9,11.9,20.5,10.5z"/>
  </svg>
);

// 模型选择下拉 — 画布节点通用
interface CanvasNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isLightCanvas?: boolean; // 画布浅色主题
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string, count?: number) => void; // count: 批量生成数量
  onStop: (id: string) => void;
  onDownload: (id: string) => void;
  onStartConnection: (nodeId: string, portType: 'in' | 'out', position: { x: number, y: number }) => void;
  onEndConnection: (nodeId: string, portKey?: string) => void; // portKey: rh-config 参数端口标识
  onDragStart: (e: React.MouseEvent, id: string) => void;
  scale: number;
  effectiveColor?: string;
  onCreateToolNode?: (sourceNodeId: string, toolType: NodeType, position: { x: number, y: number }) => void;
  onExtractFrame?: (nodeId: string, position: 'first' | 'last' | number) => void; // 提取视频帧（首帧/尾帧/任意秒数）
  onCreateFrameExtractor?: (sourceVideoNodeId: string) => void; // 创建帧提取器节点
  onExtractFrameFromExtractor?: (nodeId: string, time: number) => void; // 从帧提取器提取帧
  hasDownstream?: boolean; // 是否有下游连接
  incomingConnections?: Array<{ fromNode: string; toPortKey?: string }>; // 连入当前节点的连接
  onRetryVideoDownload?: (nodeId: string) => void; // 重试视频下载
  isDragging?: boolean; // 是否正在拖拽中，用于跳过 CSS transition
  cascadeCount?: number; // 上游可执行节点数量（用于一键运行按钮）
  isCascadeTerminal?: boolean; // 是否为级联末端节点
  autoResolvedContent?: string; // ShowText节点：自动解析的上游文字
  onCascadeExecute?: (id: string) => void; // 一键运行级联
  onClearImage?: (nodeId: string) => void; // Image 节点清除图片内容
  onImageContextMenu?: (action: 'edit' | 'addToDesktop', imageUrl: string, imageIndex: number, nodeId: string) => void; // OUTPUT 节点图片右键
  onPreviewImage?: (imageUrl: string) => void; // OUTPUT 节点预览图片
  onContextMenu?: (e: React.MouseEvent) => void; // 节点右键菜单
}

const CanvasNodeItem: React.FC<CanvasNodeProps> = ({ 
  node, 
  isSelected,
  isLightCanvas = false,
  onSelect, 
  onUpdate,
  onDelete,
  onExecute,
  onStop,
  onDownload,
  onStartConnection,
  onEndConnection,
  onDragStart,
  scale,
  effectiveColor,
  onCreateToolNode,
  onExtractFrame,
  onCreateFrameExtractor,
  onExtractFrameFromExtractor,
  hasDownstream = false,
  incomingConnections = [],
  onRetryVideoDownload,
  isDragging = false,
  cascadeCount = 0,
  isCascadeTerminal = false,
  autoResolvedContent,
  onCascadeExecute,
  onClearImage,
  onImageContextMenu,
  onPreviewImage,
  onContextMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(node.content);
  const [localPrompt, setLocalPrompt] = useState(node.data?.prompt || '');
  const [localSystem, setLocalSystem] = useState(node.data?.systemInstruction || '');
  const [batchCount, setBatchCount] = useState(1); // 批量生成数量
  
  // RH 任务队列状态
  const rhTaskQueue = useRHTaskQueue();
  const nodeTaskStatus = node.type === 'rh-config' ? rhTaskQueue.getNodeTaskStatus(node.id) : null;

  // 模型列表（用于节点模型选择）
  // 优先使用用户在设置里选的模型，没选时才兜底 API 全量
  const modelCtx = useContext(ModelContext);
  const allModels = modelCtx?.allModels || [];
  const userImageModels = modelCtx?.imageModels || [];
  const userChatModels = modelCtx?.chatModels || [];
  const userVideoModels = modelCtx?.videoModels || [];
  const fallbackModels = React.useMemo(() => ({
    apiImageModels: allModels.filter(m => categorizeModel(m.id) === 'image').map(m => m.id),
    apiChatModels: allModels.filter(m => categorizeModel(m.id) === 'chat').map(m => m.id),
    apiVideoModels: allModels.filter(m => categorizeModel(m.id) === 'video').map(m => m.id),
  }), [allModels]);
  // 用户选了就用用户的，没选才兜底全量
  const imageModels = userImageModels.length > 0 ? userImageModels : fallbackModels.apiImageModels;
  const chatModels = userChatModels.length > 0 ? userChatModels : fallbackModels.apiChatModels;
  const videoModels = userVideoModels.length > 0 ? userVideoModels : fallbackModels.apiVideoModels;

  // 主题颜色变量 (memoized — only depends on isLightCanvas boolean)
  const themeColors = React.useMemo(() => ({
    nodeBg: isLightCanvas ? '#ffffff' : '#1c1c1e',
    nodeBgAlt: isLightCanvas ? '#f5f5f7' : '#0a0a0f',
    nodeBorder: isLightCanvas ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)',
    textPrimary: isLightCanvas ? '#1d1d1f' : '#ffffff',
    textSecondary: isLightCanvas ? '#6e6e73' : '#d4d4d8',
    textMuted: isLightCanvas ? '#8e8e93' : '#a1a1aa',
    inputBg: isLightCanvas ? '#f5f5f7' : '#0a0a0f',
    inputBorder: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    headerBg: isLightCanvas ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
    headerBorder: isLightCanvas ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
    footerBg: isLightCanvas ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.2)',
  }), [isLightCanvas]);
  
  // Resize Node Specific State
  const [resizeMode, setResizeMode] = useState<'longest' | 'shortest' | 'width' | 'height' | 'exact'>(node.data?.resizeMode || 'longest');
  const [resizeWidth, setResizeWidth] = useState<number>(node.data?.resizeWidth || 1024);
  const [resizeHeight, setResizeHeight] = useState<number>(node.data?.resizeHeight || 1024);

  // MultiAngle Node Specific State
  const [angleRotate, setAngleRotate] = useState<number>(node.data?.angleRotate ?? 0);
  const [angleVertical, setAngleVertical] = useState<number>(node.data?.angleVertical ?? 0);
  const [angleZoom, setAngleZoom] = useState<number>(node.data?.angleZoom ?? 5);
  const [angleDetailMode, setAngleDetailMode] = useState<boolean>(node.data?.angleDetailMode ?? true);

  // 媒体信息状态（图片/视频通用）
  const [showMediaInfo, setShowMediaInfo] = useState(false);
  const [showToolbox, setShowToolbox] = useState(false);
  const [mediaMetadata, setMediaMetadata] = useState<{width: number, height: number, size: string, format: string, duration?: string} | null>(null);
  const [customFrameTime, setCustomFrameTime] = useState<string>(''); // 任意帧提取时间（秒）

  const [isResizing, setIsResizing] = useState(false);
  const [openSelectKey, setOpenSelectKey] = useState<string | null>(null); // 自定义下拉框状态
  const [rhBatchCount, setRhBatchCount] = useState(1); // rh-config 节点批次数量
  const nodeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalContent(node.content);
    setLocalPrompt(node.data?.prompt || '');
    setLocalSystem(node.data?.systemInstruction || '');
    if (node.data?.resizeMode) setResizeMode(node.data.resizeMode);
    if (node.data?.resizeWidth) setResizeWidth(node.data.resizeWidth);
    if (node.data?.resizeHeight) setResizeHeight(node.data.resizeHeight);
    if (node.data?.angleRotate !== undefined) setAngleRotate(node.data.angleRotate);
    if (node.data?.angleVertical !== undefined) setAngleVertical(node.data.angleVertical);
    if (node.data?.angleZoom !== undefined) setAngleZoom(node.data.angleZoom);
    if (node.data?.angleDetailMode !== undefined) setAngleDetailMode(node.data.angleDetailMode);
    
    // 计算媒体元数据（图片/视频）
    const isLocalFile = node.content && node.content.startsWith('/files/');
    const isImageContent = node.content && (node.content.startsWith('data:image') || (node.content.startsWith('http') && !node.content.includes('.mp4')) || (isLocalFile && !node.content.includes('.mp4')));
    const isVideoContent = node.content && (node.content.startsWith('data:video') || node.content.includes('.mp4'));
    
    if (isImageContent) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // 计算文件大小
        let size = '未知';
        if (node.content.startsWith('data:image')) {
          const base64str = node.content.split(',')[1] || '';
          const sizeBytes = (base64str.length * 3) / 4;
          if (sizeBytes > 1024 * 1024) {
            size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
          } else {
            size = `${(sizeBytes / 1024).toFixed(1)} KB`;
          }
        } else if (node.content.startsWith('/files/') || node.content.startsWith('http://localhost')) {
          // 本地文件：HEAD 请求安全且快
          try {
            const fetchUrl = node.content.startsWith('/files/') ? `http://localhost:8765${node.content}` : node.content;
            const response = await fetch(fetchUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              const sizeBytes = parseInt(contentLength, 10);
              if (sizeBytes > 1024 * 1024) {
                size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
              } else {
                size = `${(sizeBytes / 1024).toFixed(1)} KB`;
              }
            }
          } catch (e) {
            // HEAD 失败，保持未知
          }
        } else if (node.content.startsWith('http')) {
          // 远程 URL（Minio 预签名等）：HEAD 会 403，跳过大小获取
          size = '远程';
        }
        
        // 获取格式
        let format = '未知';
        if (node.content.includes('data:image/png') || node.content.includes('.png')) format = 'PNG';
        else if (node.content.includes('data:image/jpeg') || node.content.includes('data:image/jpg') || node.content.includes('.jpg') || node.content.includes('.jpeg')) format = 'JPEG';
        else if (node.content.includes('data:image/webp') || node.content.includes('.webp')) format = 'WebP';
        else if (node.content.includes('data:image/gif') || node.content.includes('.gif')) format = 'GIF';
        else format = 'JPEG'; // 默认格式
        
        setMediaMetadata({ width, height, size, format });
      };
      // 本地文件需要添加域名
      img.src = node.content.startsWith('/files/') ? `http://localhost:8765${node.content}` : node.content;
    } else if (isVideoContent) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = async () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration ? `${Math.round(video.duration)}s` : '未知';
        
        // 计算文件大小
        let size = '未知';
        if (node.content.startsWith('data:video')) {
          const base64str = node.content.split(',')[1] || '';
          const sizeBytes = (base64str.length * 3) / 4;
          if (sizeBytes > 1024 * 1024) {
            size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
          } else {
            size = `${(sizeBytes / 1024).toFixed(1)} KB`;
          }
        } else if (node.content.startsWith('/files/') || node.content.startsWith('http://localhost')) {
          // 本地文件：HEAD 请求安全且快
          try {
            const fetchUrl = node.content.startsWith('/files/') ? `http://localhost:8765${node.content}` : node.content;
            const response = await fetch(fetchUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              const sizeBytes = parseInt(contentLength, 10);
              if (sizeBytes > 1024 * 1024) {
                size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
              } else {
                size = `${(sizeBytes / 1024).toFixed(1)} KB`;
              }
            }
          } catch (e) {
            // 失败时保持未知
          }
        } else if (node.content.startsWith('http')) {
          // 远程 URL：HEAD 会 403，跳过大小获取
          size = '远程';
        }
        
        setMediaMetadata({ width, height, size, format: 'MP4', duration });
      };
      // 本地文件需要添加域名
      video.src = node.content.startsWith('/files/') ? `http://localhost:8765${node.content}` : node.content;
    }
  }, [node.content, node.type, node.data?.outputType]);

  // Enter Key to Edit shortcut
  useEffect(() => {
      if (isSelected && !isEditing && (node.type === 'text' || node.type === 'idea')) {
          const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsEditing(true);
              }
          };
          window.addEventListener('keydown', handleKeyDown);
          return () => window.removeEventListener('keydown', handleKeyDown);
      }
  }, [isSelected, isEditing, node.type]);

  const handleUpdate = useCallback(() => {
    // LLM 节点的 content 由执行逻辑管理（data.output），handleUpdate 不应覆盖
    const effectiveContent = node.type === 'llm' ? node.content : localContent;
    onUpdate(node.id, {
        content: effectiveContent,
        data: {
            ...node.data,
            prompt: localPrompt,
            systemInstruction: localSystem,
            resizeMode: resizeMode,
            resizeWidth: resizeWidth,
            resizeHeight: resizeHeight
        }
    });
  }, [localContent, localPrompt, localSystem, node.content, node.data, node.id, node.type, onUpdate, resizeHeight, resizeMode, resizeWidth]);

  const handleBlur = () => {
        setIsEditing(false);
        handleUpdate();
  };

  const handleExecuteWithLatestEdits = useCallback((id: string, count?: number) => {
    handleUpdate();
    onExecute(id, count);
  }, [handleUpdate, onExecute]);

  const handleCascadeExecuteWithLatestEdits = useCallback((id: string) => {
    handleUpdate();
    onCascadeExecute?.(id);
  }, [handleUpdate, onCascadeExecute]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width;
    const startHeight = node.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;
        onUpdate(node.id, {
            width: Math.max(150, startWidth + deltaX),
            height: Math.max(100, startHeight + deltaY)
        });
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handlePortDown = (e: React.MouseEvent, type: 'in' | 'out') => {
      e.stopPropagation();
      e.preventDefault(); 
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      onStartConnection(node.id, type, { x, y });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  // 🔧 上传图片后立即设置 status 为 completed（关键修复点）
                  onUpdate(node.id, { 
                      content: ev.target.result as string,
                      status: 'completed' // 标记为已完成，避免级联执行时重复生成
                  });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // 计算最大公约数
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // 计算宽高比
  const getAspectRatio = (width: number, height: number): string => {
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };

  // Modern Input Style - 根据主题调整
  const inputBaseClass = isLightCanvas
    ? "w-full bg-transparent border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:border-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed placeholder-gray-400"
    : "w-full bg-transparent border border-white/10 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed placeholder-zinc-600";

  // 黑白风格 - 所有节点统一使用灰白色
  const getTypeColor = (type: NodeType) => {
      return 'bg-white/80 border-white/60';
  };

  // 连接点颜色 - 根据主题调整
  const outputPortColor = isLightCanvas 
    ? 'bg-gray-700 border-gray-500' 
    : 'bg-white/80 border-white/60';
  const inputPortColor = isLightCanvas 
    ? 'bg-gray-400 border-gray-500 group-hover/port:bg-gray-700' 
    : 'bg-zinc-600 border-zinc-400 group-hover/port:bg-white';

  // 控件背景色 - 用于按钮组、输入框等
  const controlBg = isLightCanvas ? 'bg-transparent' : 'bg-transparent';
  // 选中状态背景
  const selectedBg = isLightCanvas ? 'bg-blue-100' : 'bg-blue-500/30';
  const selectedText = isLightCanvas ? 'text-blue-700' : 'text-blue-200';
  // 底部状态栏背景
  const footerBarBg = isLightCanvas ? 'bg-gray-50' : 'bg-black/30';

  const isRelay = node.type === 'relay';
  const isRunning = node.status === 'running';
  const isToolNode = ['edit', 'remove-bg', 'upscale', 'resize'].includes(node.type);
  const showRunningIndicator = isRunning && !isToolNode;

  // --- Renderers ---

  const renderLLMNode = () => {
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

      // LLM节点始终显示配置界面，不根据 content 切换
      const hasOutput = node.data?.output && node.status === 'completed';

      return (
        <div 
          className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg"
          style={{ 
            backgroundColor: themeColors.nodeBg, 
            border: `1px solid ${themeColors.nodeBorder}` 
          }}
        >
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
                {hasOutput && (
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

            <div 
                className="flex-1 flex flex-col p-2 gap-2 overflow-hidden"
                onWheel={handleWheel}
            >
                {/* System Prompt (Optional) */}
                <div className="flex flex-col gap-1 min-h-[30%]">
                    <label className="text-[9px] font-bold uppercase px-1" style={{ color: themeColors.textMuted }}>System Instruction (Optional)</label>
                    <textarea 
                        className={inputBaseClass + " flex-1 resize-none font-mono"}
                        placeholder="Define behavior (e.g., 'You are a poet')..."
                        value={localSystem}
                        onChange={(e) => setLocalSystem(e.target.value)}
                        onBlur={handleUpdate}
                        onMouseDown={(e) => e.stopPropagation()} 
                    />
                </div>
                
                {/* User Prompt */}
                <div className="flex flex-col gap-1 flex-1">
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
            {chatModels.length > 0 && (
              <div className="px-2 py-1 border-t" style={{ borderColor: themeColors.headerBorder }}>
                <ModelSelect
                  models={chatModels}
                  value={node.data?.chatModel || chatModels[0] || ''}
                  onChange={(m) => onUpdate(node.id, { data: { ...node.data, chatModel: m } })}
                  colorClass="bg-blue-100 text-blue-700"
                />
              </div>
            )}
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
  };

  const renderResizeNode = () => {
    // Determine which inputs are enabled based on mode
    const isWidthEnabled = resizeMode === 'width' || resizeMode === 'exact' || resizeMode === 'longest' || resizeMode === 'shortest';
    const isHeightEnabled = resizeMode === 'height' || resizeMode === 'exact';
    
    const widthLabel = (resizeMode === 'longest' || resizeMode === 'shortest') ? 'Target (px)' : 'Width (px)';

    // 切换到 3D 模式
    const switchTo3D = () => {
      onUpdate(node.id, {
        data: { ...node.data, nodeMode: '3d' }
      });
    };

    // If there's output content, show the result image
    if (node.content && (node.content.startsWith('data:image') || node.content.startsWith('http://') || node.content.startsWith('https://'))) {
        // 图片加载后自动调整节点尺寸以匹配图片比例
        const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;
            const aspectRatio = imgWidth / imgHeight;
            
            // 保持宽度不变，根据比例计算高度（加上标题栏32px）
            const newHeight = Math.round(node.width / aspectRatio) + 32;
            // 只有当高度差异较大时才更新，避免无限循环
            if (Math.abs(newHeight - node.height) > 10) {
                onUpdate(node.id, { height: newHeight });
            }
        };
        
        return (
            <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
                <div className="h-8 flex items-center px-3 gap-2 shrink-0" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
                    <Icons.Resize size={14} style={{ color: themeColors.textSecondary }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>Resized</span>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    <img 
                        src={node.content} 
                        alt="Resized" 
                        className="w-full h-full object-contain" 
                        draggable={false}
                        onLoad={handleImageLoad}
                        style={{
                            imageRendering: 'auto',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                        } as React.CSSProperties}
                    />
                    
                    {/* 信息查询按钮 */}
                    <div 
                      className="absolute top-2 right-2 z-20"
                      onMouseEnter={() => setShowMediaInfo(true)}
                      onMouseLeave={() => setShowMediaInfo(false)}
                    >
                      <div 
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all"
                        title="图片信息"
                      >
                        <Icons.Info size={14} className="text-white/70" />
                      </div>
                      
                      {/* 信息浮窗 */}
                      {showMediaInfo && mediaMetadata && (
                        <div 
                          className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-0.5">
                            <div><span className="text-zinc-500">宽度:</span> {mediaMetadata.width} px</div>
                            <div><span className="text-zinc-500">高度:</span> {mediaMetadata.height} px</div>
                            <div><span className="text-zinc-500">比例:</span> {getAspectRatio(mediaMetadata.width, mediaMetadata.height)}</div>
                            <div><span className="text-zinc-500">大小:</span> {mediaMetadata.size}</div>
                            <div><span className="text-zinc-500">格式:</span> {mediaMetadata.format}</div>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
                {isRunning && (
                    <SpinnerOverlay size="sm" />
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
            <div className="h-8 flex items-center justify-between px-3 gap-2 shrink-0" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
                <div className="flex items-center gap-2">
                    <Icons.Resize size={14} style={{ color: themeColors.textSecondary }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>Smart Resize</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); switchTo3D(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="px-1.5 py-0.5 rounded text-[8px] bg-cyan-800/40 hover:bg-cyan-700/50 text-cyan-300 transition-colors"
                  title="切换到 3D 视角模式"
                >
                  ↔ 3D
                </button>
            </div>
            <div className="flex-1 p-3 flex flex-col justify-center gap-3">
                 <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase px-1">Resize Mode</label>
                     <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                            className={inputBaseClass + " flex items-center justify-between gap-1 cursor-pointer hover:border-blue-500/30"}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenSelectKey(openSelectKey === 'resize-mode' ? null : 'resize-mode');
                            }}
                        >
                            <span className="truncate">
                                {resizeMode === 'longest' ? 'Longest Side' :
                                 resizeMode === 'shortest' ? 'Shortest Side' :
                                 resizeMode === 'width' ? 'Fixed Width' :
                                 resizeMode === 'height' ? 'Fixed Height' : 'Exact (Stretch)'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openSelectKey === 'resize-mode' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSelectKey === 'resize-mode' && (
                            <div className="absolute z-50 w-full mt-1 bg-[#1a1a1e] border border-white/20 rounded-lg shadow-xl overflow-hidden">
                                {[
                                    { value: 'longest', label: 'Longest Side' },
                                    { value: 'shortest', label: 'Shortest Side' },
                                    { value: 'width', label: 'Fixed Width' },
                                    { value: 'height', label: 'Fixed Height' },
                                    { value: 'exact', label: 'Exact (Stretch)' }
                                ].map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
                                            resizeMode === opt.value 
                                                ? 'bg-blue-500/20 text-blue-300' 
                                                : 'text-zinc-300 hover:bg-white/10'
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newVal = opt.value as any;
                                            setResizeMode(newVal);
                                            onUpdate(node.id, { 
                                                data: { 
                                                    ...node.data, 
                                                    resizeMode: newVal,
                                                    resizeWidth,
                                                    resizeHeight
                                                }
                                            });
                                            setOpenSelectKey(null);
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className={`text-[9px] font-bold uppercase px-1 transition-colors ${isWidthEnabled ? 'text-zinc-500' : 'text-zinc-700'}`}>{widthLabel}</label>
                        <input 
                            type="number"
                            value={resizeWidth}
                            disabled={!isWidthEnabled}
                            onChange={(e) => setResizeWidth(parseInt(e.target.value) || 0)}
                            onBlur={handleUpdate}
                            className={inputBaseClass}
                            placeholder="W"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className={`text-[9px] font-bold uppercase px-1 transition-colors ${isHeightEnabled ? 'text-zinc-500' : 'text-zinc-700'}`}>Height (px)</label>
                        <input 
                            type="number"
                            value={resizeHeight}
                            disabled={!isHeightEnabled}
                            onChange={(e) => setResizeHeight(parseInt(e.target.value) || 0)}
                            onBlur={handleUpdate}
                            className={inputBaseClass}
                            placeholder={isHeightEnabled ? "H" : "Auto"}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                     </div>
                 </div>

            </div>
            <div className="h-6 bg-black/20 border-t border-white/5 px-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1">IN: <span className="text-zinc-300">IMG</span></span>
                <span className="flex items-center gap-1">OUT: <span className="text-zinc-300">IMG</span></span>
            </div>
            {isRunning && (
                <SpinnerOverlay size="sm" />
            )}
        </div>
    );
  };

  // 视角控制辅助函数
  const getHorizontalDirection = (angle: number, detail: boolean): string => {
    const hAngle = angle % 360;
    const suffix = detail ? "" : " quarter";
    if (hAngle < 22.5 || hAngle >= 337.5) return "front view";
    if (hAngle < 67.5) return `front-right${suffix} view`;
    if (hAngle < 112.5) return "right side view";
    if (hAngle < 157.5) return `back-right${suffix} view`;
    if (hAngle < 202.5) return "back view";
    if (hAngle < 247.5) return `back-left${suffix} view`;
    if (hAngle < 292.5) return "left side view";
    return `front-left${suffix} view`;
  };
  const getVerticalDirection = (v: number, detail: boolean): string => {
    if (detail) {
      if (v < -15) return "low angle";
      if (v < 15) return "eye level";
      if (v < 45) return "high angle";
      if (v < 75) return "bird's eye view";
      return "top-down view";
    } else {
      if (v < -15) return "low-angle shot";
      if (v < 15) return "eye-level shot";
      if (v < 75) return "elevated shot";
      return "high-angle shot";
    }
  };
  const getDistanceDesc = (z: number, detail: boolean): string => {
    if (detail) {
      if (z < 2) return "wide shot";
      if (z < 4) return "medium-wide shot";
      if (z < 6) return "medium shot";
      if (z < 8) return "medium close-up";
      return "close-up";
    } else {
      if (z < 2) return "wide shot";
      if (z < 6) return "medium shot";
      return "close-up";
    }
  };
  const getHorizontalLabel = (angle: number): string => {
    const hAngle = angle % 360;
    if (hAngle < 22.5 || hAngle >= 337.5) return "正面";
    if (hAngle < 67.5) return "右前";
    if (hAngle < 112.5) return "右侧";
    if (hAngle < 157.5) return "右后";
    if (hAngle < 202.5) return "背面";
    if (hAngle < 247.5) return "左后";
    if (hAngle < 292.5) return "左侧";
    return "左前";
  };
  const getVerticalLabel = (v: number): string => {
    if (v < -15) return "仰视";
    if (v < 15) return "平视";
    if (v < 45) return "高角度";
    if (v < 75) return "鸟瞰";
    return "俯视";
  };
  const getZoomLabel = (z: number): string => {
    if (z < 2) return "远景";
    if (z < 4) return "中远景";
    if (z < 6) return "中景";
    if (z < 8) return "中近景";
    return "特写";
  };

  const renderMultiAngleNode = () => {
    const hDir = getHorizontalDirection(angleRotate, angleDetailMode);
    const vDir = getVerticalDirection(angleVertical, angleDetailMode);
    const dist = getDistanceDesc(angleZoom, angleDetailMode);
    const anglePrompt = angleDetailMode 
      ? `${hDir}, ${vDir}, ${dist} (horizontal: ${Math.round(angleRotate)}, vertical: ${Math.round(angleVertical)}, zoom: ${angleZoom.toFixed(1)})`
      : `${hDir} ${vDir} ${dist}`;

    // 模式切换: '3d' | 'resize'
    const nodeMode = node.data?.nodeMode || '3d';

    const handleAngleUpdate = (updates: {rotate?: number, vertical?: number, zoom?: number, detail?: boolean}) => {
      const newRotate = updates.rotate ?? angleRotate;
      const newVertical = updates.vertical ?? angleVertical;
      const newZoom = updates.zoom ?? angleZoom;
      const newDetail = updates.detail ?? angleDetailMode;
      
      setAngleRotate(newRotate);
      setAngleVertical(newVertical);
      setAngleZoom(newZoom);
      if (updates.detail !== undefined) setAngleDetailMode(newDetail);
      
      const newHDir = getHorizontalDirection(newRotate, newDetail);
      const newVDir = getVerticalDirection(newVertical, newDetail);
      const newDist = getDistanceDesc(newZoom, newDetail);
      const newPrompt = newDetail 
        ? `${newHDir}, ${newVDir}, ${newDist} (horizontal: ${Math.round(newRotate)}, vertical: ${Math.round(newVertical)}, zoom: ${newZoom.toFixed(1)})`
        : `${newHDir} ${newVDir} ${newDist}`;
      
      onUpdate(node.id, {
        content: newPrompt,
        data: {
          ...node.data,
          angleRotate: newRotate,
          angleVertical: newVertical,
          angleZoom: newZoom,
          angleDetailMode: newDetail,
          anglePrompt: newPrompt
        }
      });
    };

    // 从上游获取图片
    const handleRunLoadImage = () => {
      // 触发完整节点执行流程，让 resolveInputs 获取上游图片
      handleExecuteWithLatestEdits(node.id);
    };

    // 切换模式
    const toggleMode = () => {
      const newMode = nodeMode === '3d' ? 'resize' : '3d';
      onUpdate(node.id, {
        data: { ...node.data, nodeMode: newMode }
      });
    };

    // 原有 Resize 模式
    if (nodeMode === 'resize') {
      return renderResizeNode();
    }

    return (
      <div className="w-full h-full bg-[#080810] flex flex-col border border-cyan-500/30 rounded-xl overflow-hidden relative shadow-lg">
        {/* 标题栏 - 支持拖拽 */}
        <div className="h-7 border-b border-cyan-900/40 flex items-center justify-between px-2 bg-cyan-900/20 shrink-0 cursor-move">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">\uD83D\uDCF7</span>
            <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">3D 视角</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMode(); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded text-[8px] bg-cyan-800/40 hover:bg-cyan-700/50 text-cyan-300 transition-colors"
              title="切换到 Resize 模式"
            >
              ↔ Resize
            </button>
          </div>
        </div>

        {/* 3D 视图 */}
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-[#080810]">
            <div className="w-6 h-6 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        }>
          <MultiAngle3D
            rotate={angleRotate}
            vertical={angleVertical}
            zoom={angleZoom}
            onChange={handleAngleUpdate}
            imageUrl={node.data?.inputImageUrl || node.data?.previewImage}
            width={node.width - 4}
            height={Math.max(140, node.height - 100)}
            onRun={handleRunLoadImage}
            isRunning={isRunning}
            onExecute={() => handleExecuteWithLatestEdits(node.id)}
          />
        </Suspense>
        
        {/* 详细模式开关 & 提示词预览 */}
        <div className="px-2 py-1 space-y-1 bg-[#0a0a14] border-t border-cyan-900/30">
          <label className="flex items-center gap-2 text-[8px] text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={angleDetailMode}
              onChange={(e) => handleAngleUpdate({detail: e.target.checked})}
              className="w-2.5 h-2.5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
              onMouseDown={(e) => e.stopPropagation()}
            />
            <span>附加详细参数</span>
          </label>
          
          <div className={`rounded ${controlBg} border border-cyan-900/30 px-1.5 py-0.5`}>
            <div className="text-[7px] text-cyan-300/80 leading-relaxed break-words font-mono truncate">
              {anglePrompt}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 拆分为稳定/动态两部分，减少 memo 失效频率
  const stableRendererProps = useMemo(() => ({
      onSelect, onUpdate, onDelete, onStop, onDownload,
    onStartConnection, onEndConnection, onDragStart,
    onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload,
    nodeRef, fileInputRef, folderInputRef,
    imageModels, chatModels, videoModels,
    inputBaseClass, footerBarBg, controlBg, selectedBg, selectedText,
    onClearImage, onImageContextMenu, onPreviewImage,
    setShowMediaInfo, getAspectRatio,
    handleUpdate, handleFileUpload, setLocalPrompt,
    onExecute: handleExecuteWithLatestEdits,
  }), [onSelect, onUpdate, onDelete, onStop, onDownload,
    onStartConnection, onEndConnection,
    onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onRetryVideoDownload,
    imageModels, chatModels, videoModels, inputBaseClass,
    onClearImage, onImageContextMenu, onPreviewImage,
    handleUpdate, handleFileUpload, handleExecuteWithLatestEdits]);

  const dynamicRendererProps = useMemo(() => ({
    node, isSelected, isLightCanvas,
    themeColors, hasDownstream, incomingConnections,
    isRunning, showRunningIndicator,
    localPrompt, mediaMetadata, showMediaInfo,
    autoResolvedContent,
  }), [node, isSelected, isLightCanvas,
    themeColors, hasDownstream, incomingConnections,
    isRunning, showRunningIndicator,
    localPrompt, mediaMetadata, showMediaInfo, autoResolvedContent]);

  // 合并为最终 props
  const nodeRendererBaseProps = useMemo(() => ({
    ...stableRendererProps, ...dynamicRendererProps,
  }), [stableRendererProps, dynamicRendererProps]);

  const renderContent = () => {
    if (node.type === 'relay') {
        return (
            <div className="w-full h-full flex items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
                <Icons.Relay size={16} style={{ color: themeColors.textSecondary }} />
            </div>
        );
    }

    // BP节点 - 只展示变量输入和设置，执行后显示图片
    // BP节点 — 已提取到 nodes/BpNode.tsx
    if (node.type === 'bp') {
        return <BpNode {...nodeRendererBaseProps} />;
    }

    // Idea节点 — 已提取到 nodes/IdeaNode.tsx
    if (node.type === 'idea') {
        return <IdeaNode {...nodeRendererBaseProps} />;
    }

    // Image节点 — 已提取到 nodes/ImageNode.tsx
    if (node.type === 'image') {
        return <ImageNode {...nodeRendererBaseProps} />;
    }

    // Video节点 — 已提取到 nodes/VideoNode.tsx
    if (node.type === 'video') {
        return <VideoNode {...nodeRendererBaseProps} />;
    }

    // Output节点 — 已提取到 nodes/OutputNode.tsx
    if (node.type === 'output') {
        return <OutputNode {...nodeRendererBaseProps} />;
    }

    // VideoOutput节点 — 已提取到 nodes/VideoOutputNode.tsx
    if (node.type === 'video-output') {
        return <VideoOutputNode {...nodeRendererBaseProps} />;
    }

    // FrameExtractor节点 — 已提取到 nodes/FrameExtractorNode.tsx
    if (node.type === 'frame-extractor') {
        return <FrameExtractorNode {...nodeRendererBaseProps} />;
    }

    // LLM节点 — 已提取到 nodes/LlmNode.tsx
    if (node.type === 'llm') {
        return <LlmNode {...nodeRendererBaseProps} localSystem={localSystem} setLocalSystem={setLocalSystem} />;
    }

    // Resize/MultiAngle节点 — keep inline (deeply coupled with angle state)
    if (node.type === 'resize') {
        return renderMultiAngleNode();
    }

    // RunningHub节点 — 已提取到 nodes/RunningHubNode.tsx
    if (node.type === 'runninghub') {
        return <RunningHubNode {...nodeRendererBaseProps} />;
    }

    // RH Main节点 — 已提取到 nodes/RhMainNode.tsx
    if (node.type === 'rh-main') {
        return <RhMainNode {...nodeRendererBaseProps} />;
    }

    // RH Param节点 — 已提取到 nodes/RhParamNode.tsx
    if (node.type === 'rh-param') {
        return <RhParamNode {...nodeRendererBaseProps} />;
    }

    // RH Config节点 — 已提取到 nodes/RhConfigNode.tsx
    if (node.type === 'rh-config') {
        return <RhConfigNode {...nodeRendererBaseProps} />;
    }

    // 绘画板节点 — 已提取到 nodes/DrawingBoardNode.tsx
    if (node.type === 'drawing-board') {
        return <DrawingBoardNode {...nodeRendererBaseProps} showMediaInfo={showMediaInfo} setShowMediaInfo={setShowMediaInfo} getAspectRatio={getAspectRatio} />;
    }

    // PromptLine节点 — 已提取到 nodes/PromptLineNode.tsx
    if (node.type === 'prompt-line') {
        return <PromptLineNode {...nodeRendererBaseProps} />;
    }

    // ShowText节点 — 已提取到 nodes/ShowTextNode.tsx
    if (node.type === 'show-text') {
        return <ShowTextNode {...nodeRendererBaseProps} />;
    }

    // ReplaceText节点 — 已提取到 nodes/ReplaceTextNode.tsx
    if (node.type === 'replace-text') {
        return <ReplaceTextNode {...nodeRendererBaseProps} />;
    }

    const isWorkflowNode = ['edit', 'remove-bg', 'upscale'].includes(node.type);
    if (isWorkflowNode) {
        let icon = <Icons.Settings />;
        let label = "Node";

        if (node.type === 'edit') { 
            icon = <BananaIcon size={12} className="text-yellow-300" />; label = "Magic";
        }
        if (node.type === 'remove-bg') { 
            icon = <Icons.Scissors size={14} className="text-white/70" />; label = "Remove BG";
        }
        if (node.type === 'upscale') { 
            icon = <Icons.Upscale size={14} className="text-white/70" />; label = "Upscale 4K";
        }

        // Edit 节点的设置
        const editAspectRatio = node.data?.settings?.aspectRatio || 'AUTO';
        const editResolution = node.data?.settings?.resolution || 'AUTO';
        const resolutions = ['AUTO', '1K', '2K', '4K'];
        
        const handleEditSettingChange = (key: string, value: string) => {
            // 参数改变时，重置状态和清空输出，让节点可以重新执行
            onUpdate(node.id, { 
                data: { ...node.data, settings: { ...node.data?.settings, [key]: value }, output: undefined },
                content: '', // 清空显示内容，回到设置界面
                status: 'idle' // 重置状态为idle，允许重新执行
            });
        };

        // If there's output content, show the result image
        // 🔧 修复：upscale和remove-bg节点不再显示图片，结果在下游Image节点
        if (node.type !== 'upscale' && node.type !== 'remove-bg' && node.content && (node.content.startsWith('data:image') || node.content.startsWith('http://') || node.content.startsWith('https://'))) {
            // 图片加载后自动调整节点尺寸以匹配图片比例
            const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
                const img = e.currentTarget;
                const imgWidth = img.naturalWidth;
                const imgHeight = img.naturalHeight;
                const aspectRatio = imgWidth / imgHeight;
                
                // 保持宽度不变，根据比例计算高度（加上标题栏32px）
                const newHeight = Math.round(node.width / aspectRatio) + 32;
                // 只有当高度差异较大时才更新，避免无限循环
                if (Math.abs(newHeight - node.height) > 10) {
                    onUpdate(node.id, { height: newHeight });
                }
            };
            
            return (
                <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
                    <div className="h-8 flex items-center px-3 gap-2 shrink-0" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
                        {icon}
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>{label}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <img 
                            src={node.content} 
                            alt="Output" 
                            className="w-full h-full object-contain" 
                            draggable={false}
                            onLoad={handleImageLoad}
                            style={{
                                imageRendering: 'auto',
                                transform: 'translateZ(0)',
                                willChange: 'transform',
                                backfaceVisibility: 'hidden',
                            } as React.CSSProperties}
                        />
                        
                        {/* 信息查询按钮 */}
                        <div 
                          className="absolute top-2 right-2 z-20"
                          onMouseEnter={() => setShowMediaInfo(true)}
                          onMouseLeave={() => setShowMediaInfo(false)}
                        >
                          <div 
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all"
                            title="图片信息"
                          >
                            <Icons.Info size={14} className="text-white/70" />
                          </div>
                          
                          {/* 信息浮窗 */}
                          {showMediaInfo && mediaMetadata && (
                            <div 
                              className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-0.5">
                                <div><span className="text-zinc-500">宽度:</span> {mediaMetadata.width} px</div>
                                <div><span className="text-zinc-500">高度:</span> {mediaMetadata.height} px</div>
                                <div><span className="text-zinc-500">比例:</span> {getAspectRatio(mediaMetadata.width, mediaMetadata.height)}</div>
                                <div><span className="text-zinc-500">大小:</span> {mediaMetadata.size}</div>
                                <div><span className="text-zinc-500">格式:</span> {mediaMetadata.format}</div>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                    {/* Prompt overlay on hover */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity z-20">
                        <textarea 
                            className={inputBaseClass + " resize-none text-[10px]"}
                            placeholder="New instructions..."
                            value={localPrompt}
                            onChange={(e) => setLocalPrompt(e.target.value)}
                            onBlur={handleUpdate}
                            onMouseDown={(e) => e.stopPropagation()} 
                            rows={2}
                        />
                    </div>
                    {showRunningIndicator && (
                        <SpinnerOverlay size="sm" />
                    )}
                </div>
            );
        }

        // Edit 节点 - 已提取至 nodes/EditNode.tsx
        if (node.type === 'edit') {
            return <EditNode {...nodeRendererBaseProps} />;
        }

        // Upscale 节点 - 已提取至 nodes/UpscaleNode.tsx
        if (node.type === 'upscale') {
            return <UpscaleNode {...nodeRendererBaseProps} />;
        }

        // Remove-bg 节点 - 已提取至 nodes/RemoveBgNode.tsx
        if (node.type === 'remove-bg') {
            return <RemoveBgNode {...nodeRendererBaseProps} />;
        }
        // No output yet - show input form (fallback)
        return (
            <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
                <div className="h-8 flex items-center px-3 gap-2" style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
                    {icon}
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>{label}</span>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-2 relative">
                    <textarea
                        className={inputBaseClass + " flex-1 resize-none"}
                        placeholder="Instructions..."
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        onBlur={handleUpdate}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                     <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold text-zinc-400 uppercase">
                        IMG OUT
                    </div>
                </div>
                {showRunningIndicator && (
                    <SpinnerOverlay size="sm" />
                )}
            </div>
        );
    }

    // Standard Text / Idea - Simplified
    // 阻止滚轮事件冒泡到画布
    const handleTextWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
    };

    return (
      <div 
        className="w-full h-full flex flex-col rounded-xl overflow-hidden shadow-lg relative group/text"
        style={{ 
          backgroundColor: themeColors.nodeBg, 
          border: `1px solid ${themeColors.nodeBorder}`,
          color: themeColors.textPrimary 
        }}
      >
        {isEditing ? (
           <div 
               className="flex-1 p-3 flex flex-col h-full gap-2" 
               onMouseDown={(e) => e.stopPropagation()}
               onWheel={handleTextWheel}
           >
               {/* Content Input */}
               <textarea
                  className={inputBaseClass + " flex-1 resize-none text-sm leading-relaxed scrollbar-hide font-medium"}
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Type something..."
                  autoFocus
               />
               <div className="text-[9px] text-zinc-600 text-right">Click outside to save</div>
           </div>
        ) : (
          <div 
             className="flex-1 p-4 overflow-y-auto scrollbar-hide flex flex-col" 
             onWheel={handleTextWheel}
          >
             {/* No title, just content. Drag handled by parent div */}
             <p className="text-sm whitespace-pre-wrap leading-relaxed flex-1 font-medium pointer-events-none" style={{ color: isLightCanvas ? '#1f2937' : '#e4e4e7' }}>
                 {localContent || <span className="text-zinc-600 italic">Double-click to edit...</span>}
             </p>
          </div>
        )}
        
        {/* Type Badge - Only show on hover or selected */}
        {(isSelected) && (
             <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white/60 uppercase pointer-events-none">
                {(node.type as string) === 'idea' ? 'Idea' : 'Text'}
            </div>
        )}

        {isRunning && (
            <SpinnerOverlay size="sm" />
        )}
      </div>
    );
  };

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={`absolute flex flex-col select-none
        ${!isDragging ? 'transition-all duration-75' : ''}
        ${isRelay ? 'rounded-full' : 'rounded-xl'}
        ${isSelected ? 'ring-2 ring-blue-500/50 z-50' : `ring-1 ${isLightCanvas ? 'ring-black/10 hover:ring-black/20' : 'ring-white/5 hover:ring-white/20'} z-10`}
        ${isSelected && !isRelay ? 'shadow-2xl' : ''}

      `}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: node.width,
        height: node.height,
        cursor: 'grab',
        backgroundColor: isRelay ? 'transparent' : themeColors.nodeBg,
        pointerEvents: 'auto',
        boxShadow: isLightCanvas ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
      } as React.CSSProperties}
      onMouseDown={(e) => {
        // Prevent drag start if clicking interactive elements, BUT allow if it's the text display div
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || isResizing) return;
        
        // Let App.tsx know we are starting a drag
        onDragStart(e, node.id);
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={() => setIsEditing(true)}
      onMouseUp={() => {
        // rh-config/runninghub/llm 节点使用自己的内部连接点，不使用节点整体的 onMouseUp
        if (node.type !== 'rh-config' && node.type !== 'runninghub' && node.type !== 'llm') {
          onEndConnection(node.id);
        }
      }}
    >
      {/* Ports - rh-config/runninghub/llm 节点使用自己的内部连接点，不显示全局端口 */}
      {node.type !== 'rh-config' && node.type !== 'runninghub' && node.type !== 'llm' && (
        <div
          className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-50 hover:scale-150 transition-all cursor-crosshair flex items-center justify-center border group/port ${inputPortColor}`}
          onMouseDown={(e) => handlePortDown(e, 'in')}
        />
      )}
      {node.type !== 'rh-config' && node.type !== 'runninghub' && (
        <div
          className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-50 hover:scale-150 transition-all cursor-crosshair flex items-center justify-center border ${outputPortColor}`}
          onMouseDown={(e) => handlePortDown(e, 'out')}
        />
      )}

      {/* Content */}
      {renderContent()}

      {/* Modern Resize Handle */}
      {isSelected && !isRelay && (
          <div 
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-50 flex items-end justify-end p-2 opacity-80 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeStart}
          >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" className="text-white/50">
                  <path d="M10 2L10 10L2 10" strokeWidth="2" strokeLinecap="round" />
              </svg>
          </div>
      )}

      {/* ACTION BAR (Top) */}
      {(isSelected) && !isRelay && (
        <div className="absolute -top-10 right-0 flex gap-1.5 animate-in fade-in slide-in-from-bottom-2 z-[60]">
             {/* Edit Button for Text/Idea */}
             {['text', 'idea'].includes(node.type) && !isEditing && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="p-1.5 rounded-lg border shadow-lg transition-colors"
                    style={{ 
                      backgroundColor: isLightCanvas ? '#ffffff' : '#2c2c2e',
                      borderColor: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                      color: isLightCanvas ? '#6e6e73' : '#d4d4d8'
                    }}
                    title="Edit Text (Enter)"
                 >
                    <Icons.Edit size={12} fill="currentColor" />
                 </button>
             )}

             {/* Execute Button with Batch Count */}
             {([...CASCADE_EXECUTABLE_TYPES, 'idea'] as NodeType[]).includes(node.type) && (
                 <div className="flex items-center gap-0.5">
                   {/* 批量数量选择器 - 对图片生成类型节点显示 */}
                   {['edit', 'bp', 'idea', 'remove-bg', 'upscale', 'video', 'runninghub', 'rh-config'].includes(node.type) && !isRunning && (
                     <div 
                       className="flex items-center h-8 rounded-l-lg border border-r-0 overflow-hidden"
                       style={{ 
                         backgroundColor: isLightCanvas ? '#ffffff' : '#2c2c2e',
                         borderColor: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                       }}
                     >
                       <button
                         onClick={(e) => { e.stopPropagation(); setBatchCount(Math.max(1, batchCount - 1)); }}
                         className="w-6 h-full flex items-center justify-center transition-colors"
                         style={{ color: isLightCanvas ? '#6e6e73' : '#a1a1aa' }}
                         title="减少"
                       >
                         <Icons.Minus size={10} />
                       </button>
                       <span className="w-5 text-center text-[10px] font-bold" style={{ color: isLightCanvas ? '#1d1d1f' : '#d4d4d8' }}>{batchCount}</span>
                       <button
                         onClick={(e) => { e.stopPropagation(); setBatchCount(Math.min(9, batchCount + 1)); }}
                         className="w-6 h-full flex items-center justify-center transition-colors"
                         style={{ color: isLightCanvas ? '#6e6e73' : '#a1a1aa' }}
                         title="增加"
                       >
                         <Icons.Plus size={10} />
                       </button>
                     </div>
                   )}
                   <button
                      onClick={(e) => {
                          e.stopPropagation();
                          if (isCascadeTerminal && cascadeCount >= 1) {
                              handleCascadeExecuteWithLatestEdits(node.id);
                          } else {
                              handleExecuteWithLatestEdits(node.id, batchCount);
                          }
                      }}
                       className="h-8 px-2.5 border shadow-lg transition-colors flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider rounded-lg"
                      style={{
                        backgroundColor: isLightCanvas ? '#ffffff' : '#2c2c2e',
                        borderColor: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                        color: (isCascadeTerminal && cascadeCount >= 1) ? '#60a5fa' : '#22c55e'
                      }}
                   >
                      <Icons.Play size={12} fill="currentColor" />
                      {(isCascadeTerminal && cascadeCount >= 1) ? `Run ${cascadeCount + 1}` : 'Run'}
                   </button>
                 </div>
             )}

             {/* Download Button */}
             {(node.content) && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(node.id); }}
                    className="h-8 w-8 rounded-lg transition-colors border shadow-lg flex items-center justify-center"
                    style={{ 
                      backgroundColor: isLightCanvas ? '#ffffff' : '#2c2c2e',
                      borderColor: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                      color: isLightCanvas ? '#6e6e73' : '#d4d4d8'
                    }}
                    title="Download Output"
                >
                    <Icons.Download size={14} />
                </button>
            )}

            {/* Close Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                className="h-8 w-8 rounded-lg transition-colors border shadow-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:text-red-300"
                style={{ 
                  backgroundColor: isLightCanvas ? '#ffffff' : '#2c2c2e',
                  borderColor: isLightCanvas ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                }}
            >
                <Icons.Close size={14} />
            </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(CanvasNodeItem);
