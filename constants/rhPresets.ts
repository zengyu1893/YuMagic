/**
 * RunningHub 内置预设 — AI应用 / ComfyUI工作流
 * 画布 RHNode 下拉选择，显示名称，后台映射 ID
 */
export interface RHPresetField {
  nodeId: string;
  fieldName: string;
  fieldValue: string;        // 默认值
  label: string;             // 显示标签
  type?: 'text' | 'image' | 'audio' | 'select';  // 输入控件类型
  options?: string[];        // select 类型的选项
  placeholder?: string;
}

export interface RHPreset {
  id: string;
  title: string;             // 显示名称
  mode: 'app' | 'workflow';
  fields?: RHPresetField[];  // 预定义参数（工作流用）
}

export const RH_PRESETS: RHPreset[] = [
  // ===== AI 应用 =====
  {
    id: '2056559147252015106',
    title: 'Z-Image-Turbo 身材优化+丰满LoRA',
    mode: 'app',
  },
  {
    id: '2065472591640489986',
    title: '最强数字人 InfiniteTalk 声音克隆',
    mode: 'app',
  },

  // ===== ComfyUI 工作流 =====
  {
    id: '2037372189707603969',
    title: '数字人短视频',
    mode: 'workflow',
    fields: [
      { nodeId: '337', fieldName: 'image', fieldValue: '', label: '参考人物图', type: 'image', placeholder: '上传人物照片' },
      { nodeId: '323', fieldName: 'audio', fieldValue: '', label: '参考声音', type: 'audio', placeholder: '上传声音文件' },
      { nodeId: '321', fieldName: 'value', fieldValue: '', label: '口播文案', type: 'text', placeholder: '输入口播文案...' },
      { nodeId: '329', fieldName: 'value', fieldValue: '1280', label: '图片缩放边长', type: 'text', placeholder: '1280' },
      { nodeId: '277', fieldName: 'positive_prompt', fieldValue: '', label: '正面提示词（可选）', type: 'text', placeholder: '可选，正面提示词' },
    ],
  },
];
