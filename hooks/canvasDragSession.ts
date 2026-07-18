export interface DragSessionPosition {
  x: number;
  y: number;
}

export interface DragSessionNode {
  id: string;
  x: number;
  y: number;
}

export function getDragSessionNodeIds(
  initialPositions: ReadonlyMap<string, DragSessionPosition>,
  _selectedNodeIds?: ReadonlySet<string>,
): string[] {
  return Array.from(initialPositions.keys());
}

export function getDragSessionPosition(
  initialPosition: DragSessionPosition,
  delta: DragSessionPosition,
  snapSize?: number,
): DragSessionPosition {
  const nextPosition = {
    x: initialPosition.x + delta.x,
    y: initialPosition.y + delta.y,
  };

  if (!snapSize || snapSize <= 0) return nextPosition;

  return {
    x: Math.round(nextPosition.x / snapSize) * snapSize,
    y: Math.round(nextPosition.y / snapSize) * snapSize,
  };
}

export function hasDragDelta(delta: DragSessionPosition, threshold = 0): boolean {
  return Math.abs(delta.x) > threshold || Math.abs(delta.y) > threshold;
}

export function applyDragDeltaToNodes<T extends DragSessionNode>(
  nodes: readonly T[],
  initialPositions: ReadonlyMap<string, DragSessionPosition>,
  delta: DragSessionPosition,
  snapSize?: number,
): T[] {
  return nodes.map(node => {
    const initialPosition = initialPositions.get(node.id);
    if (!initialPosition) return node;

    const nextPosition = getDragSessionPosition(initialPosition, delta, snapSize);
    if (node.x === nextPosition.x && node.y === nextPosition.y) return node;

    return {
      ...node,
      x: nextPosition.x,
      y: nextPosition.y,
    };
  });
}
