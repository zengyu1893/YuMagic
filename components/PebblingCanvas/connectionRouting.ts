/**
 * 画布连接线端点计算工具。
 * 从 PebblingCanvas/index.tsx JSX 中提取的纯函数，
 * 负责根据节点类型和端口键计算连接线的起点、终点和颜色。
 */
import { CanvasNode, Connection } from '../../types/pebblingTypes';

export interface ConnectionEndpoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ctrl1X: number;
  ctrl1Y: number;
  ctrl2X: number;
  ctrl2Y: number;
  pathD: string;
  isImageToImagePort: boolean;
  lineColor: LineColorSet;
}

export interface LineColorSet {
  main: string;
  glow: string;
  selected: string;
}

/**
 * 计算一条连接线的所有端点和控制点坐标。
 * 根据目标节点类型执行不同的端口路由策略。
 */
export function getConnectionEndpoints(
  from: CanvasNode,
  to: CanvasNode,
  conn: Connection,
  isLightCanvas: boolean,
): ConnectionEndpoints {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;

  // 默认终点：目标节点左侧中心
  let endX = to.x - 8;
  let endY = to.y + to.height / 2;

  let isImageToImagePort = false;
  const isSourceImageNode = from.type === 'image';

  // ============ rh-config 节点：优先使用存储的 toPortOffsetY ============
  if (to.type === 'rh-config' && conn.toPortKey) {
    if (conn.toPortOffsetY !== undefined) {
      endY = to.y + conn.toPortOffsetY;
    } else if (conn.toPortKey === 'cover') {
      endY = to.y + 132; // headerHeight + coverHeight/2
    }

    if (conn.toPortKey === 'cover') {
      isImageToImagePort = isSourceImageNode;
    } else if (to.data?.appInfo?.nodeInfoList) {
      const portInfo = to.data.appInfo.nodeInfoList.find(
        (info: any) => `${info.nodeId}_${info.fieldName}` === conn.toPortKey,
      );
      const fieldType = (portInfo?.fieldType || '').toUpperCase();
      isImageToImagePort = isSourceImageNode && ['IMAGE', 'VIDEO', 'AUDIO'].includes(fieldType);
    }
  }
  // ============ rh-param 节点（独立 Ticket）============
  else if (to.type === 'rh-param') {
    endX = to.x - 8;
    endY = to.y + to.height / 2;

    const paramFieldType = to.data?.rhParamInfo?.fieldType?.toUpperCase() || '';
    isImageToImagePort = isSourceImageNode && ['IMAGE', 'VIDEO', 'AUDIO'].includes(paramFieldType);
  }
  // ============ rh-main 节点（封面主节点）============
  else if (to.type === 'rh-main') {
    endX = to.x - 8;
    endY = to.y + to.height / 2;
  }
  // ============ LLM 节点端口路由 ============
  else if (to.type === 'llm') {
    endX = to.x - 8;
    if (conn.toPortKey === 'system') {
      endY = to.y + 40; // System 端口在 top-[40px]
    } else {
      endY = to.y + to.height / 2;
    }
  }
  // ============ 旧 runninghub 节点的兼容处理 ============
  else if (conn.toPortKey && to.type === 'runninghub' && to.data?.appInfo?.nodeInfoList) {
    const portKeyMatch = conn.toPortKey.match(/^input-(.+)-(.+)$/);
    if (portKeyMatch) {
      const [, nodeId, fieldName] = portKeyMatch;
      const portInfo = to.data.appInfo.nodeInfoList.find(
        (info: any) => info.nodeId === nodeId && info.fieldName === fieldName,
      );
      const fieldType = (portInfo?.fieldType || '').toUpperCase();
      isImageToImagePort = isSourceImageNode && ['IMAGE', 'VIDEO', 'AUDIO'].includes(fieldType);
    }
  }

  // 颜色
  const lineColor: LineColorSet = isImageToImagePort
    ? { main: '#34d399', glow: 'rgba(52, 211, 153, 0.4)', selected: '#10b981' }
    : {
        main: isLightCanvas ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        glow: isLightCanvas ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
        selected: isLightCanvas ? '#1d1d1f' : '#ffffff',
      };

  // 贝塞尔曲线控制点
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);
  const minControlOffset = 50;

  let ctrl1X: number;
  let ctrl1Y: number;
  let ctrl2X: number;
  let ctrl2Y: number;

  if (dx >= 0) {
    // 正常方向：从左到右
    const controlOffset = Math.min(
      Math.max(distance / 3, minControlOffset),
      distance / 2 + 20,
    );
    ctrl1X = startX + controlOffset;
    ctrl1Y = startY;
    ctrl2X = endX - controlOffset;
    ctrl2Y = endY;

    // 当水平距离很小时，使用近似直线
    if (distance < 100) {
      ctrl1X = startX + distance / 2;
      ctrl2X = startX + distance / 2;
    }
  } else {
    // 反向连接：曲线绕行
    const controlOffset = Math.max(distance / 2, minControlOffset * 1.5);
    ctrl1X = startX + controlOffset;
    ctrl1Y = startY + (verticalDistance > 50 ? 0 : endY > startY ? 50 : -50);
    ctrl2X = endX - controlOffset;
    ctrl2Y = endY + (verticalDistance > 50 ? 0 : endY > startY ? -50 : 50);
  }

  const pathD = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;

  return { startX, startY, endX, endY, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, pathD, isImageToImagePort, lineColor };
}
