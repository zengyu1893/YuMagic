
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CanvasNode, Vec2, NodeType, Connection, GenerationConfig, NodeData, CanvasPreset, PresetInput, CASCADE_EXECUTABLE_TYPES } from '../../types/pebblingTypes';
import { CreativeIdea } from '../../types';
import FloatingInput from './FloatingInput';
import CanvasNodeItem from './CanvasNode';
import Sidebar from './Sidebar';
import ContextMenu from './ContextMenu';
import PresetCreationModal from './PresetCreationModal';
import PresetInstantiationModal from './PresetInstantiationModal';
import CanvasNameBadge from './CanvasNameBadge';
import CanvasSelector from './CanvasSelector';
import { editImageWithGemini, chatWithThirdPartyApi, stripThinkingTags, getThirdPartyConfig, ImageEditConfig } from '../../services/geminiService';
import { runAIApp, getAIAppInfo } from '../../services/api/runninghub';
import { RH_PRESETS } from '../../constants/rhPresets';
import { useRHTaskQueue } from '../../contexts/RHTaskQueueContext';
import * as canvasApi from '../../services/api/canvas';
import { Icons } from './Icons';
import { isApiConfigured, guessMimeType, base64ToFile, generateCreativeText, generateAdvancedLLM, isValidVideo, isValidImage, IMAGE_CONSUMING_NODE_TYPES, pointOnCubicBezier, extractImageMetadata } from './apiAdapters';
import type { ImageMetadata } from './apiAdapters';
import { uuid, resizeImageClient } from './canvasUtils';
import { getConnectionEndpoints } from './connectionRouting';
import { resolveInputs as resolveInputsImpl } from './execution/resolveInputs';
import { getOrCreateOutputNode as getOrCreateOutputNodeImpl, resolveOutputPending as resolveOutputPendingImpl } from './execution/outputNodeManager';
import { ExecutorContext } from './execution/executorTypes';
import { executeTextNode, executeShowTextNode, executeReplaceTextNode, executePromptLineNode } from './execution/executeTextNodes';
import { executeLLMNode } from './execution/executeLLMNode';
import { executeImageNode } from './execution/executeImageNode';
import { executeEditNode } from './execution/executeEditNode';
import { executeRemoveBgNode, executeUpscaleNode, executeDrawingBoardNode } from './execution/executeImageEditingNodes';
import { executeBPNode } from './execution/executeBPNode';
import { executeVideoNode, downloadAndSaveVideo } from './execution/executeVideoNode';
import { executeRunningHubConfigNode, executeRHMainNode } from './execution/executeRunningHubNodes';
import { executeFloatingGenerate } from './execution/executeFloatingGenerate';
import { useCanvasPersistence } from '../../hooks/useCanvasPersistence';
import { useCanvasPersistenceEffects } from '../../hooks/useCanvasPersistenceEffects';
import { createNode, createRHPresetNode as createRHPresetNodeImpl, NodeFactoryContext } from './services/nodeFactory';
import CanvasRenderer from './CanvasRenderer';
import { useCanvasCallbacks, CallbackDeps } from '../../hooks/useCanvasCallbacks';
import { useCanvasMouse } from '../../hooks/useCanvasMouse';
import { useCanvasDrag } from '../../hooks/useCanvasDrag';
import { useCanvasTool } from '../../hooks/useCanvasTool';
import { computeCascadeOrder as computeCascadeOrderImpl, runCascade as runCascadeImpl, CascadeContext } from './execution/cascadeRunner';
import { handleBatchExecute as handleBatchExecuteImpl, handleBpIdeaBatchExecute as handleBpIdeaBatchExecuteImpl, BatchContext } from './execution/batchHandlers';
import { handleToolBatchExecute as handleToolBatchExecuteImpl, handleVideoBatchExecute as handleVideoBatchExecuteImpl } from './execution/batchHandlers2';
import { shouldIgnoreCanvasShortcut } from './canvasKeyboardShortcuts';

// === 画布组件开始 ===

interface PebblingCanvasProps {
  onImageGenerated?: (imageUrl: string, prompt: string, canvasId?: string, canvasName?: string) => void; // 回调同步到桌面（含画布ID用于联动）
  onCanvasCreated?: (canvasId: string, canvasName: string) => void; // 画布创建回调（用于桌面联动创建文件夹）
  creativeIdeas?: CreativeIdea[]; // 主项目创意库
  isActive?: boolean; // 画布是否处于活动状态（用于快捷键作用域控制）
  pendingImageToAdd?: { imageUrl: string; imageName?: string } | null; // 待添加的图片（从桌面添加）
  onPendingImageAdded?: () => void; // 图片添加完成后的回调
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>; // 暴露保存函数给父组件
}

const PebblingCanvas: React.FC<PebblingCanvasProps> = ({ 
  onImageGenerated, 
  onCanvasCreated, 
  creativeIdeas = [], 
  isActive = true,
  pendingImageToAdd,
  onPendingImageAdded,
  saveRef,
}) => {
  // --- 画布管理状态 ---
  const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(null);
  const [canvasList, setCanvasList] = useState<canvasApi.CanvasListItem[]>([]);
  const [canvasName, setCanvasName] = useState('未命名画布');
  const [isCanvasLoading, setIsCanvasLoading] = useState(false);
  const [hasOpenedCanvas, setHasOpenedCanvas] = useState(false);

  // --- State ---
  const [showIntro, setShowIntro] = useState(false); // 禁用解锁动画
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // 右键预览
  const [previewScale, setPreviewScale] = useState(1); // 预览缩放
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 }); // 预览拖拽位置

  // 自动保存状态（默认禁用，首次操作后启用）
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  
  // 未保存标记（用于提醒用户）
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs for State (to avoid stale closures in execution logic)
  const nodesRef = useRef<CanvasNode[]>([]);
  const connectionsRef = useRef<Connection[]>([]);

  useEffect(() => {
      nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
      connectionsRef.current = connections;
  }, [connections]);
  
  // Canvas Transform
  const [canvasOffset, setCanvasOffset] = useState<Vec2>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState<Vec2>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false); // 空格键状态，用于拖拽画布
  const [isPanMode, setIsPanMode] = useState(false); // 平移模式开关

  // Node Selection & Dragging
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set<string>());
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isDragOperation, setIsDragOperation] = useState(false); // Tracks if actual movement occurred
  const [dragTick, setDragTick] = useState(0); // Lightweight counter to repaint SVG connections during drag w/o breaking node memo
  
  // Refs to track dragging state for immediate save detection
  const draggingNodeIdRef = useRef<string | null>(null);
  const isDragOperationRef = useRef(false);

  // Refs for canvas transform — allow useCallback handlers to read latest values
  // without listing canvasOffset/scale as dependencies (which would break memo)
  const canvasOffsetRef = useRef(canvasOffset);
  canvasOffsetRef.current = canvasOffset;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  
  useEffect(() => {
    draggingNodeIdRef.current = draggingNodeId;
  }, [draggingNodeId]);
  
  useEffect(() => {
    isDragOperationRef.current = isDragOperation;
  }, [isDragOperation]);
  
  // Copy/Paste Buffer
  const clipboardRef = useRef<CanvasNode[]>([]);

  // Abort Controllers for cancelling operations (支持同一节点并发多次执行)
  const abortControllersRef = useRef<Map<string, Set<AbortController>>>(new Map());
  const addAbortController = (nodeId: string, ctrl: AbortController) => {
      const set = abortControllersRef.current.get(nodeId) || new Set();
      set.add(ctrl);
      abortControllersRef.current.set(nodeId, set);
  };
  const removeAbortController = (nodeId: string, ctrl: AbortController) => {
      abortControllersRef.current.get(nodeId)?.delete(ctrl);
  };
  const abortAllForNode = (nodeId: string) => {
      const controllers = abortControllersRef.current.get(nodeId);
      if (controllers) {
          controllers.forEach(c => {
              c.abort();
              removeAbortController(nodeId, c);
          });
      }
  };
  const cascadeControllersRef = useRef<Map<string, AbortController>>(new Map()); // 级联执行中止控制器
  const executingNodesRef = useRef<Set<string>>(new Set()); // 正在执行的节点ID集合，用于防止重复执行
  // Dragging Mathematics (Delta based)
  const [dragStartMousePos, setDragStartMousePos] = useState<Vec2>({ x: 0, y: 0 });
  const dragStartMousePosRef = useRef<Vec2>({ x: 0, y: 0 }); // ref 备份，供实时更新
  const [initialNodePositions, setInitialNodePositions] = useState<Map<string, Vec2>>(new Map());
  const initialNodePositionsRef = useRef<Map<string, Vec2>>(new Map()); // ref 同步备份，供 RAF 使用
  
  // 拖拽优化：使用 ref 存储实时偏移量，避免频繁 setState
  const dragDeltaRef = useRef<Vec2>({ x: 0, y: 0 });
  const canvasDragRef = useRef<Vec2>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isCanvasDraggingRef = useRef(false);
  const snapshotImagesRef = useRef<Map<string, string>>(new Map()); // 级联执行时锁定源图片快照，防止用户中途换图
  const outputNodeMapRef = useRef<Map<string, string>>(new Map()); // sourceNodeId→outputNodeId，由 getOrCreateOutputNode 独占维护，不受 useEffect/saveCurrentCanvas 覆盖
  const cascadeCacheRef = useRef<Map<string, string[]>>(new Map()); // 缓存 computeCascadeOrder 结果
  const llmTaskCountersRef = useRef<Map<string, { total: number; completed: number }>>(new Map()); // LLM 节点多任务计数器
  
  // 上次鼠标位置，用于计算画布平移时的增量
  const lastMousePosRef = useRef<Vec2>({ x: 0, y: 0 });
  
  // 缩放结束后的重绘定时器
  const zoomEndTimerRef = useRef<number | null>(null);
  
  // Ref to handleExecuteNode for use in callbacks (避免依赖循环)
  const executeNodeRef = useRef<((nodeId: string, batchCount?: number) => Promise<void>) | null>(null);
  const canvasInitializedRef = useRef(false); // 标记画布是否已初始化
  
  // Selection Box
  const [selectionBox, setSelectionBox] = useState<{ start: Vec2, current: Vec2 } | null>(null);

  // Connection Linking
  const [linkingState, setLinkingState] = useState<{
      active: boolean;
      fromNode: string | null;
      startPos: Vec2;
      currPos: Vec2;
  }>({ active: false, fromNode: null, startPos: { x: 0, y: 0 }, currPos: { x: 0, y: 0 } });

  // Generation Global Flag (Floating Input)
  const [isGenerating, setIsGenerating] = useState(false);
  
  // RH 任务队列
  const rhTaskQueue = useRHTaskQueue();

  // Presets & Libraries - Load from localStorage
  const [userPresets, setUserPresets] = useState<CanvasPreset[]>(() => {
    try {
      const saved = localStorage.getItem('pebbling_user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load presets:', e);
      return [];
    }
  });

  // Save presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pebbling_user_presets', JSON.stringify(userPresets));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }, [userPresets]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [nodesForPreset, setNodesForPreset] = useState<CanvasNode[]>([]); // Buffer for preset creation
  
  // Preset Instantiation
  const [instantiatingPreset, setInstantiatingPreset] = useState<CanvasPreset | null>(null);

  // API Settings Modal
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);

  // 画布主题（深色/浅色）
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('pebbling_canvas_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });
  const isLightCanvas = canvasTheme === 'light';

  // 保存画布主题到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pebbling_canvas_theme', canvasTheme);
    } catch (e) {
      console.error('Failed to save canvas theme:', e);
    }
  }, [canvasTheme]);

  // Check API configuration on mount
  useEffect(() => {
    setApiConfigured(isApiConfigured());
  }, []);

  // --- 画布持久化逻辑 (extracted to hooks/) ---
  const {
    loadCanvasList,
    loadCanvas,
    createNewCanvas,
    saveCurrentCanvas,
    recoverVideoTasks,
    deleteCanvasById,
    renameCanvas,
    saveTimerRef,
    lastSaveRef,
    saveCanvasRef,
    pendingSaveRef,
  } = useCanvasPersistence({
    nodesRef, connectionsRef, outputNodeMapRef, executeNodeRef, canvasInitializedRef,
    setNodes, setConnections, setCanvasList, setCurrentCanvasId, setCanvasName,
    setHasUnsavedChanges, setIsCanvasLoading, setHasOpenedCanvas,
    currentCanvasId, canvasList, canvasName,
    onCanvasCreated,
  });

  useCanvasPersistenceEffects({
    canvasInitializedRef,
    saveTimerRef, lastSaveRef, pendingSaveRef,
    saveCurrentCanvas, loadCanvasList,
    currentCanvasId, nodes, connections,
    draggingNodeId, isDragOperation, autoSaveEnabled,
  });

  // Re-check API config when settings modal closes
  const handleCloseApiSettings = () => {
    setShowApiSettings(false);
    setApiConfigured(isApiConfigured());
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Color Logic ---
  const resolveEffectiveType = useCallback((nodeId: string, visited: Set<string> = new Set()): string => {
      if (visited.has(nodeId)) return 'default';
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return 'default';
      if (node.type !== 'relay') return node.type;
      const inputConnection = connections.find(c => c.toNode === nodeId);
      if (inputConnection) return resolveEffectiveType(inputConnection.fromNode, visited);
      return 'default';
  }, [nodes, connections]);

  const getLinkColor = (effectiveType: string, isSelected: boolean) => {
      if (isSelected) return '#f97316'; // Orange for selected
      switch (effectiveType) {
          case 'image': case 'edit': case 'remove-bg': case 'upscale': case 'resize': return '#3b82f6';
          case 'llm': return '#a855f7'; // Purple for LLM/Logic
          case 'text': case 'idea': return '#10b981'; // Emerald for Text/Idea
          case 'video': return '#eab308';
          default: return '#71717a';
      }
  };

  // --- Actions ---

  // 启用自动保存（首次操作时触发）
  const enableAutoSave = useCallback(() => {
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
      console.log('[自动保存] 已启用');
    }
  }, [autoSaveEnabled]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    console.log('[手动保存] 开始保存...');
    await saveCurrentCanvas();
    // 保存后清除未保存标记
    setHasUnsavedChanges(false);
    console.log('[手动保存] 保存完成');
  }, [saveCurrentCanvas]);

  // 暴露保存函数给父组件
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleManualSave;
    }
  }, [saveRef, handleManualSave]);

  const handleResetView = () => {
    setCanvasOffset({ x: 0, y: 0 });
    setScale(1);
  };


  const handleCopy = useCallback(() => {
      if (selectedNodeIds.size === 0) return;
      const nodesToCopy = nodesRef.current.filter(n => selectedNodeIds.has(n.id));
      // Store deep copy
      clipboardRef.current = JSON.parse(JSON.stringify(nodesToCopy));
  }, [selectedNodeIds]);

  const handlePaste = useCallback(() => {
      if (clipboardRef.current.length === 0) return;
      
      const newNodes: CanvasNode[] = [];
      const idMap = new Map<string, string>(); // Old ID -> New ID

      // Create new nodes
      clipboardRef.current.forEach(node => {
          const newId = uuid();
          idMap.set(node.id, newId);
          newNodes.push({
              ...node,
              id: newId,
              x: node.x + 50, // Offset
              y: node.y + 50,
              status: 'idle' // Reset status
          });
      });

      setNodes(prev => [...prev, ...newNodes]);
      setSelectedNodeIds(new Set(newNodes.map(n => n.id)));
      setHasUnsavedChanges(true); // 标记未保存
  }, []);

  // Wheel event handler for zooming
  const onWheel = useCallback((e: WheelEvent) => {
      // 🔧 检查事件源是否在文本类节点内，如果是则不缩放画布，让内容自然滚动
      const target = e.target as HTMLElement;
      // 检查是否在 textarea/文本容器内，或者父元素有 scrollable 类
      const isInTextArea = target.tagName === 'TEXTAREA' || 
                           target.tagName === 'INPUT' ||
                           target.closest('.overflow-y-auto') !== null ||
                           target.closest('.scrollbar-hide') !== null ||
                           target.closest('[data-scrollable]') !== null;
      
      if (isInTextArea) {
          // 不阻止默认行为，让内容自然滚动
          return;
      }
      
      // Wheel = Zoom centered on cursor
      e.preventDefault(); 

      const currentScale = scaleRef.current;
      const currentOffset = canvasOffsetRef.current;

      // 使用更平滑的缩放灵敏度
      const zoomSensitivity = 0.002;
      const rawDelta = -e.deltaY * zoomSensitivity;

      // 限制单次缩放幅度，避免跳跃
      const delta = Math.max(-0.15, Math.min(0.15, rawDelta));
      const newScale = Math.min(Math.max(0.1, currentScale * (1 + delta)), 5);

      // Calculate Zoom towards Mouse Position
      const container = containerRef.current;
      if (!container) {
          setScale(newScale);
          return;
      }

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Math: NewOffset = Mouse - ((Mouse - OldOffset) / OldScale) * NewScale
      const newOffsetX = mouseX - ((mouseX - currentOffset.x) / currentScale) * newScale;
      const newOffsetY = mouseY - ((mouseY - currentOffset.y) / currentScale) * newScale;

      // 使用 RAF 确保平滑更新
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
          setScale(newScale);
          setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      });
  }, []);

  // 添加原生 wheel 事件监听器（非被动模式）
  useEffect(() => {
    if (!hasOpenedCanvas) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [hasOpenedCanvas, onWheel]);

  const addNode = (type: NodeType, content: string = '', position?: Vec2, title?: string, data?: NodeData) => {
      const factoryCtx: NodeFactoryContext = {
        containerRef, canvasOffset, scale, nodesRef, nodes, uuid, setNodes, setHasUnsavedChanges,
      };
      return createNode(type, content, position, title, data, factoryCtx);
  };;

  // ============================================================
  // RunningHub 预设模式：创建空白 rh-config 节点，在节点内选择预设
  // ============================================================
  const createRHPresetNode = () => {
      const factoryCtx: NodeFactoryContext = {
        containerRef, canvasOffset, scale, nodesRef, nodes, uuid, setNodes, setHasUnsavedChanges,
        saveCurrentCanvas,
      };
      return createRHPresetNodeImpl(factoryCtx);
  };;

  // 处理从桌面添加图片到画布 - 使用 ref 避免闭包问题
  const pendingImageRef = useRef<{ imageUrl: string; imageName?: string } | null>(null);
  
  useEffect(() => {
    pendingImageRef.current = pendingImageToAdd || null;
    
    // 如果画布已初始化且有待添加的图片，直接处理
    if (canvasInitializedRef.current && pendingImageToAdd) {
      setTimeout(() => {
        processPendingImage();
      }, 100);
    }
  }, [pendingImageToAdd]);
  
  // 处理待添加的图片/视频（在画布初始化完成后调用）
  const processPendingImage = useCallback(() => {
    const pending = pendingImageRef.current;
    if (!pending) return;
    
    console.log('[Canvas] 处理待添加的内容:', pending.imageName);
    
    // 🔧 检测是视频还是图片
    const isVideo = pending.imageUrl.includes('.mp4') || pending.imageUrl.includes('.webm') || pending.imageUrl.startsWith('data:video');
    
    if (isVideo) {
      // 添加视频节点
      console.log('[Canvas] 添加视频节点');
      addNode('video-output', pending.imageUrl, undefined, pending.imageName || '视频');
    } else {
      // 添加图片节点
      addNode('image', pending.imageUrl, undefined, pending.imageName);
    }
    
    // 通知父组件内容已添加
    onPendingImageAdded?.();
    pendingImageRef.current = null;
  }, [onPendingImageAdded]);

  // Perf: 用 findIndex 替代 map，找到后立即停止遍历，O(k) 而非 O(N)
  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
      const refIdx = nodesRef.current.findIndex(n => n.id === id);
      if (refIdx !== -1) {
          nodesRef.current[refIdx] = { ...nodesRef.current[refIdx], ...updates };
      }

      setNodes(prev => {
          const idx = prev.findIndex(n => n.id === id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...prev[idx], ...updates };
          return next;
      });
  }, []);

  // --- EXECUTION LOGIC ---

  // Helper: Recursive Input Resolution - 向上追溯获取输入
  // 就近原则：收集沿途的文本，一旦找到图片就停止这条路径的回溯
  // excludePortKeys: 排除指定端口键值的连接（如 system 端口不作为用户提示词输入）
  const resolveInputs = useCallback((nodeId: string, visited = new Set<string>(), excludePortKeys?: string[]): { images: string[], texts: string[] } => {
      return resolveInputsImpl(nodeId, nodesRef.current, connectionsRef.current, snapshotImagesRef.current, visited, excludePortKeys);
  }, []);
;

  // --- 批量生成：创建多个结果节点并并发执行 ---
  const handleBatchExecute = async (sourceNodeId: string, sourceNode: CanvasNode, count: number) => {
      const batchCtx: BatchContext = {
        sourceNodeId, sourceNode, count,
        nodesRef, connectionsRef,
        updateNode, setNodes, setConnections, setHasUnsavedChanges,
        resolveInputs, saveCurrentCanvas,
        onImageGenerated, currentCanvasId, canvasName,
        uuid, addAbortController, removeAbortController,
      };
      await handleBatchExecuteImpl(batchCtx);
  };;

  // --- BP/Idea节点批量执行：自动创建图像节点并生成 ---
  const handleBpIdeaBatchExecute = async (sourceNodeId: string, sourceNode: CanvasNode, count: number) => {
      const batchCtx: BatchContext = {
        sourceNodeId, sourceNode, count,
        nodesRef, connectionsRef,
        updateNode, setNodes, setConnections, setHasUnsavedChanges,
        resolveInputs, saveCurrentCanvas,
        onImageGenerated, currentCanvasId, canvasName,
        uuid, addAbortController, removeAbortController,
      };
      await handleBpIdeaBatchExecuteImpl(batchCtx);
  };;

  // 工具节点批量执行（remove-bg/upscale）：创建多个结果节点
  const handleToolBatchExecute = async (sourceNodeId: string, sourceNode: CanvasNode, count: number) => {
      const batchCtx: BatchContext = {
        sourceNodeId, sourceNode, count,
        nodesRef, connectionsRef,
        updateNode, setNodes, setConnections, setHasUnsavedChanges,
        resolveInputs, saveCurrentCanvas,
        onImageGenerated, currentCanvasId, canvasName,
        uuid, addAbortController, removeAbortController,
      };
      await handleToolBatchExecuteImpl(batchCtx);
  };;

  // 视频节点批量执行：创建多个 video-output 节点
  const handleVideoBatchExecute = async (sourceNodeId: string, sourceNode: CanvasNode, count: number) => {
      const batchCtx: BatchContext = {
        sourceNodeId, sourceNode, count,
        nodesRef, connectionsRef,
        updateNode, setNodes, setConnections, setHasUnsavedChanges,
        resolveInputs, saveCurrentCanvas,
        onImageGenerated, currentCanvasId, canvasName,
        uuid, addAbortController, removeAbortController,
      };
      await handleVideoBatchExecuteImpl(batchCtx);
  };;

  // DFS 向上游遍历，收集所有需要级联执行的 idle 节点
  // 穿透 text/idea/image/relay 等非可执行节点，找到所有可执行的 upstream
  // 返回 post-order DFS：最上游排最前（拓扑序）
  // nodes 或 connections 变化时清空缓存
  useEffect(() => { cascadeCacheRef.current.clear(); }, [nodes, connections]);

  const computeCascadeOrder = useCallback((targetNodeId: string): string[] => {
      return computeCascadeOrderImpl(targetNodeId, nodesRef.current, connectionsRef.current, cascadeCacheRef.current);
  }, []);;

  // 获取或创建 OUTPUT 节点（复用已有连接），每次调用追加一个 pending 占位
  // 获取或创建 OUTPUT 节点（复用已有连接），每次调用追加一个 pending 占位
  // 🔧 使用独立 Map ref 做 sourceNodeId→outputNodeId 映射，不受 useEffect / saveCurrentCanvas 覆盖影响
  const getOrCreateOutputNode = (sourceNodeId: string, outputType?: string): { node: CanvasNode; pendingIdx: number } => {
      return getOrCreateOutputNodeImpl(
        sourceNodeId,
        nodesRef.current,
        connectionsRef.current,
        outputNodeMapRef.current,
        uuid,
        updateNode,
        setNodes,
        setConnections,
        setHasUnsavedChanges,
        outputType,
      );
  };
;

  // 将 pending 占位替换为实际结果
  const resolveOutputPending = (nodeId: string, pendingIdx: number, result: string, extraData?: Record<string, any>) => {
      resolveOutputPendingImpl(nodeId, pendingIdx, result, nodesRef.current, updateNode, extraData);
  };
;

  const handleExecuteNode = async (nodeId: string, batchCount: number = 1) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) {
          console.warn(`[执行] 节点 ${nodeId.slice(0,8)} 不存在`);
          return;
      }
      
      // 不再自动取消同一节点的旧任务，允许并发多次执行
      // 每次执行有独立的 pendingIdx 和 abortController，Stop 按钮取消最新一次

      // 批量生成：创建多个结果节点
      if (batchCount > 1 && ['image', 'edit'].includes(node.type)) {
          try {
              await handleBatchExecute(nodeId, node, batchCount);
          } finally {
              executingNodesRef.current.delete(nodeId); // 解锁
          }
          return;
      }
      
      // 工具节点批量执行：自动创建图像节点
      if (batchCount >= 1 && ['remove-bg', 'upscale'].includes(node.type)) {
          try {
              await handleToolBatchExecute(nodeId, node, batchCount);
          } finally {
              executingNodesRef.current.delete(nodeId); // 解锁
          }
          return;
      }
      
      // BP/Idea节点批量执行：自动创建图像节点
      // 级联中（有下游连接）：简化执行，只更新自身 data.output，不创建输出节点
      if (batchCount > 1 && node.type === 'idea') {
          try {
              await handleBpIdeaBatchExecute(nodeId, node, batchCount);
          } finally {
              executingNodesRef.current.delete(nodeId); // 瑙ｉ攣
          }
          return;
      }

      if (batchCount >= 1 && node.type === 'bp') {
          try {
              const hasDownstream = connectionsRef.current.some(c => c.fromNode === nodeId);
              if (batchCount === 1 && hasDownstream) {
                  // 级联路径：作为数据源，写入 data.output 供下游 resolveInputs 读取
                  const output = node.content || '';
                  updateNode(nodeId, { status: 'completed', data: { ...node.data, output } });
                  saveCurrentCanvas();
              } else {
                  await handleBpIdeaBatchExecute(nodeId, node, batchCount);
              }
          } finally {
              executingNodesRef.current.delete(nodeId); // 解锁
          }
          return;
      }
      
      // 视频节点批量执行：自动创建 video-output 节点
      if (batchCount >= 1 && node.type === 'video') {
          try {
              await handleVideoBatchExecute(nodeId, node, batchCount);
          } finally {
              executingNodesRef.current.delete(nodeId); // 解锁
          }
          return;
      }
      
      // 画板节点执行：接收图片(count=1) 或 输出PNG(count=2)
      if (node.type === 'drawing-board') {
        try {
          const dbCtx: ExecutorContext = {
            node, nodeId, signal: new AbortController().signal, inputs: resolveInputs(nodeId),
            nodesRef, connectionsRef,
            updateNode, setNodes, setConnections, setHasUnsavedChanges,
            getOrCreateOutputNode, resolveOutputPending,
            handleExecuteNode, saveCurrentCanvas,
            onImageGenerated, currentCanvasId, canvasName,
            uuid, addAbortController, removeAbortController,
            executingNodesRef, llmTaskCountersRef, rhTaskQueue,
            resolveInputs,
          };
          await executeDrawingBoardNode(dbCtx, batchCount);
        } finally {
          executingNodesRef.current.delete(nodeId);
        }
        return;
      }

      // Create abort controller for this execution
      const abortController = new AbortController();
      addAbortController(nodeId, abortController);
      const signal = abortController.signal;

      try {
          // 检查是否被中断
          if (signal.aborted) return;

          // 统一设置 running 状态，确保所有节点类型显示 spinner

          // Resolve all inputs (recursive for edits/relays) - 向上追溯
          const inputs = resolveInputs(nodeId);

          // ====== 逐行分发：上游有多行文字 → 每行触发一次下游执行 ======
          const batchTypes = ['bp', 'remove-bg', 'upscale', 'video'];
          if (batchTypes.includes(node.type)) {
              const upstreamText = inputs.texts.join('\n').trim();
              const lines = upstreamText.split('\n').map(l => l.trim()).filter(l => l);
              const downstreamConns = connectionsRef.current.filter(c => c.fromNode === nodeId);

              if (lines.length > 1 && downstreamConns.length > 0) {
                  console.log(`[逐行分发] ${node.type} 收到 ${lines.length} 行，开始逐行执行`);

                  for (let i = 0; i < lines.length; i++) {
                      if (signal.aborted) return;
                      const line = lines[i];
                      updateNode(nodeId, {
                          data: { ...node.data, output: line, lineIndex: i + 1, cascadeProgress: `${i + 1}/${lines.length}` }
                      });
                      for (const conn of downstreamConns) {
                          if (signal.aborted) return;
                          await handleExecuteNode(conn.toNode, 1);
                      }
                  }

                  updateNode(nodeId, { status: 'completed', data: { ...node.data, error: undefined } });
                  saveCurrentCanvas();
                  return;
              }
          }
          // ====== 逐行分发 END ======

          // Build executor context for all node types below
          const ctx: ExecutorContext = {
            node, nodeId, signal, inputs,
            nodesRef, connectionsRef,
            updateNode, setNodes, setConnections, setHasUnsavedChanges,
            getOrCreateOutputNode, resolveOutputPending,
            handleExecuteNode, saveCurrentCanvas,
            onImageGenerated, currentCanvasId, canvasName,
            uuid, addAbortController, removeAbortController,
            executingNodesRef, llmTaskCountersRef, rhTaskQueue,
            resolveInputs,
          };

          if (node.type === 'image' || node.type === 'idea') {
          await executeImageNode(ctx);
        }
else if (node.type === "edit") {
          await executeEditNode(ctx);
        }
else if (node.type === 'video') {
          await executeVideoNode(ctx);
        }
else if (node.type === "remove-bg") {
          await executeRemoveBgNode(ctx);
        }
else if (node.type === 'upscale') {
          await executeUpscaleNode(ctx);
        }
else if (node.type === "bp") {
          await executeBPNode(ctx);
        }
else if (node.type === 'llm') {
          await executeLLMNode(ctx);
        }
else if (node.type === "prompt-line") {
          await executePromptLineNode(ctx);
        }
else if (node.type === 'show-text') {
          await executeShowTextNode(ctx);
        }
else if (node.type === "replace-text") {
          await executeReplaceTextNode(ctx);
        }
else if (node.type === 'text') {
          await executeTextNode(ctx);
        }
else if (node.type === 'rh-config' || node.type === 'runninghub') {
              await executeRunningHubConfigNode(ctx, batchCount);
            }
          // ============ rh-main 节点执行（从关联的 rh-param 节点收集参数） ============
          else if (node.type === 'rh-main') {
              await executeRHMainNode(ctx, batchCount);
            }

      } catch (e) {
          if ((e as Error).name !== 'AbortError') {
              console.error('[执行异常]', nodeId.slice(0,8), e);
          }
      } finally {
          removeAbortController(nodeId, abortController);
      }
  };
  
  // 将 handleExecuteNode 赋值给 ref，供 recoverVideoTasks 使用
  useEffect(() => {
      executeNodeRef.current = handleExecuteNode;
  }, []);

  // 级联执行：按拓扑序依次执行所有上游可执行节点 + 目标节点
  const runCascade = async (nodeId: string) => {
      const cascadeCtx: CascadeContext = {
        nodeId, nodesRef, connectionsRef, cascadeCacheRef, cascadeControllersRef, snapshotImagesRef,
        updateNode, handleExecuteNode,
      };
      await runCascadeImpl(cascadeCtx);
  };;

  // Function to cancel/stop a running node execution
  const handleStopNode = useCallback((nodeId: string) => {
      abortAllForNode(nodeId);
      updateNode(nodeId, { status: 'idle' });
      const cascadeController = cascadeControllersRef.current.get(nodeId);
      if (cascadeController) {
          cascadeController.abort();
          cascadeControllersRef.current.delete(nodeId);
      }
  }, [abortAllForNode, updateNode]);

  const handleDragOver = (e: React.DragEvent) => {
    console.log('[Canvas] DragOver triggered');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    console.log('[Canvas] Drop event, types:', Array.from(e.dataTransfer.types));
    
    // 尝试从 dataTransfer 获取
    let type = e.dataTransfer.getData('nodeType') as NodeType;
    console.log('[Canvas] nodeType from dataTransfer:', type);
    
    // 备用：从 text/plain 获取
    if (!type) {
      type = e.dataTransfer.getData('text/plain') as NodeType;
      console.log('[Canvas] nodeType from text/plain:', type);
    }
    
    // 备用：从全局状态获取
    if (!type && (window as any).__draggingNodeType) {
      type = (window as any).__draggingNodeType as NodeType;
      console.log('[Canvas] nodeType from window:', type);
      (window as any).__draggingNodeType = null;
    }
    
    // Calculate drop position relative to canvas
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / scale - 150; // Center node roughly
    const y = (e.clientY - rect.top - canvasOffset.y) / scale - 100;

    if (type && ['image', 'text', 'video', 'llm', 'idea', 'relay', 'edit', 'remove-bg', 'upscale', 'resize', 'bp', 'prompt-line', 'show-text', 'replace-text', 'output'].includes(type)) {
        console.log('[Drop] 创建节点:', type, '位置:', x, y);
        addNode(type, '', { x, y });
        return;
    }

    // 2. Handle File Drop (OS Files)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach((item, index) => {
            const file = item as File;
            const offsetX = x + (index * 20); // Stagger multiple files slightly
            const offsetY = y + (index * 20);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        addNode('image', ev.target.result as string, { x: offsetX, y: offsetY });
                    }
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                // 🆕 视频拖入：创建 video-output 节点直接展示视频
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    if (ev.target?.result) {
                        // 保存视频到 output 目录
                        const base64Data = ev.target.result as string;
                        try {
                            const { saveVideoToOutput } = await import('@/services/api/files');
                            const result = await saveVideoToOutput(base64Data, `video_${Date.now()}.mp4`);
                            if (result.success && result.data?.url) {
                                addNode('video-output', result.data.url, { x: offsetX, y: offsetY }, file.name);
                            } else {
                                // 保存失败，直接使用 base64
                                addNode('video-output', base64Data, { x: offsetX, y: offsetY }, file.name);
                            }
                        } catch (err) {
                            // 保存失败，直接使用 base64
                            addNode('video-output', base64Data, { x: offsetX, y: offsetY }, file.name);
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
  };

    // --- INTERACTION HANDLERS (extracted to hooks/) ---
  const {
    onMouseDownCanvas, onMouseMove, onMouseUpCanvas,
  } = useCanvasMouse({
    isSpacePressed, isPanMode, isDraggingCanvas,
    canvasOffset, scale, dragStart,
    selectedNodeIds, draggingNodeId, isDragOperation,
    selectionBox, linkingState,
    nodesRef,
    draggingNodeIdRef, isDragOperationRef,
    dragStartMousePosRef, dragDeltaRef, initialNodePositionsRef,
    lastMousePosRef, rafRef, containerRef,
    setCanvasOffset, setNodes, setHasUnsavedChanges, setIsDraggingCanvas, setDragStart,
    setSelectionBox, setSelectedNodeIds, setSelectedConnectionId,
    setDraggingNodeId, setIsDragOperation, setLinkingState,
    setDragTick,
  });

  const {
    handleNodeDragStart, handleStartConnection, handleEndConnection,
  } = useCanvasDrag({
    scale, canvasOffset,
    nodes, connections,
    selectedNodeIds, linkingState,
    nodesRef, connectionsRef,
    draggingNodeIdRef, isDragOperationRef,
    dragStartMousePosRef, dragDeltaRef, initialNodePositionsRef,
    canvasOffsetRef, scaleRef,
    containerRef,
    setConnections, setSelectedNodeIds,
    setDraggingNodeId, setIsDragOperation, setHasUnsavedChanges,
    setLinkingState, setDragStartMousePos, setInitialNodePositions,
    setSelectionBox,
    uuid, updateNode,
  });

  const {
    handleCreateToolNode, handleExtractFrame, handleCreateFrameExtractor,
    handleExtractFrameFromExtractor, onDragOver, handleDelete,
  } = useCanvasTool({
    nodes, connections,
    nodesRef, connectionsRef,
    canvasOffset, scale,
    selectedNodeIds, selectedConnectionId,
    currentCanvasId, canvasName,
    setNodes, setConnections,
    setSelectedNodeIds, setSelectedConnectionId,
    setHasUnsavedChanges,
    uuid, addNode, updateNode,
    onImageGenerated,
  });

  // Key handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (shouldIgnoreCanvasShortcut(e.target, document.activeElement)) {
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handleCopy();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handlePaste();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      setIsSpacePressed(true);
    }
  }, [handleDelete, handleCopy, handlePaste]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') setIsSpacePressed(false);
  }, []);

  // Global Key Listener - 只在画布活动时生效
  useEffect(() => {
      if (!isActive) return;

      // 监听自定义的 sidebar-drag-end 事件（鼠标模拟拖拽）
      const handleSidebarDragEnd = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          console.log('[Canvas] sidebar-drag-end received:', detail);

          const container = containerRef.current;
          if (!container) return;

          const rect = container.getBoundingClientRect();
          const x = (detail.x - rect.left - canvasOffset.x) / scale - 150;
          const y = (detail.y - rect.top - canvasOffset.y) / scale - 100;

          if (detail.type && ['image', 'text', 'video', 'llm', 'idea', 'relay', 'edit', 'remove-bg', 'upscale', 'resize', 'bp', 'runninghub', 'rh-config', 'drawing-board', 'prompt-line', 'show-text', 'replace-text', 'output'].includes(detail.type)) {
              console.log('[Canvas] 创建节点:', detail.type, '位置:', x, y);
              addNode(detail.type, '', { x, y });
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('sidebar-drag-end', handleSidebarDragEnd);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          window.removeEventListener('sidebar-drag-end', handleSidebarDragEnd);
      };
  }, [handleKeyDown, handleKeyUp, canvasOffset, scale, isActive]);

  // Theme toggle & preview handlers (wired to CanvasRenderer)
  const handleToggleTheme = useCallback(() => {
    setCanvasTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);
  const handleClosePreview = useCallback(() => setPreviewImage(null), []);
  const handlePreviewWheel = useCallback((e: React.WheelEvent) => {
    setPreviewScale(prev => Math.max(0.1, Math.min(5, prev - e.deltaY * 0.001)));
  }, []);
  const handlePreviewMouseDown = useCallback((_e: React.MouseEvent) => {
    // Preview drag tracking managed internally by preview UI
  }, []);
  const handlePreviewZoomIn = useCallback(() => setPreviewScale(prev => Math.min(5, prev * 1.25)), []);
  const handlePreviewZoomOut = useCallback(() => setPreviewScale(prev => Math.max(0.1, prev * 0.8)), []);
  const handlePreviewReset = useCallback(() => {
    setPreviewScale(1);
    setPreviewPos({ x: 0, y: 0 });
  }, []);
  const handleApplyCreativeIdea = useCallback((idea: CreativeIdea) => {
    addNode(idea.prompt ? 'llm' : 'text', idea.prompt || idea.title, { x: 200, y: 200 }, idea.title);
  }, [addNode]);
  const handleSavePreset = useCallback((title: string, desc: string, inputs: PresetInput[]) => {
    setUserPresets(prev => [...prev, {
      id: uuid(), title, description: desc, inputs,
      nodes: selectedNodeIds.size > 0 ? nodes.filter(n => selectedNodeIds.has(n.id)) : nodes,
      createdAt: Date.now(),
    } as CanvasPreset]);
    setShowPresetModal(false);
  }, [nodes, selectedNodeIds, uuid]);
  const handleConfirmPreset = useCallback((inputValues: Record<string, string>) => {
    if (!instantiatingPreset) return;
    const newNodes = instantiatingPreset.nodes.map(n => ({
      ...n, id: uuid(),
      content: Object.entries(inputValues).reduce((c, [k, v]) => c.replace('{' + k + '}', v), n.content || ''),
      x: n.x + 50, y: n.y + 50,
    } as CanvasNode));
    setNodes(prev => [...prev, ...newNodes]);
    setInstantiatingPreset(null);
    setHasUnsavedChanges(true);
  }, [instantiatingPreset, uuid]);
  const handleImageContextMenu = useCallback((action: string, imageUrl: string, _imageIndex: number, nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    if (action === 'addToDesktop') {
      onImageGenerated?.(imageUrl, node.title || '输出图片', currentCanvasId || undefined, canvasName);
    } else if (action === 'edit') {
      const fullUrl = imageUrl.startsWith('/files/') ? `http://localhost:8765${imageUrl}` : imageUrl;
      addNode('edit', fullUrl, { x: node.x + 400, y: node.y }, '编辑图片');
    }
  }, [onImageGenerated, currentCanvasId, canvasName, addNode]);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const contextOptions: { label: string; icon?: React.ReactNode; action: () => void; danger?: boolean }[] = [
    { label: '重置视图', action: handleResetView },
    { label: '保存画布', action: handleManualSave },
    ...(selectedNodeIds.size > 0 ? [
      {
        label: '创建预设',
        action: () => {
          setNodesForPreset(nodes.filter(node => selectedNodeIds.has(node.id)));
          setShowPresetModal(true);
        },
      },
      { label: '删除所选', action: handleDelete, danger: true },
    ] : []),
  ];

// --- FLOATING GENERATOR HANDLER ---
  const handleGenerate = async (type: NodeType, prompt: string, config: GenerationConfig, files?: File[]) => {
      await executeFloatingGenerate({
        type,
        prompt,
        config,
        files,
        addNode,
        updateNode,
        setIsGenerating,
        onImageGenerated,
        currentCanvasId,
        canvasName,
      });
  };

  const handleDownloadAndSaveVideo = useCallback((videoUrl: string, outNodeId: string, signal: AbortSignal) =>
    downloadAndSaveVideo(videoUrl, outNodeId, signal, {
      nodesRef, updateNode, saveCurrentCanvas,
      onImageGenerated, currentCanvasId, canvasName,
    } as ExecutorContext), [updateNode, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName]);

    // --- CONTEXT MENU + Callbacks + Viewport (extracted to hooks/useCanvasCallbacks.ts) ---
  const {
    handleNodeSelect, handleNodeContextMenu, handleNodeDelete,
    handleNodeDownload, handleNodeStartConnection, handleNodeRetryVideoDownload,
    handleNodePreviewImage, handleNodeClearImage, handleNodeImageContextMenu,
    visibleNodes, visibleConnections, viewport, edgeNumberMap,
    nodeRenderMetaById,
    edgeNumberMapRef, connectionsByFrom, connectionsByTo, nodeMap,
  } = useCanvasCallbacks({
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
    addAbortController, removeAbortController,
    handleStartConnection,
    computeCascadeOrder, resolveInputs, resolveEffectiveType,
    downloadAndSaveVideo: handleDownloadAndSaveVideo,
  } as CallbackDeps);

  return (
    <CanvasRenderer
      isLightCanvas={isLightCanvas}
      hasOpenedCanvas={hasOpenedCanvas}
      canvasList={canvasList}
      isCanvasLoading={isCanvasLoading}
      canvasName={canvasName}
      autoSaveEnabled={autoSaveEnabled}
      hasUnsavedChanges={hasUnsavedChanges}
      canvasTheme={canvasTheme}
      userPresets={userPresets}
      apiConfigured={apiConfigured}
      currentCanvasId={currentCanvasId}
      creativeIdeas={creativeIdeas}
      isPanMode={isPanMode}
      isSpacePressed={isSpacePressed}
      isDraggingCanvas={isDraggingCanvas}
      canvasOffset={canvasOffset}
      scale={scale}
      nodes={nodes}
      visibleNodes={visibleNodes}
      visibleConnections={visibleConnections}
      nodeMap={nodeMap}
      nodeRenderMetaById={nodeRenderMetaById}
      edgeNumberMapRef={edgeNumberMapRef}
      selectedNodeIds={selectedNodeIds}
      selectedConnectionId={selectedConnectionId}
      draggingNodeId={draggingNodeId}
      linkingState={linkingState}
      selectionBox={selectionBox}
      previewImage={previewImage}
      previewScale={previewScale}
      previewPos={previewPos}
      contextMenu={contextMenu}
      contextOptions={contextOptions}
      showPresetModal={showPresetModal}
      nodesForPreset={nodesForPreset}
      instantiatingPreset={instantiatingPreset}
      containerRef={containerRef}
      onSelectCanvas={(id) => loadCanvas(id)}
      onCreateCanvas={() => createNewCanvas()}
      onDeleteCanvas={deleteCanvasById}
      onAddNode={addNode}
      onAddPreset={(pid) => { const p = userPresets.find(pr => pr.id === pid); if (p) setInstantiatingPreset(p); }}
      onDeletePreset={(pid) => setUserPresets(prev => prev.filter(p => p.id !== pid))}
      onResetView={handleResetView}
      onOpenSettings={() => setShowApiSettings(true)}
      onCanvasOffsetChange={setCanvasOffset}
      onLoadCanvas={(id) => loadCanvas(id)}
      onRenameCanvas={(id, name) => renameCanvas(name)}
      onManualSave={handleManualSave}
      onToggleTheme={handleToggleTheme}
      onCreateRHPresetNode={createRHPresetNode}
      onApplyCreativeIdea={handleApplyCreativeIdea}
      onContextMenu={handleContextMenu}
      onMouseDownCanvas={onMouseDownCanvas}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUpCanvas}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      onTogglePanMode={() => { setIsPanMode(!isPanMode); setIsSpacePressed(false); }}
      onNodeSelect={handleNodeSelect}
      onNodeDragStart={handleNodeDragStart}
      onNodeContextMenu={handleNodeContextMenu}
      onNodeUpdate={(id, updates) => updateNode(id, updates)}
      onNodeDelete={handleNodeDelete}
      onNodeExecute={(id) => handleExecuteNode(id, 1)}
      onNodeStop={handleStopNode}
      onNodeDownload={handleNodeDownload}
      onNodeStartConnection={handleNodeStartConnection}
      onNodeEndConnection={handleEndConnection}
      onCreateToolNode={(id) => handleCreateToolNode(id, 'edit', { x: 0, y: 0 })}
      onExtractFrame={handleExtractFrame}
      onCreateFrameExtractor={handleCreateFrameExtractor}
      onExtractFrameFromExtractor={handleExtractFrameFromExtractor}
      onNodeRetryVideoDownload={handleNodeRetryVideoDownload}
      onNodePreviewImage={handleNodePreviewImage}
      onNodeClearImage={handleNodeClearImage}
      onNodeCascadeExecute={runCascade}
      onImageContextMenu={handleImageContextMenu}
      onSelectConnection={(id) => setSelectedConnectionId(id)}
      onCloseContextMenu={() => setContextMenu(null)}
      onClosePreview={handleClosePreview}
      onPreviewWheel={handlePreviewWheel}
      onPreviewMouseDown={handlePreviewMouseDown}
      onPreviewZoomIn={handlePreviewZoomIn}
      onPreviewZoomOut={handlePreviewZoomOut}
      onPreviewReset={handlePreviewReset}
      onClosePresetModal={() => setShowPresetModal(false)}
      onSavePreset={handleSavePreset}
      onCancelPresetInstantiation={() => setInstantiatingPreset(null)}
      onConfirmPreset={handleConfirmPreset}
    />
  );
};

export default PebblingCanvas;
