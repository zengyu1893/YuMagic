import { CanvasNode, NodeType, Vec2, NodeData } from '../../../types/pebblingTypes';

export interface NodeFactoryContext {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasOffset: Vec2;
  scale: number;
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  nodes: CanvasNode[];
  uuid: () => string;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  saveCurrentCanvas?: () => Promise<void>;
}

export function createNode(
  type: NodeType, content: string, position: Vec2 | undefined,
  title: string | undefined, data: NodeData | undefined,
  ctx: NodeFactoryContext,
): CanvasNode {
  const { containerRef, canvasOffset, scale, nodesRef, nodes, uuid, setNodes, setHasUnsavedChanges } = ctx;
  const container = containerRef.current;
  let x: number, y: number;

  // Node dimensions by type
  let width = 300; let height = 200;
  if (type === 'image') { width = 300; height = 300; if (data?.settings?.aspectRatio && data.settings.aspectRatio !== 'AUTO') { const [w, h] = data.settings.aspectRatio.split(':').map(Number); if (w && h) height = (width * h) / w; } }
  if (type === 'video') { width = 400; height = 225; }
  if (type === 'relay') { width = 40; height = 40; }
  if (['edit', 'remove-bg', 'upscale', 'llm', 'resize'].includes(type)) { width = 280; height = 250; }
  if (type === 'llm') { width = 320; height = 300; }
  if (type === 'runninghub') { width = 320; height = 280; }
  if (type === 'rh-main') { width = 280; height = 280; }
  if (type === 'rh-param') { width = 280; height = 56; }
  if (type === 'drawing-board') { width = 800; height = 700; }
  if (type === 'prompt-line') { width = 280; height = 220; }
  if (type === 'show-text') { width = 300; height = 200; }
  if (type === 'replace-text') { width = 280; height = 280; }
  if (type === 'output') { width = 300; height = 300; }

  if (position) {
    x = position.x; y = position.y;
  } else {
    const viewWidth = container ? container.clientWidth : window.innerWidth;
    const viewHeight = container ? container.clientHeight : window.innerHeight;
    const viewLeft = -canvasOffset.x / scale;
    const viewTop = -canvasOffset.y / scale;
    const viewRight = viewLeft + viewWidth / scale;
    const viewBottom = viewTop + viewHeight / scale;
    const viewCenterX = (viewLeft + viewRight) / 2;
    const viewCenterY = (viewTop + viewBottom) / 2;
    const currentNodes = nodesRef.current.length > 0 ? nodesRef.current : nodes;

    const isOverlapping = (px: number, py: number, pw: number, ph: number) => {
      return currentNodes.some(n => {
        const margin = 20;
        return !(px + pw + margin < n.x || px > n.x + n.width + margin || py + ph + margin < n.y || py > n.y + n.height + margin);
      });
    };

    const findEmptySpot = (): { x: number; y: number } => {
      let testX = viewCenterX - width / 2;
      let testY = viewCenterY - height / 2;
      if (!isOverlapping(testX, testY, width, height)) return { x: testX, y: testY };
      const step = 80;
      for (let radius = 1; radius <= 20; radius++) {
        for (let angle = 0; angle < 360; angle += 30) {
          const rad = (angle * Math.PI) / 180;
          testX = viewCenterX + Math.cos(rad) * radius * step - width / 2;
          testY = viewCenterY + Math.sin(rad) * radius * step - height / 2;
          if (testX >= viewLeft && testX + width <= viewRight && testY >= viewTop && testY + height <= viewBottom) {
            if (!isOverlapping(testX, testY, width, height)) return { x: testX, y: testY };
          }
        }
      }
      return { x: viewRight - width - 50, y: viewCenterY - height / 2 };
    };

    const spot = findEmptySpot();
    x = spot.x; y = spot.y;
  }

  const newNode: CanvasNode = {
    id: uuid(), type, content, x, y, width, height, title, data: data || {}, status: 'idle',
  };
  nodesRef.current = [...nodesRef.current, newNode];
  setNodes(prev => [...prev, newNode]);
  setHasUnsavedChanges(true);
  return newNode;
}

export function createRHPresetNode(ctx: NodeFactoryContext): CanvasNode {
  const { containerRef, canvasOffset, scale, nodesRef, nodes, uuid, setNodes, setHasUnsavedChanges, saveCurrentCanvas } = ctx;
  const container = containerRef.current;
  const width = 320; const height = 400;

  const viewWidth = container ? container.clientWidth : window.innerWidth;
  const viewHeight = container ? container.clientHeight : window.innerHeight;
  const viewLeft = -canvasOffset.x / scale;
  const viewTop = -canvasOffset.y / scale;
  const viewRight = viewLeft + viewWidth / scale;
  const viewBottom = viewTop + viewHeight / scale;
  const viewCenterX = (viewLeft + viewRight) / 2;
  const viewCenterY = (viewTop + viewBottom) / 2;

  const currentNodes = nodesRef.current.length > 0 ? nodesRef.current : nodes;
  const isOverlapping = (px: number, py: number, pw: number, ph: number) => {
    return currentNodes.some(n => {
      const margin = 20;
      return !(px + pw + margin < n.x || px > n.x + n.width + margin || py + ph + margin < n.y || py > n.y + n.height + margin);
    });
  };

  let testX = viewCenterX - width / 2;
  let testY = viewCenterY - height / 2;
  if (isOverlapping(testX, testY, width, height)) {
    const step = 80; let found = false;
    for (let radius = 1; radius <= 20 && !found; radius++) {
      for (let angle = 0; angle < 360 && !found; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        testX = viewCenterX + Math.cos(rad) * radius * step - width / 2;
        testY = viewCenterY + Math.sin(rad) * radius * step - height / 2;
        if (testX >= viewLeft && testX + width <= viewRight && testY >= viewTop && testY + height <= viewBottom) {
          if (!isOverlapping(testX, testY, width, height)) found = true;
        }
      }
    }
    if (!found) { testX = viewRight - width - 50; testY = viewCenterY - height / 2; }
  }

  const nodeId = uuid();
  const newNode: CanvasNode = {
    id: nodeId, type: 'rh-config', title: 'RunningHub 预设', content: '',
    x: testX, y: testY, width, height,
    data: { mode: 'app', webappId: '', keyType: 'consumer', instanceType: 'default', nodeInputs: {}, workflowNodeList: [] },
    status: 'idle',
  };

  nodesRef.current = [...nodesRef.current, newNode];
  setNodes(prev => [...prev, newNode]);
  setHasUnsavedChanges(true);
  if (saveCurrentCanvas) saveCurrentCanvas();
  return newNode;
}
