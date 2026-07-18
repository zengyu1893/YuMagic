import React, { useCallback } from 'react';
import { CanvasNode, NodeType, Connection } from '../types/pebblingTypes';
import { saveToOutput } from '../services/api/files';

interface CanvasToolDeps {
  nodes: CanvasNode[]; connections: Connection[];
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  canvasOffset: { x: number; y: number }; scale: number;
  selectedNodeIds: Set<string>; selectedConnectionId: string | null;
  currentCanvasId: string | null; canvasName: string;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  uuid: () => string;
  addNode: (type: NodeType, content?: string, position?: { x: number; y: number }, title?: string, data?: any) => CanvasNode;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  onImageGenerated?: (url: string, prompt: string, canvasId?: string, canvasName?: string) => void;
}

export function useCanvasTool(deps: CanvasToolDeps) {
  const { nodes, connections, nodesRef, connectionsRef, canvasOffset, scale, selectedNodeIds, selectedConnectionId, currentCanvasId, canvasName, setNodes, setConnections, setSelectedNodeIds, setSelectedConnectionId, setHasUnsavedChanges, uuid, addNode, updateNode, onImageGenerated } = deps;

  const handleCreateToolNode = (sourceNodeId: string, toolType: NodeType, position: { x: number; y: number }) => {
    let presetData: any = {};
    if (toolType === 'edit') presetData = { prompt: 'Extend the image naturally, maintaining style and coherence' };
    const newNode = addNode(toolType, '', position, undefined, presetData);
    setConnections(prev => [...prev, { id: uuid(), fromNode: sourceNodeId, toNode: newNode.id }]);
    setHasUnsavedChanges(true);
  };

  const handleExtractFrame = async (nodeId: string, position: 'first' | 'last' | number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node?.content) return;
    try {
      const video = document.createElement('video'); video.crossOrigin = 'anonymous';
      let videoUrl = node.content;
      if (videoUrl.startsWith('/files/')) videoUrl = `http://localhost:8765${videoUrl}`;
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('视频加载失败')); video.src = videoUrl; video.load(); });
      let targetTime: number;
      if (position === 'first') targetTime = 0;
      else if (position === 'last') targetTime = Math.max(0, video.duration - 0.1);
      else targetTime = Math.min(Math.max(0, position), video.duration - 0.1);
      await new Promise<void>(resolve => { video.onseeked = () => resolve(); video.currentTime = targetTime; });
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('无法创建 canvas context');
      ctx.drawImage(video, 0, 0);
      const frameDataUrl = canvas.toDataURL('image/png');
      const result = await saveToOutput(frameDataUrl, `frame_${Date.now()}.png`);
      if (!result.success || !result.data) throw new Error(result.error || '保存帧失败');
      const savedPath = result.data.url;
      if (onImageGenerated) {
        const frameLabel = position === 'first' ? '首帧' : position === 'last' ? '尾帧' : `${position}s帧`;
        onImageGenerated(savedPath, `视频${frameLabel}`, currentCanvasId || undefined, canvasName);
      }
      const sourceNode = nodes.find(n => n.id === nodeId);
      const newNode = addNode('image', savedPath, { x: (sourceNode?.x || 0) + (sourceNode?.width || 300) + 50, y: sourceNode?.y || 0 });
      setConnections(prev => [...prev, { id: uuid(), fromNode: nodeId, toNode: newNode.id }]);
      setHasUnsavedChanges(true);
    } catch (error) { console.error('[FrameExtractor] 提取帧失败:', error); }
  };

  const handleCreateFrameExtractor = (sourceVideoNodeId: string) => {
    const sourceNode = nodes.find(n => n.id === sourceVideoNodeId);
    if (!sourceNode?.content) return;
    const newNode = addNode('frame-extractor', sourceNode.content, { x: sourceNode.x + sourceNode.width + 50, y: sourceNode.y }, '帧提取器', { sourceVideoUrl: sourceNode.content, currentFrameTime: 0 });
    setConnections(prev => [...prev, { id: uuid(), fromNode: sourceVideoNodeId, toNode: newNode.id }]);
    setHasUnsavedChanges(true);
  };

  const handleExtractFrameFromExtractor = async (nodeId: string, time: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const videoUrl = node.data?.sourceVideoUrl || node.content;
    if (!videoUrl) return;
    try {
      const video = document.createElement('video'); video.crossOrigin = 'anonymous';
      let url = videoUrl; if (url.startsWith('/files/')) url = `http://localhost:8765${url}`;
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('视频加载失败')); video.src = url; video.load(); });
      const targetTime = Math.min(Math.max(0, time), video.duration - 0.1);
      await new Promise<void>(resolve => { video.onseeked = () => resolve(); video.currentTime = targetTime; });
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('无法创建 canvas context');
      ctx.drawImage(video, 0, 0);
      const frameDataUrl = canvas.toDataURL('image/png');
      const result = await saveToOutput(frameDataUrl, `frame_${Date.now()}.png`);
      if (!result.success || !result.data) throw new Error(result.error || '保存帧失败');
      updateNode(nodeId, { content: frameDataUrl, data: { ...node.data, currentFrameTime: time, extractedFrame: result.data.url } });
    } catch (error) { console.error('[FrameExtractor] 提取帧失败:', error); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / scale;
    const y = (e.clientY - rect.top - canvasOffset.y) / scale;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const isVideo = file.type.startsWith('video/');
          addNode(isVideo ? 'video' : 'image', dataUrl, { x: x + i * 20, y: y + i * 20 }, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDelete = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const idsToDelete = new Set(selectedNodeIds);
      setNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
      setConnections(prev => prev.filter(c => !idsToDelete.has(c.fromNode) && !idsToDelete.has(c.toNode)));
      connectionsRef.current = connectionsRef.current.filter(c => !idsToDelete.has(c.fromNode) && !idsToDelete.has(c.toNode));
      setSelectedNodeIds(new Set());
      setHasUnsavedChanges(true);
    }
    if (selectedConnectionId) {
      connectionsRef.current = connectionsRef.current.filter(c => c.id !== selectedConnectionId);
      setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
      setSelectedConnectionId(null);
      setHasUnsavedChanges(true);
    }
  }, [selectedNodeIds, selectedConnectionId]);

  return { handleCreateToolNode, handleExtractFrame, handleCreateFrameExtractor, handleExtractFrameFromExtractor, handleDrop, onDragOver, handleDelete };
}
