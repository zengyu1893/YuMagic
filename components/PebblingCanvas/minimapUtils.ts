import type { CanvasNode, Vec2 } from '../../types/pebblingTypes';

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MinimapLayout = {
  worldBounds: Rect;
  scale: number;
  width: number;
  height: number;
};

const DEFAULT_WORLD_BOUNDS: Rect = {
  x: -500,
  y: -350,
  width: 1000,
  height: 700,
};

export function getNodesBounds(nodes: CanvasNode[], padding = 240): Rect {
  if (nodes.length === 0) {
    return DEFAULT_WORLD_BOUNDS;
  }

  const left = Math.min(...nodes.map(node => node.x));
  const top = Math.min(...nodes.map(node => node.y));
  const right = Math.max(...nodes.map(node => node.x + node.width));
  const bottom = Math.max(...nodes.map(node => node.y + node.height));

  return {
    x: left - padding,
    y: top - padding,
    width: Math.max(1, right - left + padding * 2),
    height: Math.max(1, bottom - top + padding * 2),
  };
}

export function mergeRects(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return DEFAULT_WORLD_BOUNDS;

  const left = Math.min(...rects.map(rect => rect.x));
  const top = Math.min(...rects.map(rect => rect.y));
  const right = Math.max(...rects.map(rect => rect.x + rect.width));
  const bottom = Math.max(...rects.map(rect => rect.y + rect.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function createMinimapLayout(
  nodes: CanvasNode[],
  width: number,
  height: number,
  padding = 240,
  viewportRect: Rect | null = null,
): MinimapLayout {
  const nodeBounds = getNodesBounds(nodes, padding);
  const worldBounds = viewportRect ? mergeRects([nodeBounds, viewportRect]) : nodeBounds;
  const scale = Math.min(width / worldBounds.width, height / worldBounds.height);

  return {
    worldBounds,
    scale,
    width,
    height,
  };
}

export function worldToMinimap(point: Vec2, layout: MinimapLayout): Vec2 {
  return {
    x: (point.x - layout.worldBounds.x) * layout.scale,
    y: (point.y - layout.worldBounds.y) * layout.scale,
  };
}

export function rectToMinimap(rect: Rect, layout: MinimapLayout): Rect {
  const point = worldToMinimap({ x: rect.x, y: rect.y }, layout);

  return {
    x: point.x,
    y: point.y,
    width: rect.width * layout.scale,
    height: rect.height * layout.scale,
  };
}

export function getViewportWorldRect(
  containerRect: Pick<DOMRect, 'width' | 'height'>,
  canvasOffset: Vec2,
  canvasScale: number,
): Rect {
  return {
    x: Object.is(canvasOffset.x, 0) ? 0 : -canvasOffset.x / canvasScale,
    y: Object.is(canvasOffset.y, 0) ? 0 : -canvasOffset.y / canvasScale,
    width: containerRect.width / canvasScale,
    height: containerRect.height / canvasScale,
  };
}

export function minimapPointToViewportOffset(
  minimapPoint: Vec2,
  layout: MinimapLayout,
  viewportSize: { width: number; height: number },
  canvasScale: number,
): Vec2 {
  const worldCenter = {
    x: layout.worldBounds.x + minimapPoint.x / layout.scale,
    y: layout.worldBounds.y + minimapPoint.y / layout.scale,
  };

  return {
    x: viewportSize.width / 2 - worldCenter.x * canvasScale,
    y: viewportSize.height / 2 - worldCenter.y * canvasScale,
  };
}

export function minimapPointToWorld(point: Vec2, layout: MinimapLayout): Vec2 {
  return {
    x: layout.worldBounds.x + point.x / layout.scale,
    y: layout.worldBounds.y + point.y / layout.scale,
  };
}
