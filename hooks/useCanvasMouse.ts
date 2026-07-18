import React, { useRef } from 'react';
import { CanvasNode } from '../types/pebblingTypes';
import { applyDragDeltaToNodes, getDragSessionNodeIds, getDragSessionPosition, hasDragDelta } from './canvasDragSession';

interface CanvasMouseDeps {
  isSpacePressed: boolean; isPanMode: boolean; isDraggingCanvas: boolean;
  canvasOffset: { x: number; y: number }; scale: number; dragStart: { x: number; y: number };
  selectedNodeIds: Set<string>; draggingNodeId: string | null; isDragOperation: boolean;
  selectionBox: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
  linkingState: { active: boolean; fromNode: string | null; startPos: { x: number; y: number }; currPos: { x: number; y: number } };
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  draggingNodeIdRef: React.MutableRefObject<string | null>;
  isDragOperationRef: React.MutableRefObject<boolean>;
  dragStartMousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  dragDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
  initialNodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  lastMousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  rafRef: React.MutableRefObject<number | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDraggingCanvas: React.Dispatch<React.SetStateAction<boolean>>;
  setDragStart: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setDraggingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDragOperation: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkingState: React.Dispatch<React.SetStateAction<{ active: boolean; fromNode: string | null; startPos: { x: number; y: number }; currPos: { x: number; y: number } }>>;
  setDragTick: React.Dispatch<React.SetStateAction<number>>;
}

export function useCanvasMouse(deps: CanvasMouseDeps) {
  const { isSpacePressed, isPanMode, isDraggingCanvas, canvasOffset, scale, dragStart, selectedNodeIds, draggingNodeId, isDragOperation, selectionBox, linkingState, nodesRef, draggingNodeIdRef, isDragOperationRef, dragStartMousePosRef, dragDeltaRef, initialNodePositionsRef, lastMousePosRef, rafRef, containerRef, setCanvasOffset, setNodes, setHasUnsavedChanges, setIsDraggingCanvas, setDragStart, setSelectionBox, setSelectedNodeIds, setSelectedConnectionId, setDraggingNodeId, setIsDragOperation, setLinkingState, setDragTick } = deps;
  const dragFrameCountRef = useRef(0);

  const onMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 0) {
      if (e.ctrlKey || e.metaKey) {
        setSelectionBox({ start: { x: e.clientX, y: e.clientY }, current: { x: e.clientX, y: e.clientY } });
      } else if (isSpacePressed || isPanMode) {
        setIsDraggingCanvas(true);
        setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      } else {
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
      }
    } else if (e.button === 1) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const clientX = e.clientX; const clientY = e.clientY;
    if (isDraggingCanvas) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setCanvasOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
      });
      return;
    }
    const activeDraggingNodeId = draggingNodeIdRef.current || draggingNodeId;
    const isActiveDragOperation = isDragOperationRef.current || isDragOperation;
    if (activeDraggingNodeId && isActiveDragOperation) {
      if (isSpacePressed) {
        const mouseDeltaX = clientX - lastMousePosRef.current.x;
        const mouseDeltaY = clientY - lastMousePosRef.current.y;
        if (lastMousePosRef.current.x !== 0 || lastMousePosRef.current.y !== 0) {
          setCanvasOffset(prev => ({ x: prev.x + mouseDeltaX, y: prev.y + mouseDeltaY }));
          dragStartMousePosRef.current = { x: dragStartMousePosRef.current.x + mouseDeltaX, y: dragStartMousePosRef.current.y + mouseDeltaY };
        }
        lastMousePosRef.current = { x: clientX, y: clientY };
      } else { lastMousePosRef.current = { x: 0, y: 0 }; }
      const deltaX = (clientX - dragStartMousePosRef.current.x) / scale;
      const deltaY = (clientY - dragStartMousePosRef.current.y) / scale;
      dragDeltaRef.current = { x: deltaX, y: deltaY };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const delta = dragDeltaRef.current;
        const container = containerRef.current;
        if (!container) return;
        const draggedNodeIds = getDragSessionNodeIds(initialNodePositionsRef.current, selectedNodeIds);
        draggedNodeIds.forEach(id => {
          const el = container.querySelector(`[data-node-id="${id}"]`) as HTMLDivElement | null;
          const initialPos = initialNodePositionsRef.current.get(id);
          if (!el || !initialPos) return;

          const nextPosition = getDragSessionPosition(initialPos, delta);
          el.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
        });
        nodesRef.current = applyDragDeltaToNodes(nodesRef.current, initialNodePositionsRef.current, delta);
        dragFrameCountRef.current += 1;
        if (dragFrameCountRef.current % 2 === 0) {
          setDragTick(t => t + 1);
        }
      });
      return;
    }
    if (selectionBox) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setSelectionBox(prev => prev ? { ...prev, current: { x: clientX, y: clientY } } : null);
      });
      return;
    }
    if (linkingState.active) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const newPos = { x: (clientX - rect.left - canvasOffset.x) / scale, y: (clientY - rect.top - canvasOffset.y) / scale };
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => { setLinkingState(prev => ({ ...prev, currPos: newPos })); });
      }
    }
  };

  const onMouseUpCanvas = (e: React.MouseEvent) => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const wasDragging = (isDragOperationRef.current || isDragOperation) && (draggingNodeIdRef.current || draggingNodeId);
    setIsDraggingCanvas(false);
    draggingNodeIdRef.current = null;
    isDragOperationRef.current = false;
    setDraggingNodeId(null);
    setIsDragOperation(false);
    setLinkingState(prev => ({ ...prev, active: false, fromNode: null }));
    if (wasDragging) {
      dragFrameCountRef.current = 0;
      const latestDelta = dragDeltaRef.current;
      if (hasDragDelta(latestDelta)) {
        const updatedNodes = applyDragDeltaToNodes(nodesRef.current, initialNodePositionsRef.current, latestDelta, 20);
        // Update nodesRef directly for immediate use
        nodesRef.current = updatedNodes;
        setNodes(updatedNodes);
        setHasUnsavedChanges(true);
        setDragTick(t => t + 1);
      }
      initialNodePositionsRef.current = new Map();
      dragDeltaRef.current = { x: 0, y: 0 };
    }
    setSelectionBox(null);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(5, Math.max(0.1, scale * zoomFactor));
    const scaleChange = newScale / scale;
    setCanvasOffset({ x: mouseX - scaleChange * (mouseX - canvasOffset.x), y: mouseY - scaleChange * (mouseY - canvasOffset.y) });
    // setScale is managed by the component via a separate mechanism
    // We rely on the component to pass updated scale
  };

  return { onMouseDownCanvas, onMouseMove, onMouseUpCanvas, onWheel };
}
