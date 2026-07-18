import { useRef, useCallback, useEffect } from 'react';
import { CanvasNode, Connection } from '../types/pebblingTypes';
import * as canvasApi from '../services/api/canvas';
import type { CanvasListItem } from '../services/api/canvas';
import { downloadRemoteToOutput } from '../services/api/files';
import { isValidVideo } from '../components/PebblingCanvas/apiAdapters';

export interface CanvasPersistenceConfig {
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  outputNodeMapRef: React.MutableRefObject<Map<string, string>>;
  executeNodeRef: React.MutableRefObject<((nodeId: string) => void) | null>;
  canvasInitializedRef: React.MutableRefObject<boolean>;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setCanvasList: React.Dispatch<React.SetStateAction<CanvasListItem[]>>;
  setCurrentCanvasId: React.Dispatch<React.SetStateAction<string | null>>;
  setCanvasName: React.Dispatch<React.SetStateAction<string>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCanvasLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setHasOpenedCanvas: React.Dispatch<React.SetStateAction<boolean>>;
  currentCanvasId: string | null;
  canvasList: CanvasListItem[];
  canvasName: string;
  onCanvasCreated?: (canvasId: string, canvasName: string) => void;
}

export interface CanvasPersistenceResult {
  loadCanvasList: () => Promise<CanvasListItem[]>;
  loadCanvas: (canvasId: string) => Promise<void>;
  createNewCanvas: (name?: string) => Promise<canvasApi.CanvasData | null>;
  saveCurrentCanvas: () => Promise<void>;
  recoverVideoTasks: (nodesToCheck: CanvasNode[]) => Promise<void>;
  deleteCanvasById: (canvasId: string) => Promise<void>;
  renameCanvas: (newName: string) => Promise<void>;
  saveTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastSaveRef: React.MutableRefObject<{ nodes: string; connections: string }>;
  saveCanvasRef: React.MutableRefObject<(() => Promise<void>) | null>;
  pendingSaveRef: React.MutableRefObject<boolean>;
}

export function useCanvasPersistence(config: CanvasPersistenceConfig): CanvasPersistenceResult {
  const {
    nodesRef, connectionsRef, outputNodeMapRef, executeNodeRef,
    canvasInitializedRef,
    setNodes, setConnections, setCanvasList, setCurrentCanvasId,
    setCanvasName, setHasUnsavedChanges, setIsCanvasLoading, setHasOpenedCanvas,
    currentCanvasId, canvasList, canvasName,
    onCanvasCreated,
  } = config;

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<{ nodes: string; connections: string }>({ nodes: '', connections: '' });
  const saveCanvasRef = useRef<(() => Promise<void>) | null>(null);
  const pendingSaveRef = useRef(false);

  const loadCanvasList = useCallback(async (): Promise<CanvasListItem[]> => {
    try {
      const result = await canvasApi.getCanvasList();
      if (result.success && result.data) { setCanvasList(result.data); return result.data; }
    } catch (e) { console.error('[Canvas] 加载列表失败:', e); }
    return [];
  }, []);

  const recoverVideoTasks = useCallback(async (nodesToCheck: CanvasNode[]) => {
    const stuckOutputNodes = nodesToCheck.filter(node =>
      node.type === 'output' && node.status === 'running' &&
      (node.data as any)?.videoTaskId && !isValidVideo(node.content));
    if (stuckOutputNodes.length === 0) return;
    for (let i = 0; i < stuckOutputNodes.length; i++) {
      const outNode = stuckOutputNodes[i];
      const conn = connectionsRef.current.find(c => c.toNode === outNode.id);
      if (!conn) continue;
      const sourceNode = nodesRef.current.find(n => n.id === conn.fromNode);
      if (!sourceNode || sourceNode.type !== 'video') continue;
      setTimeout(() => { if (executeNodeRef.current) executeNodeRef.current(sourceNode.id); }, i * 500);
    }
  }, []);

  const loadCanvas = useCallback(async (canvasId: string) => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (currentCanvasId && currentCanvasId !== canvasId) {
      const currentNodesStr = JSON.stringify(nodesRef.current);
      const currentConnsStr = JSON.stringify(connectionsRef.current);
      const hasChanges = currentNodesStr !== lastSaveRef.current.nodes || currentConnsStr !== lastSaveRef.current.connections;
      if (hasChanges || nodesRef.current.length > 0) {
        try {
          await canvasApi.updateCanvas(currentCanvasId, { nodes: nodesRef.current, connections: connectionsRef.current });
          lastSaveRef.current = { nodes: currentNodesStr, connections: currentConnsStr };
          await loadCanvasList();
        } catch (e) { console.error('[画布切换] 保存失败:', e); }
      }
    }
    setIsCanvasLoading(true);
    try {
      const result = await canvasApi.getCanvas(canvasId);
      if (result.success && result.data) {
        const loadedNodes = result.data.nodes || [];
        const loadedConnections = result.data.connections || [];
        setCurrentCanvasId(canvasId);
        setCanvasName(result.data.name);
        nodesRef.current = [];
        connectionsRef.current = [];
        outputNodeMapRef.current.clear();
        setNodes(loadedNodes);
        setConnections(loadedConnections);
        nodesRef.current = loadedNodes;
        connectionsRef.current = loadedConnections;
        lastSaveRef.current = { nodes: JSON.stringify(loadedNodes), connections: JSON.stringify(loadedConnections) };
        setHasUnsavedChanges(false);
        setTimeout(() => { recoverVideoTasks(loadedNodes); }, 1000);
      }
    } catch (e) { console.error('[画布切换] 加载画布失败:', e); }
    setIsCanvasLoading(false);
    setHasOpenedCanvas(true);
  }, [currentCanvasId, loadCanvasList]);

  const createNewCanvas = useCallback(async (name?: string): Promise<canvasApi.CanvasData | null> => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (currentCanvasId) {
      const currentNodesStr = JSON.stringify(nodesRef.current);
      const currentConnsStr = JSON.stringify(connectionsRef.current);
      const hasChanges = currentNodesStr !== lastSaveRef.current.nodes || currentConnsStr !== lastSaveRef.current.connections;
      if (hasChanges || nodesRef.current.length > 0) {
        try {
          await canvasApi.updateCanvas(currentCanvasId, { nodes: nodesRef.current, connections: connectionsRef.current });
          lastSaveRef.current = { nodes: currentNodesStr, connections: currentConnsStr };
          await loadCanvasList();
        } catch (e) { console.error('[创建画布] 保存失败:', e); }
      }
    }
    try {
      let finalName = name;
      if (!finalName) {
        const latestList = await loadCanvasList();
        const existingNames = new Set(latestList.map(c => c.name));
        let index = 1;
        while (existingNames.has(`画布 ${index}`)) index++;
        finalName = `画布 ${index}`;
      }
      const result = await canvasApi.createCanvas({ name: finalName });
      if (result.success && result.data) {
        setCurrentCanvasId(result.data.id); setCanvasName(result.data.name);
        setNodes([]); setConnections([]);
        nodesRef.current = []; connectionsRef.current = [];
        lastSaveRef.current = { nodes: '[]', connections: '[]' };
        setHasUnsavedChanges(false);
        await loadCanvasList();
        setHasOpenedCanvas(true);
        if (onCanvasCreated) onCanvasCreated(result.data.id, result.data.name);
        return result.data;
      }
    } catch (e) { console.error('[创建画布] 创建画布失败:', e); }
    return null;
  }, [loadCanvasList, onCanvasCreated, currentCanvasId]);

  const saveCurrentCanvas = useCallback(async () => {
    if (!currentCanvasId) return;
    const currentCanvas = canvasList.find(c => c.id === currentCanvasId);
    const currentCanvasName = currentCanvas?.name || canvasName;
    const localizedNodes = await Promise.all(nodesRef.current.map(async (node) => {
      if (!node.content) return node;
      const isBase64 = node.content.startsWith('data:image');
      const isTempUrl = node.content.startsWith('http') && !node.content.includes('/files/output/') && !node.content.includes('/files/input/');
      if (!isBase64 && !isTempUrl) return node;
      try {
        let result;
        if (isBase64) result = await canvasApi.saveCanvasImage(node.content, currentCanvasName, node.id, currentCanvasId);
        else result = await downloadRemoteToOutput(node.content, `canvas_${node.id}_${Date.now()}.png`);
        if (result?.success && result.data?.url) return { ...node, content: result.data.url };
      } catch (e) { console.error('[Canvas] 图片本地化失败:', e); }
      return node;
    }));
    const nodesStr = JSON.stringify(localizedNodes);
    const connectionsStr = JSON.stringify(connectionsRef.current);
    if (nodesStr === lastSaveRef.current.nodes && connectionsStr === lastSaveRef.current.connections) return;
    try {
      await canvasApi.updateCanvas(currentCanvasId, { nodes: localizedNodes, connections: connectionsRef.current });
      nodesRef.current = localizedNodes;
      setNodes(localizedNodes);
      lastSaveRef.current = { nodes: nodesStr, connections: connectionsStr };
      await loadCanvasList();
    } catch (e) { console.error('[Canvas] 保存失败:', e); }
  }, [currentCanvasId, canvasList, canvasName, loadCanvasList]);

  useEffect(() => { saveCanvasRef.current = saveCurrentCanvas; }, [saveCurrentCanvas]);

  const deleteCanvasById = useCallback(async (canvasId: string) => {
    try {
      const currentList = canvasList.length > 0 ? canvasList : await loadCanvasList();
      const deleteIndex = currentList.findIndex(c => c.id === canvasId);
      const isDeletingCurrent = canvasId === currentCanvasId;
      const result = await canvasApi.deleteCanvas(canvasId);
      if (result.success) {
        const updatedList = await loadCanvasList();
        if (isDeletingCurrent) {
          if (updatedList.length === 0) await createNewCanvas();
          else {
            const nextCanvas = deleteIndex < updatedList.length ? updatedList[deleteIndex] : updatedList[updatedList.length - 1];
            await loadCanvas(nextCanvas.id);
          }
        }
      }
    } catch (e) { console.error('[删除画布] 删除失败:', e); }
  }, [currentCanvasId, canvasList, loadCanvasList, createNewCanvas, loadCanvas]);

  const renameCanvas = useCallback(async (newName: string) => {
    if (!currentCanvasId || !newName.trim()) return;
    try {
      const result = await canvasApi.updateCanvas(currentCanvasId, { name: newName.trim() });
      if (result.success) { setCanvasName(newName.trim()); await loadCanvasList(); }
    } catch (e) { console.error('[Canvas] 重命名失败:', e); }
  }, [currentCanvasId, loadCanvasList]);

  return {
    loadCanvasList, loadCanvas, createNewCanvas, saveCurrentCanvas,
    recoverVideoTasks, deleteCanvasById, renameCanvas,
    saveTimerRef, lastSaveRef, saveCanvasRef, pendingSaveRef,
  };
}
