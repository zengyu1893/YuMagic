/**
 * 画布节点执行入口。
 * 只负责收集上游资产 + 通过 nodeExecutorRegistry 查找对应执行器分发。
 * 不包含任何 if (node.type === 'xxx') 的分支逻辑。
 *
 * 当前状态：此文件是迁移目标。实际执行逻辑仍在 PebblingCanvas/index.tsx。
 * 随着各 feature executor 的创建和注册，逐步切换到此入口。
 */

import type { CanvasNode, Connection } from '../../../types/pebblingTypes';
import type { ExecutionResult } from '../types/canvas.types';
import { getNodeExecutor, isNodeExecutorRegistered } from '../config/nodeExecutorRegistry';
import { collectUpstreamAssets } from './workflowAssetGraph';

/** 执行上下文参数 */
export interface ExecuteNodeParams {
  node: CanvasNode;
  allNodes: CanvasNode[];
  allConnections: Connection[];
  signal: AbortSignal;
  /** 更新节点（部分 patch） */
  onUpdateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
  /** 创建输出节点（返回节点 ID） */
  onCreateOutputNode: (sourceNodeId: string) => string;
}

/**
 * 执行单个节点的默认入口。
 * 如果该节点类型已注册独立 executor → 调用之。
 * 如果未注册 → 返回"未实现"错误。
 */
export async function executeNode(params: ExecuteNodeParams): Promise<ExecutionResult> {
  const { node, allNodes, allConnections, signal, onUpdateNode, onCreateOutputNode } = params;

  // 检查是否已注册执行器
  if (!isNodeExecutorRegistered(node.type)) {
    return {
      outputAssets: [],
      error: `节点类型 "${node.type}" 的执行器尚未注册。请先在对应 feature 创建 executor 并注册到 nodeExecutorRegistry。`,
    };
  }

  // 收集上游资产
  const upstreamAssets = collectUpstreamAssets(node.id, allNodes, allConnections);

  // 查找执行器
  const executor = getNodeExecutor(node.type);
  if (!executor) {
    return {
      outputAssets: [],
      error: `未找到节点类型 "${node.type}" 的执行器。`,
    };
  }

  // 调用执行器
  const startTime = performance.now();

  try {
    const result = await executor({
      signal,
      upstreamAssets,
      node,
      updateNode: onUpdateNode,
      createOutputNode: onCreateOutputNode,
    });

    return {
      ...result,
      durationMs: result.durationMs ?? (performance.now() - startTime),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown execution error';

    // 如果是 AbortError，标记为取消
    if (signal.aborted || error instanceof DOMException && error.name === 'AbortError') {
      return { outputAssets: [], error: '任务已取消', durationMs: performance.now() - startTime };
    }

    return { outputAssets: [], error: message, durationMs: performance.now() - startTime };
  }
}
