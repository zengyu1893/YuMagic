/**
 * 画布节点工厂。
 * 负责：默认节点数据创建、节点尺寸修复、快照过期运行状态清理、
 * 输出素材节点创建、NodeID 分配。
 *
 * 这是创建节点数据的唯一入口。组件和 store 不直接构造节点数据对象。
 */

import type { CanvasNode, NodeType, NodeStatus } from '../../../types/pebblingTypes';
import { getNodeTemplate } from '../config/nodeTemplates';
import { getNodeRendererMeta } from '../config/nodeRendererRegistry';

/** 生成简短唯一 ID */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 全局 NodeID 计数器（简化版，完整版需参考 nodeSerialIds.ts） */
let nodeIdCounter = 0;

/** 分配新的 NodeID */
export function allocateNodeId(): string {
  nodeIdCounter++;
  return `#${nodeIdCounter}`;
}

/** 创建默认节点数据 */
export function createDefaultNode(
  nodeType: NodeType,
  overrides?: Partial<CanvasNode>
): CanvasNode {
  const template = getNodeRendererMeta(nodeType);
  const node: CanvasNode = {
    id: generateId(),
    type: nodeType,
    x: 0,
    y: 0,
    width: template.width,
    height: template.height,
    content: '',
    title: template.title,
    data: {},
    status: 'idle',
    ...overrides,
  };
  return node;
}

/** 修复节点尺寸（从快照加载时，确保不小于最小尺寸） */
export function sanitizeNode(node: CanvasNode): CanvasNode {
  const meta = getNodeRendererMeta(node.type);

  let { width, height } = node;
  if (width < meta.minWidth) width = meta.minWidth;
  if (height < meta.minHeight) height = meta.minHeight;

  if (width === node.width && height === node.height) {
    return node; // 无需修改
  }

  return { ...node, width, height };
}

/** 批量修复节点尺寸 */
export function sanitizeNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map(sanitizeNode);
}

/**
 * 清理快照中的过期运行状态。
 * 加载快照时，所有 running 状态的节点转为 canceled，
 * 避免刷新后出现"假运行"的转圈。
 */
export function cleanExpiredRunningStatus(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.status === 'running') {
      return { ...node, status: 'idle' as NodeStatus };
    }
    return node;
  });
}

/**
 * 创建输出素材节点。
 * 在执行过程中为源节点创建下游占位结果节点。
 */
export function createOutputMaterialNode(
  sourceNodeId: string,
  position: { x: number; y: number },
  overrides?: Partial<CanvasNode>
): CanvasNode {
  const sourceType: NodeType = 'output'; // 默认 output 类型

  return createDefaultNode(sourceType, {
    x: position.x,
    y: position.y,
    title: '输出素材',
    status: 'running',
    data: {
      outputImages: [],
    },
    ...overrides,
  });
}

/** 重置全局计数器（用于测试或画布清空） */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}
