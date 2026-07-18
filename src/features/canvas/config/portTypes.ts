/**
 * 画布端口类型、端口颜色、节点输入输出规则。
 * 这是所有端口相关逻辑的单一数据源（SSOT）。
 * 端口颜色由端口类型自动决定，禁止在节点组件里手写端口颜色判断。
 */

import type { NodeType, PortAssetType, PortDeclaration, NodePortContract } from '../types/canvas.types';

// === 端口类型 → 颜色映射 ===

export const PORT_TYPE_COLORS: Record<PortAssetType, string> = {
  text: '#60a5fa',    // blue-400
  image: '#f472b6',   // pink-400
  video: '#a78bfa',   // violet-400
  audio: '#34d399',   // emerald-400
  mixed: '#fbbf24',   // amber-400
};

/** 根据端口类型获取颜色 */
export function getPortColor(type: PortAssetType): string {
  return PORT_TYPE_COLORS[type] || PORT_TYPE_COLORS.mixed;
}

/** 根据端口类型获取标签 */
export function getPortLabel(type: PortAssetType): string {
  const labels: Record<PortAssetType, string> = {
    text: '文本',
    image: '图片',
    video: '视频',
    audio: '音频',
    mixed: '混合',
  };
  return labels[type] || type;
}

// === 节点端口合同表 ===

/**
 * 所有画布节点的输入/输出声明。
 * 新增节点必须先在这里声明 inputs 和 outputs。
 * 连接菜单、连线颜色、兼容性检查都从这里派生。
 */
export const NODE_PORT_CONTRACTS: Partial<Record<NodeType, NodePortContract>> = {
  // === 源文本节点 ===
  text: {
    nodeType: 'text',
    inputs: [],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },
  idea: {
    nodeType: 'idea',
    inputs: [],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },

  // === 源图片节点 ===
  image: {
    nodeType: 'image',
    inputs: [],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },

  // === 源视频节点 ===
  video: {
    nodeType: 'video',
    inputs: [],
    outputs: [{ handleId: 'default', label: '视频', assetType: 'video', direction: 'output' }],
  },

  // === LLM 对话节点 ===
  llm: {
    nodeType: 'llm',
    inputs: [
      { handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' },
      { handleId: 'system-prompt', label: '系统提示词', assetType: 'text', direction: 'input' },
      { handleId: 'user-prompt', label: '用户输入', assetType: 'text', direction: 'input' },
      { handleId: 'media', label: '素材', assetType: 'mixed', direction: 'input', maxConnections: 10 },
    ],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },

  // === 输出素材节点 ===
  output: {
    nodeType: 'output',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input', maxConnections: 50 }],
    outputs: [],
  },
  'video-output': {
    nodeType: 'video-output',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'video', direction: 'input', maxConnections: 50 }],
    outputs: [],
  },

  // === 中继节点 ===
  relay: {
    nodeType: 'relay',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },

  // === AI 图像生成节点 ===
  // 注：当前在 PebblingCanvas 中没有独立的 image-generation 节点类型，
  // 图像生成通过 image 节点 + LLM 节点组合实现。后续迁移时再添加。

  // === RunningHub ===
  runninghub: {
    nodeType: 'runninghub',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },
  'rh-main': {
    nodeType: 'rh-main',
    inputs: [],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },
  'rh-param': {
    nodeType: 'rh-param',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },
  'rh-config': {
    nodeType: 'rh-config',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },

  // === 画板 ===
  'drawing-board': {
    nodeType: 'drawing-board',
    inputs: [{ handleId: 'default', label: '图片输入', assetType: 'image', direction: 'input', maxConnections: 10 }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },

  // === 图片编辑 ===
  edit: {
    nodeType: 'edit',
    inputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },
  resize: {
    nodeType: 'resize',
    inputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },
  'remove-bg': {
    nodeType: 'remove-bg',
    inputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },
  upscale: {
    nodeType: 'upscale',
    inputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },

  // === Prompt 行处理 ===
  'prompt-line': {
    nodeType: 'prompt-line',
    inputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },
  'show-text': {
    nodeType: 'show-text',
    inputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },
  'replace-text': {
    nodeType: 'replace-text',
    inputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '文本', assetType: 'text', direction: 'output' }],
  },

  // === BP 节点 ===
  bp: {
    nodeType: 'bp',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },

  // === 帧提取 ===
  'frame-extractor': {
    nodeType: 'frame-extractor',
    inputs: [{ handleId: 'default', label: '视频', assetType: 'video', direction: 'input' }],
    outputs: [{ handleId: 'default', label: '图片', assetType: 'image', direction: 'output' }],
  },

  // === combine (已废弃但类型仍存在) ===
  combine: {
    nodeType: 'combine',
    inputs: [{ handleId: 'default', label: '输入', assetType: 'mixed', direction: 'input', maxConnections: 10 }],
    outputs: [{ handleId: 'default', label: '输出', assetType: 'mixed', direction: 'output' }],
  },
};

// === 端口兼容性检查 ===

/**
 * 检查两个端口类型是否兼容（源端口输出 → 目标端口输入）。
 * mixed 类型兼容所有类型。
 */
export function arePortsCompatible(source: PortAssetType, target: PortAssetType): boolean {
  if (source === target) return true;
  if (source === 'mixed' || target === 'mixed') return true;
  return false;
}

/** 根据节点类型获取端口合同 */
export function getPortContract(nodeType: NodeType): NodePortContract | undefined {
  return NODE_PORT_CONTRACTS[nodeType];
}

/** 获取节点类型的输入端口声明 */
export function getInputPorts(nodeType: NodeType): PortDeclaration[] {
  return NODE_PORT_CONTRACTS[nodeType]?.inputs || [];
}

/** 获取节点类型的输出端口声明 */
export function getOutputPorts(nodeType: NodeType): PortDeclaration[] {
  return NODE_PORT_CONTRACTS[nodeType]?.outputs || [];
}
