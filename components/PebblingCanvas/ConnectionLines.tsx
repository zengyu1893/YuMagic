import React from 'react';
import { Connection, CanvasNode } from '../../types/pebblingTypes';
import { pointOnCubicBezier } from './apiAdapters';

interface ConnectionLinesProps {
  connections: Connection[];
  nodesRef: React.MutableRefObject<CanvasNode[]>;
  isLightCanvas: boolean;
  selectedConnectionId: string | null;
  onSelectConnection: (id: string) => void;
  onClearNodeSelection?: () => void; // 点击线时清除节点选中，防止删线连带删节点
  edgeNumberMapRef: React.MutableRefObject<Map<string, { number: number; total: number }>>;
  dragTick?: number; // 拖拽时变化，打破 memo 以读取 nodesRef 最新位置
}

/** 连接线渲染 — React.memo 避免平移/缩放时不必要重算 bezier 路径 */
export const ConnectionLines = React.memo(function ConnectionLines({
  connections, nodesRef, isLightCanvas, selectedConnectionId,
  onSelectConnection, onClearNodeSelection, edgeNumberMapRef,
}: ConnectionLinesProps) {
  return (
    <>
      {connections.map(conn => {
        const from = nodesRef.current.find(n => n.id === conn.fromNode);
        const to = nodesRef.current.find(n => n.id === conn.toNode);
        if (!from || !to) return null;

        const startX = from.x + from.width;
        const startY = from.y + from.height / 2;
        let endX = to.x - 8;
        let endY = to.y + to.height / 2;

        let isImageToImagePort = false;
        const isSourceImageNode = from.type === 'image';

        // rh-config / runninghub 节点端口偏移（两者内部端口结构一致）
        if ((to.type === 'rh-config' || to.type === 'runninghub') && conn.toPortKey) {
          if (conn.toPortOffsetY !== undefined) {
            endY = to.y + conn.toPortOffsetY;
          } else if (conn.toPortKey === 'cover') {
            endY = to.y + 132;
          }
          if (conn.toPortKey === 'cover') {
            isImageToImagePort = isSourceImageNode;
          } else if (to.data?.appInfo?.nodeInfoList) {
            const portInfo = to.data.appInfo.nodeInfoList.find((info: any) =>
              `${info.nodeId}_${info.fieldName}` === conn.toPortKey
            );
            const targetFieldType = (portInfo?.fieldType || '').toUpperCase();
            isImageToImagePort = isSourceImageNode && ['IMAGE', 'VIDEO', 'AUDIO'].includes(targetFieldType);
          }
        } else if (to.type === 'rh-param') {
          endX = to.x - 8;
          endY = to.y + to.height / 2;
          const paramFieldType = to.data?.rhParamInfo?.fieldType?.toUpperCase() || '';
          isImageToImagePort = isSourceImageNode && ['IMAGE', 'VIDEO', 'AUDIO'].includes(paramFieldType);
        } else if (to.type === 'rh-main') {
          endX = to.x - 8;
          endY = to.y + to.height / 2;
        } else if (to.type === 'llm') {
          endX = to.x - 8;
          // system 端口在 y+40 附近，默认端口在中间
          if (conn.toPortKey === 'system') {
            endY = to.y + 40;
          } else {
            endY = to.y + to.height / 2;
          }
        }

        const lineColor = isImageToImagePort
          ? { main: '#34d399', glow: 'rgba(52, 211, 153, 0.4)', selected: '#10b981' }
          : { main: isLightCanvas ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
              glow: isLightCanvas ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
              selected: isLightCanvas ? '#1d1d1f' : '#ffffff' };

        const isSelected = selectedConnectionId === conn.id;
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.abs(dx);
        const verticalDistance = Math.abs(dy);
        const minControlOffset = 50;

        let ctrl1X: number, ctrl1Y: number, ctrl2X: number, ctrl2Y: number;

        if (dx >= 0) {
          const controlOffset = Math.min(Math.max(distance / 3, minControlOffset), distance / 2 + 20);
          ctrl1X = startX + controlOffset;
          ctrl1Y = startY;
          ctrl2X = endX - controlOffset;
          ctrl2Y = endY;
          if (distance < 100) {
            ctrl1X = startX + distance / 2;
            ctrl2X = startX + distance / 2;
          }
        } else {
          const controlOffset = Math.max(distance / 2, minControlOffset * 1.5);
          ctrl1X = startX + controlOffset;
          ctrl1Y = startY + (verticalDistance > 50 ? 0 : (endY > startY ? 50 : -50));
          ctrl2X = endX - controlOffset;
          ctrl2Y = endY + (verticalDistance > 50 ? 0 : (endY > startY ? -50 : 50));
        }

        const pathD = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;

        return (
          <g key={conn.id} onClick={() => { onClearNodeSelection?.(); onSelectConnection(conn.id); }} className="pointer-events-auto cursor-pointer group">
            <path d={pathD} stroke="transparent" strokeWidth="20" fill="none" />
            <path d={pathD}
              stroke={isSelected ? (isImageToImagePort ? 'rgba(16, 185, 129, 0.6)' : (isLightCanvas ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)')) : lineColor.glow}
              strokeWidth={isSelected ? 8 : 5} fill="none"
              filter={isImageToImagePort ? 'url(#glow-green)' : (isLightCanvas ? 'url(#glow-dark)' : 'url(#glow-white)')}
              strokeLinecap="round" />
            <path d={pathD}
              stroke={isSelected ? lineColor.selected : lineColor.main}
              strokeWidth={isSelected ? 3 : 2} fill="none" strokeLinecap="round" />
            <circle cx={startX} cy={startY} r={isSelected ? 5 : 4}
              fill={isImageToImagePort ? '#34d399' : (isLightCanvas ? '#1d1d1f' : '#ffffff')}
              filter={isImageToImagePort ? 'url(#glow-green)' : (isLightCanvas ? 'url(#glow-dark)' : 'url(#glow-white)')} />
            <circle cx={endX} cy={endY} r={isSelected ? 5 : 4}
              fill={isImageToImagePort ? '#34d399' : (isLightCanvas ? '#1d1d1f' : '#ffffff')}
              filter={isImageToImagePort ? 'url(#glow-green)' : (isLightCanvas ? 'url(#glow-dark)' : 'url(#glow-white)')} />
            {edgeNumberMapRef.current.has(conn.id) && (() => {
              const info = edgeNumberMapRef.current.get(conn.id)!;
              const bp = pointOnCubicBezier(0.80, startX, startY, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
              const isDark = !isLightCanvas;
              return (
                <g className="pointer-events-none">
                  <circle cx={bp.x} cy={bp.y} r={9}
                    fill={isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'}
                    stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} strokeWidth="1" />
                  <text x={bp.x} y={bp.y} textAnchor="middle" dominantBaseline="central"
                    fill={isDark ? '#1d1d1f' : '#ffffff'} fontSize="10" fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ userSelect: 'none' }}>{info.number}</text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </>
  );
});
