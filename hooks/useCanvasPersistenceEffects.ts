import { useEffect } from 'react';
import { CanvasNode, Connection } from '../types/pebblingTypes';
import type { CanvasListItem } from '../services/api/canvas';

export interface PersistenceEffectsConfig {
  canvasInitializedRef: React.MutableRefObject<boolean>;
  saveTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastSaveRef: React.MutableRefObject<{ nodes: string; connections: string }>;
  pendingSaveRef: React.MutableRefObject<boolean>;
  saveCurrentCanvas: () => Promise<void>;
  loadCanvasList: () => Promise<CanvasListItem[]>;
  currentCanvasId: string | null;
  nodes: CanvasNode[];
  connections: Connection[];
  draggingNodeId: string | null;
  isDragOperation: boolean;
  autoSaveEnabled: boolean;
}

export function useCanvasPersistenceEffects(config: PersistenceEffectsConfig): void {
  const {
    canvasInitializedRef, saveTimerRef, lastSaveRef, pendingSaveRef,
    saveCurrentCanvas, loadCanvasList,
    currentCanvasId, nodes, connections,
    draggingNodeId, isDragOperation, autoSaveEnabled,
  } = config;

  useEffect(() => {
    const initCanvas = async () => {
      await loadCanvasList();
      canvasInitializedRef.current = true;
    };
    initCanvas();
  }, []);

  useEffect(() => {
    if (!currentCanvasId || !autoSaveEnabled || draggingNodeId || isDragOperation) return;
    pendingSaveRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = false;
      const doSave = () => {
        const currentNodesStr = JSON.stringify(nodes);
        const currentConnsStr = JSON.stringify(connections);
        if (currentNodesStr === lastSaveRef.current.nodes && currentConnsStr === lastSaveRef.current.connections) return;
        saveCurrentCanvas();
      };
      if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(doSave, { timeout: 3000 });
      else setTimeout(doSave, 0);
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, connections, currentCanvasId, saveCurrentCanvas, draggingNodeId, isDragOperation, autoSaveEnabled]);
}
