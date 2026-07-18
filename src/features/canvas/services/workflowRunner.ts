/**
 * 工作流链式运行调度器。
 * 运行到选中节点时，自动按连线先执行缺少输出的上游节点。
 * 支持 AbortSignal 停止。
 *
 * 当前状态：此文件是迁移目标。实际运行逻辑仍在 PebblingCanvas/index.tsx。
 */

import type { CanvasNode, Connection } from '../../../types/pebblingTypes';
import type { ExecutionResult } from '../types/canvas.types';
import { buildDependencyGraph, topologicalSort, collectUpstreamAssets } from './workflowAssetGraph';
import { isNodeExecutable } from '../config/nodeExecutorRegistry';
import { executeNode } from './workflowNodeExecutor';

/** 运行选项 */
export interface WorkflowRunOptions {
  /** 目标节点 ID（运行到该节点） */
  targetNodeId: string;
  /** 所有节点 */
  nodes: CanvasNode[];
  /** 所有连线 */
  connections: Connection[];
  /** 中断信号 */
  signal: AbortSignal;
  /** 更新节点回调 */
  onUpdateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
  /** 创建输出节点回调 */
  onCreateOutputNode: (sourceNodeId: string) => string;
  /** 每个节点完成后的回调 */
  onNodeComplete?: (nodeId: string, result: ExecutionResult) => void;
}

/** 运行结果 */
export interface WorkflowRunResult {
  /** 最终目标节点的执行结果 */
  finalResult: ExecutionResult | null;
  /** 所有执行过/复用过的节点 ID */
  executedNodeIds: string[];
  /** 是否被中断 */
  aborted: boolean;
}

/**
 * 运行到目标节点。
 * 自动按依赖顺序执行，已完成的上游节点会被复用（不重复执行）。
 */
export async function runToNode(options: WorkflowRunOptions): Promise<WorkflowRunResult> {
  const {
    targetNodeId,
    nodes,
    connections,
    signal,
    onUpdateNode,
    onCreateOutputNode,
    onNodeComplete,
  } = options;

  const executedNodeIds: string[] = [];
  let finalResult: ExecutionResult | null = null;

  // 构建依赖图
  const depGraph = buildDependencyGraph(nodes, connections);

  // 找出到达目标节点的所有上游节点（BFS）
  const reachableIds = findReachableUpstream(targetNodeId, depGraph);

  // 拓扑排序确定执行顺序
  const executionOrder = topologicalSort([...reachableIds, targetNodeId], depGraph);

  // 按顺序执行
  for (const nodeId of executionOrder) {
    if (signal.aborted) {
      return { finalResult: null, executedNodeIds, aborted: true };
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // 检查是否已有输出（可复用）
    if (hasOutput(node) && nodeId !== targetNodeId) {
      // 上游节点已有输出，跳过
      continue;
    }

    // 跳过不可执行的节点
    if (!isNodeExecutable(node.type)) {
      continue;
    }

    // 执行
    const result = await executeNode({
      node,
      allNodes: nodes,
      allConnections: connections,
      signal,
      onUpdateNode,
      onCreateOutputNode: (sourceId) => {
        // 为目标节点创建位置合理的输出节点
        const targetIdx = nodes.findIndex((n) => n.id === sourceId);
        const target = targetIdx >= 0 ? nodes[targetIdx] : null;
        const x = target ? target.x + target.width + 100 : 0;
        const y = target ? target.y : 0;
        return onCreateOutputNode(sourceId);
      },
    });

    executedNodeIds.push(nodeId);

    if (nodeId === targetNodeId) {
      finalResult = result;
    }

    onNodeComplete?.(nodeId, result);

    if (result.error && nodeId === targetNodeId) {
      break; // 目标节点出错，停止
    }
  }

  return {
    finalResult,
    executedNodeIds,
    aborted: signal.aborted,
  };
}

/**
 * 检查节点是否已有有效输出。
 */
function hasOutput(node: CanvasNode): boolean {
  if (node.status === 'completed') return true;
  if (node.content && node.content.length > 0) return true;
  if (node.data?.output && node.data.output.length > 0) return true;
  if (node.data?.outputImages && node.data.outputImages.length > 0) return true;
  return false;
}

/**
 * BFS 查找可达的上游节点。
 */
function findReachableUpstream(
  targetId: string,
  depGraph: Map<string, string[]>
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [targetId];

  // 反转依赖图（找到谁依赖谁）
  const reverseGraph = new Map<string, string[]>();
  for (const [nodeId, deps] of depGraph) {
    for (const dep of deps) {
      const list = reverseGraph.get(dep) || [];
      list.push(nodeId);
      reverseGraph.set(dep, list);
    }
  }

  // BFS 从目标节点向上游遍历
  while (queue.length > 0) {
    const current = queue.shift()!;
    const upstreams = depGraph.get(current) || [];
    for (const upstream of upstreams) {
      if (!reachable.has(upstream)) {
        reachable.add(upstream);
        queue.push(upstream);
      }
    }
  }

  return reachable;
}
