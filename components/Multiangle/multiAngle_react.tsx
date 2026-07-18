/**
 * ComfyUI-Easy-Use: 可视化调节视角功能 - React/TypeScript 版本
 * 核心逻辑由 utils/angleMapping.ts 提供
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type AngleParams,
  type AngleResult,
  convertAngleToPrompt,
} from '../../utils/angleMapping';

export { convertAngleToPrompt, type AngleParams, type AngleResult };

// ============================================
// React Hook - 使用角度控制
// ============================================

export function useMultiAngle(initialParams?: Partial<AngleParams>) {
  const [params, setParams] = useState<AngleParams>({
    rotate: initialParams?.rotate ?? 0,
    vertical: initialParams?.vertical ?? 0,
    zoom: initialParams?.zoom ?? 5,
    addAnglePrompt: initialParams?.addAnglePrompt ?? true,
  });
  
  const result = useMemo(() => convertAngleToPrompt(params), [params]);
  
  const setRotate = useCallback((value: number) => {
    setParams(prev => ({ ...prev, rotate: value }));
  }, []);
  
  const setVertical = useCallback((value: number) => {
    setParams(prev => ({ ...prev, vertical: value }));
  }, []);
  
  const setZoom = useCallback((value: number) => {
    setParams(prev => ({ ...prev, zoom: value }));
  }, []);
  
  const setAddAnglePrompt = useCallback((value: boolean) => {
    setParams(prev => ({ ...prev, addAnglePrompt: value }));
  }, []);
  
  return {
    params,
    setParams,
    setRotate,
    setVertical,
    setZoom,
    setAddAnglePrompt,
    result,
  };
}

// ============================================
// React 组件 - 可视化视角控制器
// ============================================

interface MultiAngleControlProps {
  value?: AngleParams;
  onChange?: (params: AngleParams, result: AngleResult) => void;
  showPreview?: boolean;
}

export const MultiAngleControl: React.FC<MultiAngleControlProps> = ({
  value,
  onChange,
  showPreview = true,
}) => {
  const {
    params,
    setParams,
    setRotate,
    setVertical,
    setZoom,
    setAddAnglePrompt,
    result,
  } = useMultiAngle(value);
  
  // 当参数改变时触发回调
  React.useEffect(() => {
    onChange?.(params, result);
  }, [params, result, onChange]);
  
  // 同步外部value
  React.useEffect(() => {
    if (value) {
      setParams(value);
    }
  }, [value, setParams]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎬 可视化视角控制</h3>
      
      {/* 水平角度滑块 */}
      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          水平角度 (Rotate): {params.rotate}°
        </label>
        <input
          type="range"
          min={0}
          max={360}
          value={params.rotate}
          onChange={(e) => setRotate(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.hint}>
          0°正面 → 90°右侧 → 180°背面 → 270°左侧
        </div>
      </div>
      
      {/* 垂直角度滑块 */}
      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          垂直角度 (Vertical): {params.vertical}°
        </label>
        <input
          type="range"
          min={-30}
          max={90}
          value={params.vertical}
          onChange={(e) => setVertical(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.hint}>
          -30°仰视 → 0°平视 → 90°俯视
        </div>
      </div>
      
      {/* 缩放滑块 */}
      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          缩放距离 (Zoom): {params.zoom.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={params.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.hint}>
          0远景 → 5中景 → 10特写
        </div>
      </div>
      
      {/* 详细模式开关 */}
      <div style={styles.checkboxGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={params.addAnglePrompt}
            onChange={(e) => setAddAnglePrompt(e.target.checked)}
          />
          添加详细角度信息
        </label>
      </div>
      
      {/* 预览区域 */}
      {showPreview && (
        <div style={styles.preview}>
          <div style={styles.previewTitle}>生成的提示词:</div>
          <div style={styles.promptText}>{result.prompt}</div>
          <div style={styles.breakdown}>
            <span>📐 {result.hDirection}</span>
            <span>📏 {result.vDirection}</span>
            <span>🔍 {result.distance}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 样式定义
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#1e1e1e',
    borderRadius: '12px',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '400px',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
  },
  sliderGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#e0e0e0',
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '11px',
    color: '#888',
    marginTop: '4px',
  },
  checkboxGroup: {
    marginBottom: '20px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  preview: {
    backgroundColor: '#2d2d2d',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '20px',
  },
  previewTitle: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
  },
  promptText: {
    fontSize: '14px',
    color: '#4fc3f7',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
  breakdown: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#aaa',
  },
};

// ============================================
// 导出纯函数版本（用于Node.js服务端）
// ============================================

export { convertAngleToPrompt as multiAngleConvert };

// 使用示例
/*
// 方式1: 纯函数调用
import { convertAngleToPrompt } from './multiAngle_react';

const result = convertAngleToPrompt({
  rotate: 45,
  vertical: 30,
  zoom: 7,
  addAnglePrompt: true,
});
console.log(result.prompt);
// 输出: "front-right view, high angle, medium close-up (horizontal: 45, vertical: 30, zoom: 7.0)"

// 方式2: React组件
import { MultiAngleControl } from './multiAngle_react';

function App() {
  return (
    <MultiAngleControl
      onChange={(params, result) => {
        console.log('当前参数:', params);
        console.log('生成提示词:', result.prompt);
      }}
    />
  );
}

// 方式3: React Hook
import { useMultiAngle } from './multiAngle_react';

function MyComponent() {
  const { params, setRotate, result } = useMultiAngle();
  
  return (
    <div>
      <button onClick={() => setRotate(90)}>设置右侧视角</button>
      <p>{result.prompt}</p>
    </div>
  );
}
*/
