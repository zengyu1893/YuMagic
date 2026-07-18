import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasNode, Vec2, getNodeTypeColor } from '../../types/pebblingTypes';
import {
  createMinimapLayout,
  getViewportWorldRect,
  minimapPointToViewportOffset,
  minimapPointToWorld,
  rectToMinimap,
  worldToMinimap,
} from './minimapUtils';

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MIN_NODE_MARK_SIZE = 4;

type CanvasMinimapProps = {
  nodes: CanvasNode[];
  canvasOffset: Vec2;
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLightCanvas: boolean;
  onOffsetChange: (offset: Vec2) => void;
};

type DragState = {
  pointerId: number;
  startPoint: Vec2;
  startOffset: Vec2;
};

export default function CanvasMinimap({
  nodes,
  canvasOffset,
  scale: canvasScale,
  containerRef,
  isLightCanvas,
  onOffsetChange,
}: CanvasMinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize(prev => {
        if (prev.width === rect.width && prev.height === rect.height) return prev;
        return { width: rect.width, height: rect.height };
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const viewportWorldRect = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return null;

    return getViewportWorldRect(
      {
        width: containerSize.width,
        height: containerSize.height,
      },
      canvasOffset,
      canvasScale,
    );
  }, [canvasOffset.x, canvasOffset.y, canvasScale, containerSize.height, containerSize.width]);

  const layout = useMemo(
    () => createMinimapLayout(nodes, MINIMAP_WIDTH, MINIMAP_HEIGHT, 240, viewportWorldRect),
    [nodes, viewportWorldRect],
  );

  const viewportRect = useMemo(() => {
    if (!viewportWorldRect) return null;
    return rectToMinimap(viewportWorldRect, layout);
  }, [layout, viewportWorldRect]);

  const getLocalPoint = (event: React.PointerEvent<HTMLDivElement>): Vec2 | null => {
    const minimap = minimapRef.current;
    if (!minimap) return null;

    const rect = minimap.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(MINIMAP_WIDTH, event.clientX - rect.left)),
      y: Math.max(0, Math.min(MINIMAP_HEIGHT, event.clientY - rect.top)),
    };
  };

  const getViewportSize = (): { width: number; height: number } | null => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return null;

    return { width: containerSize.width, height: containerSize.height };
  };

  const moveViewportToPoint = (point: Vec2) => {
    const viewportSize = getViewportSize();
    if (!viewportSize) return;

    onOffsetChange(minimapPointToViewportOffset(point, layout, viewportSize, canvasScale));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const point = getLocalPoint(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const target = event.target instanceof HTMLElement ? event.target : null;
    const viewportTarget = target?.closest('[data-role="minimap-viewport"]');
    const isViewportDrag = !!viewportTarget && event.currentTarget.contains(viewportTarget);

    if (isViewportDrag) {
      setDragState({
        pointerId: event.pointerId,
        startPoint: point,
        startOffset: canvasOffset,
      });
      return;
    }

    moveViewportToPoint(point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getLocalPoint(event);
    if (!point) return;

    const startWorld = minimapPointToWorld(dragState.startPoint, layout);
    const currentWorld = minimapPointToWorld(point, layout);
    const deltaWorld = {
      x: currentWorld.x - startWorld.x,
      y: currentWorld.y - startWorld.y,
    };

    onOffsetChange({
      x: dragState.startOffset.x - deltaWorld.x * canvasScale,
      y: dragState.startOffset.y - deltaWorld.y * canvasScale,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 120 : 40;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      onOffsetChange({ x: canvasOffset.x + step, y: canvasOffset.y });
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      onOffsetChange({ x: canvasOffset.x - step, y: canvasOffset.y });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      onOffsetChange({ x: canvasOffset.x, y: canvasOffset.y + step });
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      onOffsetChange({ x: canvasOffset.x, y: canvasOffset.y - step });
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      moveViewportToPoint({ x: MINIMAP_WIDTH / 2, y: MINIMAP_HEIGHT / 2 });
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const panelClass = isLightCanvas
    ? 'border-black/10 bg-white/85 text-gray-900 shadow-black/10'
    : 'border-white/15 bg-gray-950/80 text-white shadow-black/40';

  return (
    <div
      ref={minimapRef}
      className={`absolute bottom-4 right-4 z-40 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md select-none ${panelClass}`}
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      aria-label="画布小地图"
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
      role="navigation"
    >
      <div className="absolute left-2 top-1.5 text-[10px] font-medium opacity-70 pointer-events-none">
        小地图
      </div>
      {nodes.map(node => {
        const point = worldToMinimap({ x: node.x, y: node.y }, layout);
        const color = getNodeTypeColor(node.type).primary;

        return (
          <div
            key={node.id}
            className="absolute rounded-sm opacity-80 shadow-sm"
            style={{
              left: point.x,
              top: point.y,
              width: Math.max(MIN_NODE_MARK_SIZE, node.width * layout.scale),
              height: Math.max(MIN_NODE_MARK_SIZE, node.height * layout.scale),
              backgroundColor: color,
            }}
          />
        );
      })}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-55 pointer-events-none">
          暂无节点
        </div>
      )}
      {viewportRect && (
        <div
          data-role="minimap-viewport"
          className={`absolute cursor-move rounded border-2 ${isLightCanvas ? 'border-blue-500 bg-blue-500/10' : 'border-cyan-300 bg-cyan-300/10'}`}
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(12, viewportRect.width),
            height: Math.max(12, viewportRect.height),
          }}
        />
      )}
    </div>
  );
}
