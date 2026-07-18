import React from 'react';
import { CanvasNode, NodeType } from '../../../types/pebblingTypes';

/** 所有节点渲染器共享的 Props，从 CanvasNodeItem 父组件传入 */
export interface NodeRendererProps {
  node: CanvasNode;
  isSelected: boolean;
  isLightCanvas: boolean;
  scale: number;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string, count?: number) => void;
  onStop: (id: string) => void;
  onDownload: (id: string) => void;
  onStartConnection: (nodeId: string, portType: 'in' | 'out', position: { x: number; y: number }) => void;
  onEndConnection: (nodeId: string, portKey?: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onCreateToolNode?: (sourceNodeId: string, toolType: NodeType, position: { x: number; y: number }) => void;
  onExtractFrame?: (nodeId: string, position: 'first' | 'last' | number) => void;
  onCreateFrameExtractor?: (sourceVideoNodeId: string) => void;
  onExtractFrameFromExtractor?: (nodeId: string, time: number) => void;
  onRetryVideoDownload?: (nodeId: string) => void;
  hasDownstream: boolean;
  incomingConnections: Array<{ fromNode: string; toNode: string; toPortKey?: string }>;
  /** 画布主题色变量 */
  themeColors: {
    nodeBg: string;
    nodeBgAlt: string;
    nodeBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    headerBg: string;
    headerBorder: string;
    footerBg: string;
  };
  /** Tailwind: 控件背景 */
  controlBg: string;
  /** Tailwind: 选中项背景 */
  selectedBg: string;
  /** Tailwind: 选中项文字 */
  selectedText: string;
  /** Tailwind: 底部栏背景 */
  footerBarBg: string;
  /** 输入框基础 CSS 类 */
  inputBaseClass: string;
  /** 节点是否正在执行 */
  isRunning: boolean;
  /** 是否显示执行指示器 */
  showRunningIndicator: boolean;
  /** 节点 DOM ref */
  nodeRef: React.RefObject<HTMLDivElement | null>;
  /** 文件上传 input ref */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** 文件夹上传 input ref (Image 节点) */
  folderInputRef?: React.RefObject<HTMLInputElement | null>;
  /** 当前 prompt 文本 */
  localPrompt: string;
  /** 设置 prompt 文本 */
  setLocalPrompt: (v: string) => void;
  /** 保存 prompt 变更 */
  handleUpdate: () => void;
  /** 文件上传处理 */
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Image 节点：清除图片内容（重置为空状态） */
  onClearImage?: (nodeId: string) => void;
  /** OUTPUT 节点：图片右键菜单 action 回调（edit=创建独立图像节点, addToDesktop=同步到桌面） */
  onImageContextMenu?: (action: 'edit' | 'addToDesktop', imageUrl: string, imageIndex: number, nodeId: string) => void;
  /** OUTPUT 节点：预览图片回调 */
  onPreviewImage?: (imageUrl: string) => void;
  /** 模型列表 */
  imageModels: string[];
  chatModels: string[];
  videoModels: string[];
  /** 媒体元数据（图片/视频宽高、大小、格式） */
  mediaMetadata: {width: number; height: number; size: string; format: string; duration?: string} | null;
  /** 是否显示媒体信息浮窗 */
  showMediaInfo: boolean;
  /** 设置媒体信息浮窗显示 */
  setShowMediaInfo: (v: boolean) => void;
  /** 计算宽高比字符串 */
  getAspectRatio: (width: number, height: number) => string;
  /** ShowText节点：自动解析的上游文字（实时透传，无需手动执行） */
  autoResolvedContent?: string;
}
