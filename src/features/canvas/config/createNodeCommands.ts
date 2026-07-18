/**
 * 新建节点菜单命令表。
 * 新增菜单项先改这里。
 * CanvasCreateMenu 和 CanvasConnectMenu 都从此读取命令列表。
 */

import type { NodeType } from '../../../types/pebblingTypes';
import { getNodeRendererMeta } from './nodeRendererRegistry';

/** 节点创建命令 */
export interface CreateNodeCommand {
  /** 节点类型 */
  nodeType: NodeType;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** icon 名称 (lucide-react) */
  icon: string;
  /** 分组 */
  group: NodeCommandGroup;
}

/** 命令分组 */
export type NodeCommandGroup =
  | 'source'
  | 'ai-generation'
  | 'processing'
  | 'output'
  | 'runninghub'
  | 'other';

/** 分组显示配置 */
export const COMMAND_GROUP_CONFIG: Record<NodeCommandGroup, { label: string; order: number }> = {
  source: { label: '输入源', order: 0 },
  'ai-generation': { label: 'AI 生成', order: 1 },
  processing: { label: '处理/编辑', order: 2 },
  output: { label: '输出', order: 3 },
  runninghub: { label: 'RunningHub', order: 4 },
  other: { label: '其他', order: 5 },
};

/**
 * 新建节点命令表。
 * CanvasCreateMenu 根据此表渲染菜单项。
 */
export const CREATE_NODE_COMMANDS: CreateNodeCommand[] = [
  // === 输入源 ===
  { nodeType: 'text', label: '文本', description: '输入提示词或文本内容', icon: 'Type', group: 'source' },
  { nodeType: 'idea', label: '创意', description: '创意灵感输入', icon: 'Lightbulb', group: 'source' },
  { nodeType: 'image', label: '图片', description: '上传或引用图片素材', icon: 'Image', group: 'source' },
  { nodeType: 'video', label: '视频', description: '上传或引用视频素材', icon: 'Video', group: 'source' },

  // === AI 生成 ===
  { nodeType: 'llm', label: 'LLM 对话', description: '大语言模型对话与视觉理解', icon: 'Brain', group: 'ai-generation' },

  // === 处理/编辑 ===
  { nodeType: 'prompt-line', label: '行选择', description: '按行号选择文本行', icon: 'List', group: 'processing' },
  { nodeType: 'show-text', label: '显示文本', description: '展示文本内容', icon: 'Eye', group: 'processing' },
  { nodeType: 'replace-text', label: '文本替换', description: '查找并替换文本', icon: 'Replace', group: 'processing' },
  { nodeType: 'relay', label: '中继', description: '透传上游资产', icon: 'ArrowLeftRight', group: 'processing' },
  { nodeType: 'edit', label: '图片编辑', description: '编辑/裁剪/调整图片', icon: 'Edit', group: 'processing' },
  { nodeType: 'resize', label: '调整尺寸', description: '调整图片尺寸', icon: 'Maximize2', group: 'processing' },
  { nodeType: 'remove-bg', label: '移除背景', description: '移除图片背景', icon: 'Scissors', group: 'processing' },
  { nodeType: 'upscale', label: '图片放大', description: 'AI 超分辨率放大', icon: 'ZoomIn', group: 'processing' },
  { nodeType: 'drawing-board', label: '画板', description: '自由绘制与图片组合', icon: 'Pencil', group: 'processing' },
  { nodeType: 'frame-extractor', label: '帧提取', description: '从视频中提取关键帧', icon: 'Camera', group: 'processing' },
  { nodeType: 'bp', label: 'BP 模板', description: '业务流程模板', icon: 'LayoutTemplate', group: 'processing' },

  // === 输出 ===
  { nodeType: 'output', label: '输出素材', description: '展示上游产出的图片', icon: 'Image', group: 'output' },
  { nodeType: 'video-output', label: '视频输出', description: '展示上游产出的视频', icon: 'Video', group: 'output' },

  // === RunningHub ===
  { nodeType: 'runninghub', label: 'RunningHub', description: 'RunningHub AI 应用', icon: 'Zap', group: 'runninghub' },
  { nodeType: 'rh-main', label: 'RH 主节点', description: 'RunningHub 封面主节点', icon: 'Star', group: 'runninghub' },
  { nodeType: 'rh-param', label: 'RH 参数', description: 'RunningHub 独立参数', icon: 'SlidersHorizontal', group: 'runninghub' },
  { nodeType: 'rh-config', label: 'RH 配置', description: 'RunningHub 应用配置', icon: 'Settings', group: 'runninghub' },
];

/** 按分组获取命令列表 */
export function getCommandsByGroup(group: NodeCommandGroup): CreateNodeCommand[] {
  return CREATE_NODE_COMMANDS.filter((cmd) => cmd.group === group);
}

/** 根据节点类型查找命令 */
export function findCommand(nodeType: NodeType): CreateNodeCommand | undefined {
  return CREATE_NODE_COMMANDS.find((cmd) => cmd.nodeType === nodeType);
}

/** 获取所有分组（按 order 排序） */
export function getCommandGroups(): NodeCommandGroup[] {
  const groups = new Set(CREATE_NODE_COMMANDS.map((cmd) => cmd.group));
  return Array.from(groups).sort((a, b) =>
    COMMAND_GROUP_CONFIG[a].order - COMMAND_GROUP_CONFIG[b].order
  );
}
