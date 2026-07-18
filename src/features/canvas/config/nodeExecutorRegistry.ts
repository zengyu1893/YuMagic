/**
 * 画布节点执行器注册表。
 * 按节点 type/featureId 查找各 feature 的独立 executor。
 * 新增加可运行节点时，必须先在对应 feature 的 services/ 新增独立 executor，
 * 再注册到这里。禁止把执行 if 分支继续塞进 workflowNodeExecutor.ts 或 PebblingCanvas/index.tsx。
 */

import type { NodeType } from '../../../types/pebblingTypes';
import type { NodeExecutor } from '../types/canvas.types';

/**
 * 节点执行器注册表。
 * key: NodeType
 * value: 该节点类型的执行器函数
 *
 * 当前状态：所有节点执行逻辑仍在 PebblingCanvas/index.tsx 的 runCascade 中。
 * 此注册表是迁移目标 —— 各 feature 完成拆分后在此登记。
 */
export const NODE_EXECUTOR_REGISTRY: Partial<Record<NodeType, NodeExecutor>> = {};

/**
 * 可执行节点类型列表。
 * 从 types/pebblingTypes.ts 的 CASCADE_EXECUTABLE_TYPES 派生，
 * 逐步迁移到此处的集中管理。
 */
export const EXECUTABLE_NODE_TYPES: Set<NodeType> = new Set([
  'text',
  'idea',
  'image',
  'video',
  'llm',
  'relay',
  'runninghub',
  'edit',
  'resize',
  'remove-bg',
  'upscale',
  'drawing-board',
  'prompt-line',
  'show-text',
  'replace-text',
  'bp',
  'frame-extractor',
]);

/** 注册节点执行器 */
export function registerNodeExecutor(nodeType: NodeType, executor: NodeExecutor): void {
  if (NODE_EXECUTOR_REGISTRY[nodeType]) {
    console.warn(`[nodeExecutorRegistry] 覆盖已注册的执行器: ${nodeType}`);
  }
  NODE_EXECUTOR_REGISTRY[nodeType] = executor;
}

/** 批量注册节点执行器 */
export function registerNodeExecutors(entries: Array<[NodeType, NodeExecutor]>): void {
  for (const [nodeType, executor] of entries) {
    registerNodeExecutor(nodeType, executor);
  }
}

/** 获取节点执行器 */
export function getNodeExecutor(nodeType: NodeType): NodeExecutor | undefined {
  return NODE_EXECUTOR_REGISTRY[nodeType];
}

/** 检查节点类型是否可执行 */
export function isNodeExecutable(nodeType: NodeType): boolean {
  return EXECUTABLE_NODE_TYPES.has(nodeType);
}

/** 检查节点类型是否已注册执行器 */
export function isNodeExecutorRegistered(nodeType: NodeType): boolean {
  return nodeType in NODE_EXECUTOR_REGISTRY;
}
