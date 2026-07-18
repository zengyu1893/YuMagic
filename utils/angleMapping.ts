/**
 * 共享视角映射工具
 * 统一的角度 → 描述词映射逻辑
 * 用于 multiAngle_react.tsx, multiAngle_nodejs.js, MultiAngle3D.tsx
 */

export interface AngleParams {
  rotate: number;
  vertical: number;
  zoom: number;
  addAnglePrompt?: boolean;
}

export interface AngleResult {
  prompt: string;
  hDirection: string;
  vDirection: string;
  distance: string;
}

/** 角度参考表 */
export const ANGLE_REFERENCE = {
  horizontal: {
    0: 'front view (正面)',
    45: 'front-right view (正面右侧)',
    90: 'right side view (右侧)',
    135: 'back-right view (背面右侧)',
    180: 'back view (背面)',
    225: 'back-left view (背面左侧)',
    270: 'left side view (左侧)',
    315: 'front-left view (正面左侧)',
  },
  vertical: {
    '-30 to -15': 'low angle (仰视)',
    '-15 to 15': 'eye level (平视)',
    '15 to 45': 'high angle (高角度)',
    '45 to 75': "bird's eye view (鸟瞰)",
    '75 to 90': 'top-down view (俯视)',
  },
  zoom: {
    '0-2': 'wide shot (远景)',
    '2-4': 'medium-wide shot (中远景)',
    '4-6': 'medium shot (中景)',
    '6-8': 'medium close-up (中近景)',
    '8-10': 'close-up (特写)',
  },
} as const;

export function getHorizontalDirection(angle: number, addAnglePrompt = true): string {
  const hAngle = angle % 360;
  const suffix = addAnglePrompt ? '' : ' quarter';

  if (hAngle < 22.5 || hAngle >= 337.5) return 'front view';
  if (hAngle < 67.5) return `front-right${suffix} view`;
  if (hAngle < 112.5) return 'right side view';
  if (hAngle < 157.5) return `back-right${suffix} view`;
  if (hAngle < 202.5) return 'back view';
  if (hAngle < 247.5) return `back-left${suffix} view`;
  if (hAngle < 292.5) return 'left side view';
  return `front-left${suffix} view`;
}

export function getVerticalDirection(vertical: number, addAnglePrompt = true): string {
  if (addAnglePrompt) {
    if (vertical < -15) return 'low angle';
    if (vertical < 15) return 'eye level';
    if (vertical < 45) return 'high angle';
    if (vertical < 75) return "bird's eye view";
    return 'top-down view';
  }
  if (vertical < -15) return 'low-angle shot';
  if (vertical < 15) return 'eye-level shot';
  if (vertical < 75) return 'elevated shot';
  return 'high-angle shot';
}

export function getDistanceDescription(zoom: number, addAnglePrompt = true): string {
  if (addAnglePrompt) {
    if (zoom < 2) return 'wide shot';
    if (zoom < 4) return 'medium-wide shot';
    if (zoom < 6) return 'medium shot';
    if (zoom < 8) return 'medium close-up';
    return 'close-up';
  }
  if (zoom < 2) return 'wide shot';
  if (zoom < 6) return 'medium shot';
  return 'close-up';
}

export function convertAngleToPrompt(params: AngleParams): AngleResult {
  const { rotate: rawRotate = 0, vertical: rawVertical = 0, zoom: rawZoom = 5, addAnglePrompt = true } = params;

  const rotate = Math.max(0, Math.min(360, Math.round(rawRotate)));
  const vertical = Math.max(-30, Math.min(90, Math.round(rawVertical)));
  const zoom = Math.max(0, Math.min(10, rawZoom));

  const hDirection = getHorizontalDirection(rotate, addAnglePrompt);
  const vDirection = getVerticalDirection(vertical, addAnglePrompt);
  const distance = getDistanceDescription(zoom, addAnglePrompt);

  const prompt = addAnglePrompt
    ? `${hDirection}, ${vDirection}, ${distance} (horizontal: ${rotate}, vertical: ${vertical}, zoom: ${zoom.toFixed(1)})`
    : `${hDirection} ${vDirection} ${distance}`;

  return { prompt, hDirection, vDirection, distance };
}

/** 中文视角描述（用于UI显示） */
export function getViewDescriptionCN(rotate: number, vertical: number, zoom: number): string {
  const hAngle = rotate % 360;
  let h = '正面';
  if (hAngle >= 337.5 || hAngle < 22.5) h = '正面';
  else if (hAngle < 67.5) h = '右前';
  else if (hAngle < 112.5) h = '右侧';
  else if (hAngle < 157.5) h = '右后';
  else if (hAngle < 202.5) h = '背面';
  else if (hAngle < 247.5) h = '左后';
  else if (hAngle < 292.5) h = '左侧';
  else h = '左前';

  let v = '平视';
  if (vertical < -15) v = '仰视';
  else if (vertical < 15) v = '平视';
  else if (vertical < 45) v = '高角度';
  else if (vertical < 75) v = '鸟瞰';
  else v = '俯视';

  let z = '中景';
  if (zoom < 2) z = '远景';
  else if (zoom < 4) z = '中远景';
  else if (zoom < 6) z = '中景';
  else if (zoom < 8) z = '中近景';
  else z = '特写';

  return `${h}视角，${v}，${z}`;
}
