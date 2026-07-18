import { CanvasNode, Connection } from '../../../types/pebblingTypes';

/**
 * Shared context object passed to all node executor functions.
 * Carries all state refs, setters, and utility functions that executors need
 * without importing from index.tsx directly.
 */
export interface ExecutorContext {
  node: CanvasNode;
  nodeId: string;
  signal: AbortSignal;
  inputs: { images: string[]; texts: string[] };
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  getOrCreateOutputNode: (sourceId: string, outputType?: string) => { node: CanvasNode; pendingIdx: number };
  resolveOutputPending: (nodeId: string, pendingIdx: number, result: string, extraData?: Record<string, any>) => void;
  handleExecuteNode: (nodeId: string, batchCount?: number) => Promise<void>;
  saveCurrentCanvas: () => Promise<void>;
  onImageGenerated?: (url: string, prompt: string, canvasId?: string, canvasName?: string) => void;
  currentCanvasId?: string | null;
  canvasName: string;
  uuid: () => string;
  addAbortController: (nodeId: string, controller: AbortController) => void;
  removeAbortController: (nodeId: string, controller: AbortController) => void;
  executingNodesRef: React.MutableRefObject<Set<string>>;
  llmTaskCountersRef: React.MutableRefObject<Map<string, { total: number; completed: number }>>;
  rhTaskQueue: any;
  resolveInputs: (nodeId: string, visited?: Set<string>, excludePortKeys?: string[]) => { images: string[]; texts: string[] };
}
