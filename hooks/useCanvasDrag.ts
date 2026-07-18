import React, { useCallback, useEffect, useRef } from 'react';
import { CanvasNode, NodeType, Connection, Vec2 } from '../types/pebblingTypes';

interface CanvasDragDeps {
  scale: number; canvasOffset: { x: number; y: number };
  nodes: CanvasNode[]; connections: Connection[];
  selectedNodeIds: Set<string>; linkingState: { active: boolean; fromNode: string | null; startPos: Vec2; currPos: Vec2 };
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  draggingNodeIdRef: React.MutableRefObject<string | null>;
  isDragOperationRef: React.MutableRefObject<boolean>;
  dragStartMousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  dragDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
  initialNodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  canvasOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  scaleRef: React.MutableRefObject<number>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDraggingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDragOperation: React.Dispatch<React.SetStateAction<boolean>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkingState: React.Dispatch<React.SetStateAction<{ active: boolean; fromNode: string | null; startPos: Vec2; currPos: Vec2 }>>;
  setDragStartMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setInitialNodePositions: React.Dispatch<React.SetStateAction<Map<string, { x: number; y: number }>>>;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: Vec2; current: Vec2 } | null>>;
  uuid: () => string;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
}

export function useCanvasDrag(deps: CanvasDragDeps) {
  const { selectedNodeIds, linkingState, nodesRef, connectionsRef, draggingNodeIdRef, isDragOperationRef, dragStartMousePosRef, dragDeltaRef, initialNodePositionsRef, canvasOffsetRef, scaleRef, setConnections, setSelectedNodeIds, setDraggingNodeId, setIsDragOperation, setHasUnsavedChanges, setLinkingState, setDragStartMousePos, setInitialNodePositions, uuid, updateNode } = deps;

  const selectedNodeIdsRef = useRef(selectedNodeIds);
  const linkingStateRef = useRef(linkingState);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    linkingStateRef.current = linkingState;
  }, [linkingState]);

  const handleNodeDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const newSelection = new Set(selectedNodeIdsRef.current);
    if (!newSelection.has(id)) {
      if (!e.shiftKey) newSelection.clear();
      newSelection.add(id);
      setSelectedNodeIds(newSelection);
      selectedNodeIdsRef.current = newSelection;
    }
    draggingNodeIdRef.current = id;
    isDragOperationRef.current = true;
    setDraggingNodeId(id);
    setIsDragOperation(true);
    setDragStartMousePos({ x: e.clientX, y: e.clientY });
    dragStartMousePosRef.current = { x: e.clientX, y: e.clientY };
    dragDeltaRef.current = { x: 0, y: 0 };
    const positions = new Map<string, Vec2>();
    nodesRef.current.forEach(n => { if (newSelection.has(n.id)) positions.set(n.id, { x: n.x, y: n.y }); });
    setInitialNodePositions(positions);
    initialNodePositionsRef.current = positions;
  }, [dragDeltaRef, dragStartMousePosRef, draggingNodeIdRef, initialNodePositionsRef, isDragOperationRef, nodesRef, setDragStartMousePos, setDraggingNodeId, setInitialNodePositions, setIsDragOperation, setSelectedNodeIds]);

  const handleStartConnection = useCallback((nodeId: string, portType: 'in' | 'out', pos: Vec2) => {
    if (portType === 'out') {
      const off = canvasOffsetRef.current;
      const s = scaleRef.current;
      setLinkingState({ active: true, fromNode: nodeId, startPos: pos, currPos: { x: (pos.x - off.x) / s, y: (pos.y - off.y) / s } });
    }
  }, []);

  const handleEndConnection = useCallback(async (targetNodeId: string, portKey?: string) => {
    const currentLinkingState = linkingStateRef.current;
    if (currentLinkingState.active && currentLinkingState.fromNode && currentLinkingState.fromNode !== targetNodeId) {
      const sourceNodeId = currentLinkingState.fromNode;
      const currentNodes = nodesRef.current;
      const currentConnections = connectionsRef.current;
      const targetNode = currentNodes.find(n => n.id === targetNodeId);
      const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
      if (targetNode?.type === 'rh-config' && portKey && sourceNode) {
        const hasImageContent = sourceNode.content && (sourceNode.content.startsWith('data:image') || sourceNode.content.startsWith('http') || sourceNode.content.startsWith('/files/'));
        const isTextNode = sourceNode.type === 'text' || sourceNode.type === 'idea' || sourceNode.type === 'llm';
        if (portKey === 'cover' && hasImageContent) {
          let displayUrl = sourceNode.content;
          if (displayUrl.startsWith('/files/')) displayUrl = `http://localhost:8765${displayUrl}`;
          updateNode(targetNodeId, { data: { ...targetNode.data, coverUrl: displayUrl } });
        } else if (isTextNode && sourceNode.content) {
          const nodeInputs = targetNode.data?.nodeInputs || {};
          updateNode(targetNodeId, { data: { ...targetNode.data, nodeInputs: { ...nodeInputs, [portKey]: sourceNode.content } } });
        }
      }
      const exists = currentConnections.some(c => c.fromNode === sourceNodeId && c.toNode === targetNodeId && c.toPortKey === portKey);
      if (!exists) {
        let toPortOffsetY: number | undefined;
        if (portKey && targetNode?.type === 'rh-config') toPortOffsetY = currentLinkingState.currPos.y - targetNode.y;
        const newConnection = { id: uuid(), fromNode: sourceNodeId, toNode: targetNodeId, toPortKey: portKey, toPortOffsetY };
        connectionsRef.current = [...connectionsRef.current, newConnection];
        setConnections(prev => [...prev, newConnection]);
        setHasUnsavedChanges(true);
      }
      const inactiveState = { active: false, fromNode: null, startPos: { x: 0, y: 0 }, currPos: { x: 0, y: 0 } };
      linkingStateRef.current = inactiveState;
      setLinkingState(inactiveState);
    }
  }, [connectionsRef, linkingStateRef, nodesRef, setConnections, setHasUnsavedChanges, setLinkingState, updateNode, uuid]);

  return { handleNodeDragStart, handleStartConnection, handleEndConnection };
}
