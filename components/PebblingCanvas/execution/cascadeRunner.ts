import { CanvasNode, Connection } from '../../../types/pebblingTypes';
import { CASCADE_EXECUTABLE_TYPES } from '../../../types/pebblingTypes';
import { isValidImage } from '../apiAdapters';

/** Post-order DFS: find all upstream executable nodes, most upstream first. */
export function computeCascadeOrder(
  targetNodeId: string,
  nodes: CanvasNode[],
  connections: Connection[],
  cache: Map<string, string[]>,
): string[] {
  const cached = cache.get(targetNodeId);
  if (cached) return cached;

  const visited = new Set<string>();
  const result: string[] = [];

  const dfs = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incomingConns = connections.filter(c => c.toNode === currentId);
    for (const conn of incomingConns) {
      const upstream = nodes.find(n => n.id === conn.fromNode);
      if (!upstream) continue;

      if (CASCADE_EXECUTABLE_TYPES.includes(upstream.type)) {
        dfs(upstream.id);
        result.push(upstream.id);
      } else {
        dfs(upstream.id);
      }
    }
  };

  dfs(targetNodeId);
  cache.set(targetNodeId, result);
  return result;
}

export interface CascadeContext {
  nodeId: string;
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  cascadeCacheRef: React.MutableRefObject<Map<string, string[]>>;
  cascadeControllersRef: React.MutableRefObject<Map<string, AbortController>>;
  snapshotImagesRef: React.MutableRefObject<Map<string, string>>;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  handleExecuteNode: (nodeId: string, batchCount?: number) => Promise<void>;
}

/** Run cascade: execute all upstream nodes in topological order, then the target node. */
export async function runCascade(ctx: CascadeContext): Promise<void> {
  const {
    nodeId, nodesRef, connectionsRef,
    cascadeCacheRef, cascadeControllersRef, snapshotImagesRef,
    updateNode, handleExecuteNode,
  } = ctx;

  const order = computeCascadeOrder(nodeId, nodesRef.current, connectionsRef.current, cascadeCacheRef.current);
  if (!order.includes(nodeId)) order.push(nodeId);
  if (order.length === 0) return;

  // Snapshot source image nodes to prevent mid-cascade content changes
  snapshotImagesRef.current.clear();
  for (const n of nodesRef.current) {
    if (n.type === 'image' && isValidImage(n.content)) {
      const hasUpstream = connectionsRef.current.some(c => c.toNode === n.id);
      if (!hasUpstream) snapshotImagesRef.current.set(n.id, n.content);
    }
  }

  // Set progress labels
  for (let i = 0; i < order.length; i++) {
    const n = nodesRef.current.find(nn => nn.id === order[i]);
    if (n) {
      updateNode(order[i], { data: { ...n.data, cascadeProgress: `${i + 1}/${order.length}` } });
    }
  }

  const cascadeController = new AbortController();
  cascadeControllersRef.current.set(nodeId, cascadeController);

  try {
    const executedByUpstream = new Set<string>();
    for (let i = 0; i < order.length; i++) {
      if (cascadeController.signal.aborted) {
        clearRemainingProgress(i, order, nodesRef.current, updateNode);
        break;
      }
      if (executedByUpstream.has(order[i])) continue;

      const preNode = nodesRef.current.find(n => n.id === order[i]);
      if (preNode?.status === 'error') updateNode(order[i], { status: 'idle' });

      try {
        await handleExecuteNode(order[i], 1);
      } catch (e) {
        updateNode(order[i], {
          status: 'error',
          data: { ...nodesRef.current.find(n => n.id === order[i])?.data, error: String(e) },
        });
        clearRemainingProgress(i + 1, order, nodesRef.current, updateNode);
        break;
      }

      // Check if node returned error status without throwing
      const executedNode = nodesRef.current.find(n => n.id === order[i]);
      if (executedNode?.status === 'error') {
        clearRemainingProgress(i + 1, order, nodesRef.current, updateNode);
        break;
      }

      // PromptLine per-line dispatch: mark downstream as already executed
      if (executedNode && executedNode.type === 'prompt-line') {
        connectionsRef.current
          .filter(c => c.fromNode === order[i])
          .forEach(c => executedByUpstream.add(c.toNode));
      }
    }
  } finally {
    for (const id of order) {
      const n = nodesRef.current.find(nn => nn.id === id);
      if (n?.data?.cascadeProgress) {
        const { cascadeProgress, ...rest } = n.data || {};
        updateNode(id, { data: rest });
      }
    }
    cascadeControllersRef.current.delete(nodeId);
    snapshotImagesRef.current.clear();
  }
}

function clearRemainingProgress(
  startIdx: number,
  order: string[],
  nodes: CanvasNode[],
  updateNode: (id: string, patch: Partial<CanvasNode>) => void,
): void {
  for (let j = startIdx; j < order.length; j++) {
    const n = nodes.find(nn => nn.id === order[j]);
    if (n?.data?.cascadeProgress) {
      const { cascadeProgress, ...rest } = n.data || {};
      updateNode(order[j], { data: rest });
    }
  }
}
