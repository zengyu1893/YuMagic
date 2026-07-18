import type { CanvasNode, Connection } from '../../../types/pebblingTypes';

export interface OutputNodeResult {
  node: CanvasNode;
  pendingIdx: number;
}

const getReusableOutputImages = (node: CanvasNode): string[] => {
  const images = node.data?.outputImages || [];
  return node.status === 'running' ? images : images.filter(url => url !== '__pending__');
};

/**
 * Gets or creates an output node for a given source node.
 *
 * Three-step lookup:
 * 1. Check outputNodeMap for an existing mapping (fast path).
 * 2. Fall back to scanning connections for an existing output connection,
 *    cleaning up dangling connections along the way.
 * 3. Create a new output node positioned to the right of the source node.
 *
 * The returned output node has a __pending__ placeholder appended to its
 * outputImages array and its status set to 'running'.
 */
export function getOrCreateOutputNode(
  sourceNodeId: string,
  nodes: CanvasNode[],
  connections: Connection[],
  outputNodeMap: Map<string, string>,
  uuid: () => string,
  updateNode: (id: string, patch: Partial<CanvasNode>) => void,
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>,
  outputType?: string,
): OutputNodeResult {
  // 1) Priority: check the independent Map
  const mappedId = outputNodeMap.get(sourceNodeId);
  if (mappedId) {
    const mappedNode = nodes.find(n => n.id === mappedId && n.type === 'output');
    if (mappedNode) {
      const prevImages = getReusableOutputImages(mappedNode);
      const pendingIdx = prevImages.length;
      updateNode(mappedNode.id, {
        status: 'running',
        data: { ...mappedNode.data, outputImages: [...prevImages, '__pending__'] },
      });
      return { node: mappedNode, pendingIdx };
    }
    outputNodeMap.delete(sourceNodeId);
  }

  // 2) Fallback: check connections for an existing OUTPUT connection
  const existingConn = connections.find(c => c.fromNode === sourceNodeId);
  if (existingConn) {
    const existingOutput = nodes.find(n => n.id === existingConn.toNode && n.type === 'output');
    if (existingOutput) {
      outputNodeMap.set(sourceNodeId, existingOutput.id);
      const prevImages = getReusableOutputImages(existingOutput);
      const pendingIdx = prevImages.length;
      updateNode(existingOutput.id, {
        status: 'running',
        data: { ...existingOutput.data, outputImages: [...prevImages, '__pending__'] },
      });
      return { node: existingOutput, pendingIdx };
    }
    const existingAny = nodes.find(n => n.id === existingConn.toNode);
    if (!existingAny) {
      setConnections(prev => prev.filter(c => c.id !== existingConn.id));
    }
  }

  // 3) Create a new output node
  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  const outNodeId = uuid();
  const pendingIdx = 0;
  const newNode: CanvasNode = {
    id: outNodeId,
    type: 'output',
    title: 'OUTPUT',
    content: '',
    x: (sourceNode?.x || 0) + (sourceNode?.width || 300) + 100,
    y: sourceNode?.y || 0,
    width: 460,
    height: 380,
    data: { outputImages: ['__pending__'], outputType },
    status: 'running',
  };
  const outConn: Connection = { id: uuid(), fromNode: sourceNodeId, toNode: outNodeId };

  nodes.push(newNode);
  connections.push(outConn);

  setNodes(prev => prev.some(n => n.id === outNodeId) ? prev : [...prev, newNode]);
  setConnections(prev => prev.some(c => c.id === outConn.id) ? prev : [...prev, outConn]);
  setHasUnsavedChanges(true);

  outputNodeMap.set(sourceNodeId, outNodeId);
  return { node: newNode, pendingIdx };
}

/**
 * Replaces a __pending__ placeholder in an output node's outputImages array
 * with the actual result, then marks the node as completed.
 */
export function resolveOutputPending(
  nodeId: string,
  pendingIdx: number,
  result: string,
  nodes: CanvasNode[],
  updateNode: (id: string, patch: Partial<CanvasNode>) => void,
  extraData?: Record<string, any>,
): void {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    const images = Array.from({ length: pendingIdx + 1 }, (_, index) => index === pendingIdx ? result : '');
    updateNode(nodeId, {
      content: result,
      status: 'completed',
      data: { ...extraData, outputImages: images },
    });
    return;
  }
  const images = [...(node.data?.outputImages || [])];
  if (pendingIdx < images.length && images[pendingIdx] === '__pending__') {
    images[pendingIdx] = result;
  }
  const hasPendingResults = images.includes('__pending__');
  updateNode(nodeId, {
    content: result,
    status: hasPendingResults ? 'running' : 'completed',
    data: { ...node.data, ...extraData, outputImages: images },
  });
}
