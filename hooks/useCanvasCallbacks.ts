import { useCallback, useMemo, useRef } from 'react';
import { CanvasNode, Connection, Vec2 } from '../types/pebblingTypes';
import { IMAGE_CONSUMING_NODE_TYPES } from '../components/PebblingCanvas/apiAdapters';

export type CanvasNodeRenderMeta = {
  cascadeCount: number;
  isCascadeTerminal: boolean;
  autoResolvedContent?: string;
  effectiveColor?: string;
  hasDownstream: boolean;
  incomingConnections: Array<{ fromNode: string; toPortKey?: string }>;
};

export interface CallbackDeps {
  nodes: CanvasNode[]; connections: Connection[];
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  canvasOffset: { x: number; y: number }; scale: number;
  selectedNodeIds: Set<string>;
  dragTick: number;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewImage: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewScale: React.Dispatch<React.SetStateAction<number>>;
  setPreviewPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  handleExecuteNode: (nodeId: string, batchCount?: number) => Promise<void>;
  runCascade: (nodeId: string) => Promise<void>;
  uuid: () => string;
  addNode: (type: any, content?: string, pos?: { x: number; y: number }, title?: string, data?: any) => CanvasNode;
  onImageGenerated?: (url: string, prompt: string, canvasId?: string, canvasName?: string) => void;
  currentCanvasId: string | null;
  canvasName: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  creativeIdeas: any[];
  downloadAndSaveVideo: (videoUrl: string, outNodeId: string, signal: AbortSignal) => Promise<void>;
  addAbortController: (nodeId: string, ctrl: AbortController) => void;
  removeAbortController: (nodeId: string, ctrl: AbortController) => void;
  handleStartConnection: (nodeId: string, portType: 'in' | 'out', pos: Vec2) => void;
  computeCascadeOrder: (nodeId: string) => string[];
  resolveInputs: (nodeId: string, visited?: Set<string>, excludePortKeys?: string[]) => { images: string[]; texts: string[] };
  resolveEffectiveType: (nodeId: string, visited?: Set<string>) => string;
}

export function useCanvasCallbacks(deps: CallbackDeps) {
  const {
    nodes, connections,
    nodesRef, connectionsRef,
    canvasOffset, scale,
    selectedNodeIds, dragTick,
    setNodes, setConnections,
    setSelectedNodeIds, setSelectedConnectionId,
    setPreviewImage, setPreviewScale, setPreviewPos,
    setHasUnsavedChanges, setContextMenu,
    updateNode, handleExecuteNode, runCascade,
    uuid, addNode,
    onImageGenerated, currentCanvasId, canvasName,
    containerRef, creativeIdeas,
    downloadAndSaveVideo,
    addAbortController, removeAbortController,
    handleStartConnection,
    computeCascadeOrder, resolveInputs, resolveEffectiveType,
  } = deps;
// ====== Stabilized callbacks (useCallback) — prevent React.memo breakage ======
// These replace inline functions in nodes.map(), giving stable references
// across re-renders so that CanvasNodeItem's React.memo can actually work.

const handleNodeSelect = useCallback((id: string, multi?: boolean) => {
  setSelectedNodeIds(prev => {
    const newSet = new Set(multi ? prev : []);
    newSet.add(id);
    return newSet;
  });
}, []);

const handleNodeContextMenu = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const nodeId = target.getAttribute('data-node-id');
  if (nodeId) {
    setSelectedNodeIds(prev => {
      if (!prev.has(nodeId)) {
        return new Set([nodeId]);
      }
      return prev;
    });
  }
  setContextMenu({ x: e.clientX, y: e.clientY });
}, []);

const handleNodeDelete = useCallback((id: string) => {
  setNodes(prev => prev.filter(n => n.id !== id));
}, []);

const handleNodeDownload = useCallback(async (id: string) => {
  const n = nodesRef.current.find(x => x.id === id);
  if (!n || !n.content) {
    console.warn('[Download] 节点无内容:', id);
    return;
  }
  const isVideo = n.content.startsWith('data:video') || n.content.includes('.mp4') || n.type === 'video';
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `pebbling-${n.id}.${ext}`;
  const content = n.content;
  if (content.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = content;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  try {
    let urlToFetch = content;
    if (content.startsWith('/files/') || content.startsWith('/api/')) {
      urlToFetch = `http://localhost:8765${content}`;
    }
    const response = await fetch(urlToFetch);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error('[Download] 下载失败:', error);
    window.open(content, '_blank');
  }
}, []);

const handleNodeStartConnection = useCallback((id: string, type: 'in' | 'out', pos: Vec2) => {
  handleStartConnection(id, type, pos);
}, [handleStartConnection]);

const handleNodeRetryVideoDownload = useCallback(async (id: string) => {
  const n = nodesRef.current.find(x => x.id === id);
  if (!n || !n.data?.videoUrl) {
    console.warn('[RetryDownload] 节点无原始URL:', id);
    return;
  }
  const videoUrl = n.data.videoUrl;
  updateNode(id, {
    status: 'running',
    data: { ...n.data, videoFailReason: undefined }
  });
  const controller = new AbortController();
  addAbortController(id, controller);
  try {
    await downloadAndSaveVideo(videoUrl, id, controller.signal);
  } catch (err: any) {
    console.error('[RetryDownload] 重试失败:', err);
    updateNode(id, {
      status: 'error',
      data: { ...n.data, videoFailReason: `重试失败: ${err.message || err}` }
    });
  } finally {
    removeAbortController(id, controller);
  }
}, [updateNode, addAbortController, removeAbortController, downloadAndSaveVideo]);

const handleNodePreviewImage = useCallback((imageUrl: string) => {
  setPreviewImage(imageUrl.startsWith('/files/') ? `http://localhost:8765${imageUrl}` : imageUrl);
}, []);

const handleNodeClearImage = useCallback((id: string) => {
  updateNode(id, { content: '' });
  setHasUnsavedChanges(true);
}, [updateNode]);

const handleNodeImageContextMenu = useCallback((action: string, imageUrl: string) => {
  if (action === 'addToDesktop') {
    onImageGenerated?.(imageUrl, '输出图片', currentCanvasId || undefined, canvasName);
  } else if (action === 'edit') {
    const fullUrl = imageUrl.startsWith('/files/') ? `http://localhost:8765${imageUrl}` : imageUrl;
    addNode('image', fullUrl, { x: 100, y: 100 }, '上传图片');
  }
}, [onImageGenerated, currentCanvasId, canvasName, addNode]);

  // Ref to hold edgeNumberMap for synchronous reads in JSX
  const edgeNumberMapRef = useRef<Map<string, { number: number; total: number }>>(new Map());

  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    nodesRef.current.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes, nodesRef, dragTick]);

  const connectionsByTo = useMemo(() => {
    const map = new Map<string, Connection[]>();
    connections.forEach(c => {
      const arr = map.get(c.toNode) || [];
      arr.push(c);
      map.set(c.toNode, arr);
    });
    return map;
  }, [connections]);

  const connectionsByFrom = useMemo(() => {
  const map = new Map<string, Connection[]>();
  connections.forEach(c => {
    const arr = map.get(c.fromNode) || [];
    arr.push(c);
    map.set(c.fromNode, arr);
  });
  return map;
}, [connections]);


// ====== Viewport culling: only render nodes within or near the visible area ======
const viewport = useMemo(() => ({
  left: -canvasOffset.x / scale - 300,
  top: -canvasOffset.y / scale - 300,
  right: (-canvasOffset.x + window.innerWidth) / scale + 300,
  bottom: (-canvasOffset.y + window.innerHeight) / scale + 300,
}), [canvasOffset.x, canvasOffset.y, scale]);

const visibleNodes = useMemo(() => {
  return nodesRef.current.filter(n =>
    n.x + (n.width || 300) >= viewport.left &&
    n.x <= viewport.right &&
    n.y + (n.height || 200) >= viewport.top &&
    n.y <= viewport.bottom
  );
}, [nodes, nodesRef, viewport, dragTick]);

const visibleNodeIds = useMemo(() => {
  const set = new Set<string>();
  visibleNodes.forEach(n => set.add(n.id));
  return set;
}, [visibleNodes]);

// Only render connections that have at least one endpoint visible
const visibleConnections = useMemo(() => {
  return connections.filter(c =>
    visibleNodeIds.has(c.fromNode) || visibleNodeIds.has(c.toNode)
  );
}, [connections, visibleNodeIds]);

// Pre-compute node render metadata outside CanvasRenderer's JSX loop.
const nodeRenderMetaById = useMemo(() => {
  const map = new Map<string, CanvasNodeRenderMeta>();
  for (const node of visibleNodes) {
    const cascadeOrder = computeCascadeOrder(node.id);
    const autoResolvedContent = node.type === 'show-text' || node.type === 'prompt-line'
      ? (() => {
        const resolved = resolveInputs(node.id);
        return resolved.texts.join('\n').trim() || undefined;
      })()
      : undefined;
    const effectiveColor = node.type === 'relay'
      ? 'stroke-' + resolveEffectiveType(node.id).replace('text', 'emerald').replace('image', 'blue').replace('llm', 'purple') + '-400'
      : undefined;
    map.set(node.id, {
      cascadeCount: cascadeOrder.length,
      isCascadeTerminal: cascadeOrder.length >= 1,
      autoResolvedContent,
      effectiveColor,
      hasDownstream: (connectionsByFrom.get(node.id)?.length || 0) > 0,
      incomingConnections: (connectionsByTo.get(node.id) || []).map(c => ({ fromNode: c.fromNode, toPortKey: c.toPortKey })),
    });
  }
  return map;
}, [visibleNodes, computeCascadeOrder, resolveInputs, resolveEffectiveType, connectionsByFrom, connectionsByTo]);

// Pre-compute edge number badges — moved from inline IIFE to useMemo
const edgeNumberMap = useMemo(() => {
  const map = new Map<string, { number: number; total: number }>();
  for (const node of nodes) {
    if (!IMAGE_CONSUMING_NODE_TYPES.has(node.type)) continue;
    const incomingConns = connectionsByTo.get(node.id);
    if (!incomingConns || incomingConns.length <= 1) continue;
    const upstream = incomingConns
      .map(c => nodeMap.get(c.fromNode))
      .filter((n): n is CanvasNode => !!n)
      .filter(n => n.type === 'image')
      .sort((a, b) => a.y - b.y);
    const idxMap = new Map<string, number>();
    upstream.forEach((n, i) => idxMap.set(n.id, i + 1));
    for (const conn of incomingConns) {
      const idx = idxMap.get(conn.fromNode);
      if (idx !== undefined) {
        map.set(conn.id, { number: idx, total: upstream.length });
      }
    }
  }
  return map;
}, [nodes, connectionsByTo, nodeMap]);

// Sync edgeNumberMap to ref for use in JSX
edgeNumberMapRef.current = edgeNumberMap;



  return {
    handleNodeSelect, handleNodeContextMenu, handleNodeDelete,
    handleNodeDownload, handleNodeStartConnection, handleNodeRetryVideoDownload,
    handleNodePreviewImage, handleNodeClearImage, handleNodeImageContextMenu,
    visibleNodes, visibleConnections, viewport, edgeNumberMap,
    nodeRenderMetaById,
    edgeNumberMapRef, connectionsByFrom, connectionsByTo, nodeMap,
  };
}
