import React from 'react';
import { CanvasNode, Vec2, Connection, CanvasPreset, PresetInput } from '../../types/pebblingTypes';
import { CreativeIdea } from '../../types';
import type { CanvasListItem } from '../../services/api/canvas';
import CanvasSelector from './CanvasSelector';
import Sidebar from './Sidebar';
import CanvasNodeItem from './CanvasNode';
import CanvasNameBadge from './CanvasNameBadge';
import ContextMenu from './ContextMenu';
import PresetCreationModal from './PresetCreationModal';
import PresetInstantiationModal from './PresetInstantiationModal';
import { Icons } from './Icons';
import { getConnectionEndpoints, ConnectionEndpoints } from './connectionRouting';
import { CanvasNodeRenderMeta } from '../../hooks/useCanvasCallbacks';
import { pointOnCubicBezier } from './apiAdapters';
import CanvasMinimap from './CanvasMinimap';

export interface CanvasRendererProps {
  isLightCanvas: boolean; hasOpenedCanvas: boolean; canvasList: CanvasListItem[];
  isCanvasLoading: boolean; canvasName: string; autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean; canvasTheme: string; userPresets: CanvasPreset[];
  apiConfigured: boolean; currentCanvasId: string | null; creativeIdeas: CreativeIdea[];
  isPanMode: boolean; isSpacePressed: boolean; isDraggingCanvas: boolean;
  canvasOffset: Vec2; scale: number;
  nodes: CanvasNode[];
  visibleNodes: CanvasNode[]; visibleConnections: Connection[];
  nodeMap: Map<string, CanvasNode>;
  nodeRenderMetaById: Map<string, CanvasNodeRenderMeta>;
  edgeNumberMapRef: React.MutableRefObject<Map<string, { number: number; total: number }>>;
  selectedNodeIds: Set<string>; selectedConnectionId: string | null;
  draggingNodeId: string | null;
  linkingState: { active: boolean; fromNode: string | null; startPos: Vec2; currPos: Vec2 };
  selectionBox: { start: Vec2; current: Vec2 } | null;
  previewImage: string | null; previewScale: number; previewPos: Vec2;
  contextMenu: { x: number; y: number } | null;
  contextOptions: { label: string; icon?: React.ReactNode; action: () => void; danger?: boolean }[];
  showPresetModal: boolean; nodesForPreset: CanvasNode[];
  instantiatingPreset: CanvasPreset | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelectCanvas: (id: string) => void; onCreateCanvas: () => void; onDeleteCanvas: (id: string) => void;
  onAddNode: (type: string, content?: string, position?: Vec2, title?: string, data?: any) => CanvasNode;
  onAddPreset: (pid: string) => void; onDeletePreset: (pid: string) => void;
  onResetView: () => void; onOpenSettings: () => void;
  onCanvasOffsetChange: (offset: Vec2) => void;
  onLoadCanvas: (id: string) => void; onRenameCanvas: (id: string, name: string) => void;
  onManualSave: () => void; onToggleTheme: () => void; onCreateRHPresetNode: () => void;
  onApplyCreativeIdea: (idea: CreativeIdea) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMouseDownCanvas: (e: React.MouseEvent) => void; onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; onTogglePanMode: () => void;
  onNodeSelect: (id: string, multi?: boolean) => void; onNodeDragStart: (e: React.MouseEvent, id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent) => void;
  onNodeUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  onNodeDelete: (id: string) => void; onNodeExecute: (id: string) => void;
  onNodeStop: (id: string) => void; onNodeDownload: (id: string) => void;
  onNodeStartConnection: (nodeId: string, portType: 'in' | 'out', position: Vec2) => void;
  onNodeEndConnection: (nodeId: string, portKey?: string) => void;
  onCreateToolNode: (id: string) => void; onExtractFrame: (id: string, position: 'first' | 'last' | number) => void;
  onCreateFrameExtractor: (id: string) => void;
  onExtractFrameFromExtractor: (id: string, time: number) => void;
  onNodeRetryVideoDownload: (id: string) => void;
  onNodePreviewImage: (url: string) => void; onNodeClearImage: (id: string) => void;
  onNodeCascadeExecute: (id: string) => void;
  onImageContextMenu: (action: string, imageUrl: string, imageIndex: number, nodeId: string) => void;
  onSelectConnection: (id: string) => void; onCloseContextMenu: () => void;
  onClosePreview: () => void; onPreviewWheel: (e: React.WheelEvent) => void;
  onPreviewMouseDown: (e: React.MouseEvent) => void;
  onPreviewZoomIn: () => void; onPreviewZoomOut: () => void; onPreviewReset: () => void;
  onClosePresetModal: () => void; onSavePreset: (title: string, desc: string, inputs: PresetInput[]) => void;
  onCancelPresetInstantiation: () => void; onConfirmPreset: (inputValues: Record<string, string>) => void;
}

export default function CanvasRenderer(props: CanvasRendererProps) {
  const {
    isLightCanvas, hasOpenedCanvas, canvasList, isCanvasLoading, canvasName,
    autoSaveEnabled, hasUnsavedChanges, canvasTheme, userPresets, apiConfigured,
    currentCanvasId, creativeIdeas,
    isPanMode, isSpacePressed, isDraggingCanvas,
    canvasOffset, scale,
    nodes, visibleNodes, visibleConnections, nodeMap, nodeRenderMetaById, edgeNumberMapRef,
    selectedNodeIds, selectedConnectionId, draggingNodeId,
    linkingState, selectionBox,
    previewImage, previewScale, previewPos,
    contextMenu, contextOptions,
    showPresetModal, nodesForPreset, instantiatingPreset,
    containerRef,
    onSelectCanvas, onCreateCanvas, onDeleteCanvas,
    onAddNode, onAddPreset, onDeletePreset, onResetView, onOpenSettings,
    onCanvasOffsetChange,
    onLoadCanvas, onRenameCanvas, onManualSave, onToggleTheme,
    onCreateRHPresetNode, onApplyCreativeIdea,
    onContextMenu, onMouseDownCanvas, onMouseMove, onMouseUp,
    onDragOver, onDrop, onTogglePanMode,
    onNodeSelect, onNodeDragStart, onNodeContextMenu,
    onNodeUpdate, onNodeDelete, onNodeExecute, onNodeStop,
    onNodeDownload, onNodeStartConnection, onNodeEndConnection,
    onCreateToolNode, onExtractFrame, onCreateFrameExtractor,
    onExtractFrameFromExtractor, onNodeRetryVideoDownload,
    onNodePreviewImage, onNodeClearImage, onNodeCascadeExecute,
    onImageContextMenu, onSelectConnection,
    onCloseContextMenu,
    onClosePreview, onPreviewWheel, onPreviewMouseDown,
    onPreviewZoomIn, onPreviewZoomOut, onPreviewReset,
    onClosePresetModal, onSavePreset,
    onCancelPresetInstantiation, onConfirmPreset,
  } = props;

  return (
    <div
      className={`w-full h-full text-white overflow-hidden relative transition-colors duration-300 ${
        isLightCanvas ? 'bg-[#f5f5f7]' : 'bg-[#0a0a0f]'
      }`}
      style={{ color: isLightCanvas ? '#1d1d1f' : '#ffffff' }}
      onContextMenu={onContextMenu}
    >
      {!hasOpenedCanvas ? (
        <CanvasSelector canvasList={canvasList} isLightCanvas={isLightCanvas}
          onSelectCanvas={onSelectCanvas} onCreateCanvas={onCreateCanvas} onDeleteCanvas={onDeleteCanvas} />
      ) : (
        <>
      <Sidebar onDragStart={() => {}} onAdd={onAddNode}
          userPresets={userPresets} onAddPreset={onAddPreset} onDeletePreset={onDeletePreset}
          onHome={onResetView} onOpenSettings={onOpenSettings} isApiConfigured={apiConfigured}
          canvasList={canvasList} currentCanvasId={currentCanvasId} canvasName={canvasName}
          isCanvasLoading={isCanvasLoading} onCreateCanvas={onCreateCanvas}
          onLoadCanvas={onLoadCanvas} onDeleteCanvas={onDeleteCanvas}
          onRenameCanvas={(id, name) => onRenameCanvas(id, name)}
          creativeIdeas={creativeIdeas} onManualSave={onManualSave}
          autoSaveEnabled={autoSaveEnabled} hasUnsavedChanges={hasUnsavedChanges}
          canvasTheme={canvasTheme} onToggleTheme={onToggleTheme}
          onAddRHPreset={onCreateRHPresetNode} onApplyCreativeIdea={onApplyCreativeIdea} />
      <CanvasNameBadge canvasName={canvasName} isLoading={isCanvasLoading} hasUnsavedChanges={hasUnsavedChanges} />
      {/* Pan mode toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button onClick={onTogglePanMode}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isPanMode ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg' : 'bg-gray-700/50 hover:bg-gray-600/70 text-gray-300'}`}
          style={{ backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {isPanMode ? '平移中' : '平移'}
        </button>
        {isPanMode && <div className="px-2 py-1 rounded text-xs text-blue-300 bg-blue-900/30 backdrop-blur-sm"
          style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>左键拖拽移动画布</div>}
      </div>
      <div ref={containerRef}
        className={`w-full h-full relative ${(isSpacePressed || isPanMode) ? 'cursor-grab' : 'cursor-default'} ${isDraggingCanvas ? '!cursor-grabbing' : ''}`}
        onMouseDown={onMouseDownCanvas} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onDragOver={onDragOver} onDrop={onDrop}>
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isLightCanvas ? 'opacity-30' : 'opacity-20'}`}
          style={{ backgroundImage: `radial-gradient(circle, ${isLightCanvas ? '#c0c0c0' : '#444'} 1px, transparent 1px)`, backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px` }} />
        <div style={{ transform: `translate3d(${canvasOffset.x}px, ${canvasOffset.y}px, 0) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%', willChange: 'transform', backfaceVisibility: 'hidden', pointerEvents: 'none' } as React.CSSProperties}
          className="absolute top-0 left-0">
          <CanvasSvgLayer visibleConnections={visibleConnections} nodeMap={nodeMap}
            isLightCanvas={isLightCanvas} selectedConnectionId={selectedConnectionId}
            edgeNumberMapRef={edgeNumberMapRef} linkingState={linkingState}
            onSelectConnection={onSelectConnection} />
          {visibleNodes.map(node => {
            const meta = nodeRenderMetaById.get(node.id);
            return (
            <CanvasNodeItem key={node.id} node={node}
              isSelected={selectedNodeIds.has(node.id)} isLightCanvas={isLightCanvas} scale={scale}
              effectiveColor={meta?.effectiveColor}
              hasDownstream={meta?.hasDownstream || false}
              incomingConnections={meta?.incomingConnections || []}
              cascadeCount={meta?.cascadeCount || 0} isCascadeTerminal={meta?.isCascadeTerminal || false}
              autoResolvedContent={meta?.autoResolvedContent}
              onCascadeExecute={onNodeCascadeExecute} onSelect={onNodeSelect}
              onDragStart={onNodeDragStart} isDragging={!!draggingNodeId && selectedNodeIds.has(node.id)}
              onContextMenu={onNodeContextMenu} onUpdate={onNodeUpdate} onDelete={onNodeDelete}
              onExecute={onNodeExecute} onStop={onNodeStop} onDownload={onNodeDownload}
              onStartConnection={onNodeStartConnection} onEndConnection={onNodeEndConnection}
              onCreateToolNode={onCreateToolNode} onExtractFrame={onExtractFrame}
              onCreateFrameExtractor={onCreateFrameExtractor}
              onExtractFrameFromExtractor={onExtractFrameFromExtractor}
              onRetryVideoDownload={onNodeRetryVideoDownload}
              onPreviewImage={onNodePreviewImage} onClearImage={onNodeClearImage}
              onImageContextMenu={onImageContextMenu} />
          );})}
        </div>
        {selectionBox && <div className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
          style={{ left: Math.min(selectionBox.start.x, selectionBox.current.x), top: Math.min(selectionBox.start.y, selectionBox.current.y), width: Math.abs(selectionBox.current.x - selectionBox.start.x), height: Math.abs(selectionBox.current.y - selectionBox.start.y) }} />}
      </div>
      <CanvasMinimap
        nodes={nodes}
        canvasOffset={canvasOffset}
        scale={scale}
        containerRef={containerRef}
        isLightCanvas={isLightCanvas}
        onOffsetChange={onCanvasOffsetChange}
      />
      {previewImage && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-hidden" onClick={onClosePreview}>
        <img src={previewImage} alt="预览" className="rounded-xl shadow-2xl cursor-grab active:cursor-grabbing select-none"
          style={{ transform: `translate(${previewPos.x}px, ${previewPos.y}px) scale(${previewScale})`, maxWidth: previewScale === 1 ? '90vw' : 'none', maxHeight: previewScale === 1 ? '90vh' : 'none', transition: previewScale === 1 ? 'transform 0.2s ease-out' : 'none' }}
          draggable={false} onClick={e => e.stopPropagation()} onWheel={onPreviewWheel} onMouseDown={onPreviewMouseDown} />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm select-none">
          <button className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-lg leading-none" onClick={onPreviewZoomOut}>-</button>
          <span className="w-12 text-center text-xs font-medium">{Math.round(previewScale * 100)}%</span>
          <button className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-lg leading-none" onClick={onPreviewZoomIn}>+</button>
          <div className="w-px h-5 bg-white/20 mx-1" /><button className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xs" onClick={onPreviewReset} title="重置">↺</button>
        </div>
        <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors" onClick={onClosePreview}>✕</button>
      </div>}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={onCloseContextMenu} options={contextOptions} />}
      {showPresetModal && <PresetCreationModal selectedNodes={nodesForPreset} onCancel={onClosePresetModal} onSave={onSavePreset} />}
      {instantiatingPreset && <PresetInstantiationModal preset={instantiatingPreset} onCancel={onCancelPresetInstantiation} onConfirm={onConfirmPreset} />}
      </>)}
    </div>
  );
}

// ── Sub-component: SVG Connection Layer ──

function CanvasSvgLayer({ visibleConnections, nodeMap, isLightCanvas, selectedConnectionId, edgeNumberMapRef, linkingState, onSelectConnection }: {
  visibleConnections: Connection[]; nodeMap: Map<string, CanvasNode>; isLightCanvas: boolean;
  selectedConnectionId: string | null;
  edgeNumberMapRef: React.MutableRefObject<Map<string, { number: number; total: number }>>;
  linkingState: { active: boolean; fromNode: string | null; startPos: Vec2; currPos: Vec2 };
  onSelectConnection: (id: string) => void;
}) {
  return (
    <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
      <defs>
        <filter id="glow-white" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="grad-mono-dark" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#666" stopOpacity="0.4"/><stop offset="30%" stopColor="#fff" stopOpacity="0.9"/><stop offset="70%" stopColor="#fff" stopOpacity="0.9"/><stop offset="100%" stopColor="#666" stopOpacity="0.4"/></linearGradient>
        <linearGradient id="grad-mono-light" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#999" stopOpacity="0.4"/><stop offset="30%" stopColor="#333" stopOpacity="0.9"/><stop offset="70%" stopColor="#333" stopOpacity="0.9"/><stop offset="100%" stopColor="#999" stopOpacity="0.4"/></linearGradient>
        <linearGradient id="grad-selected" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#888" stopOpacity="0.5"/><stop offset="50%" stopColor="#fff" stopOpacity="1"/><stop offset="100%" stopColor="#888" stopOpacity="0.5"/></linearGradient>
        <filter id="glow-dark" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {visibleConnections.map(conn => {
        const from = nodeMap.get(conn.fromNode); const to = nodeMap.get(conn.toNode);
        if (!from || !to) return null;
        const ep = getConnectionEndpoints(from, to, conn, isLightCanvas);
        const isSel = conn.id === selectedConnectionId;
        const glowFilter = ep.isImageToImagePort ? 'url(#glow-green)' : (isLightCanvas ? 'url(#glow-dark)' : 'url(#glow-white)');
        const glowColor = isSel ? (ep.isImageToImagePort ? 'rgba(16,185,129,0.6)' : (isLightCanvas ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)')) : ep.lineColor.glow;
        const dotFill = ep.isImageToImagePort ? '#34d399' : (isLightCanvas ? '#1d1d1f' : '#ffffff');
        return (
          <g key={conn.id} onClick={() => onSelectConnection(conn.id)} className="pointer-events-auto cursor-pointer group">
            <path d={ep.pathD} stroke="transparent" strokeWidth="20" fill="none" />
            <path d={ep.pathD} stroke={glowColor} strokeWidth={isSel ? 8 : 5} fill="none" filter={glowFilter} strokeLinecap="round" />
            <path d={ep.pathD} stroke={isSel ? ep.lineColor.selected : ep.lineColor.main} strokeWidth={isSel ? 3 : 2} fill="none" strokeLinecap="round" />
            <circle cx={ep.startX} cy={ep.startY} r={isSel ? 5 : 4} fill={dotFill} filter={glowFilter} />
            <circle cx={ep.endX} cy={ep.endY} r={isSel ? 5 : 4} fill={dotFill} filter={glowFilter} />
            {edgeNumberMapRef.current.has(conn.id) && (() => {
              const info = edgeNumberMapRef.current.get(conn.id)!;
              const bp = pointOnCubicBezier(0.80, ep.startX, ep.startY, ep.ctrl1X, ep.ctrl1Y, ep.ctrl2X, ep.ctrl2Y, ep.endX, ep.endY);
              const isDark = !isLightCanvas;
              return (<g className="pointer-events-none"><circle cx={bp.x} cy={bp.y} r={9} fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'} stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} strokeWidth="1" /><text x={bp.x} y={bp.y} textAnchor="middle" dominantBaseline="central" fill={isDark ? '#1d1d1f' : '#ffffff'} fontSize="10" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" style={{ userSelect: 'none' }}>{info.number}</text></g>);
            })()}
          </g>);
      })}
      {linkingState.active && linkingState.fromNode && (() => {
        const fromNode = nodeMap.get(linkingState.fromNode);
        if (!fromNode) return null;
        const sx = fromNode.x + fromNode.width; const sy = fromNode.y + fromNode.height / 2;
        const ex = linkingState.currPos.x; const ey = linkingState.currPos.y;
        const dx = ex - sx; const dy = ey - sy; const dist = Math.abs(dx); const vDist = Math.abs(dy); const minOff = 50;
        let c1x: number, c1y: number, c2x: number, c2y: number;
        if (dx >= 0) { const off = Math.min(Math.max(dist / 3, minOff), dist / 2 + 20); c1x = sx + off; c1y = sy; c2x = ex - off; c2y = ey; if (dist < 100) { c1x = sx + dist / 2; c2x = sx + dist / 2; } }
        else { const off = Math.max(dist / 2, minOff * 1.5); c1x = sx + off; c1y = sy + (vDist > 50 ? 0 : (ey > sy ? 50 : -50)); c2x = ex - off; c2y = ey + (vDist > 50 ? 0 : (ey > sy ? -50 : 50)); }
        const pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
        const glowF = isLightCanvas ? 'url(#glow-dark)' : 'url(#glow-white)';
        return (<><path d={pathD} stroke={isLightCanvas ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'} strokeWidth="4" fill="none" filter={glowF} strokeLinecap="round" /><path d={pathD} stroke={isLightCanvas ? 'url(#grad-mono-light)' : 'url(#grad-mono-dark)'} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="6,4" /><circle cx={sx} cy={sy} r="3" fill={isLightCanvas ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'} filter={glowF} /><circle cx={ex} cy={ey} r="3" fill={isLightCanvas ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'} filter={glowF} /></>);
      })()}
    </svg>
  );
}
