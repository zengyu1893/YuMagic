/**
 * 画布节点默认模板、标题、summary、颜色、featureId。
 * 由 canvasNodeFactory 在创建节点时合并默认值。
 */

import type { NodeType } from '../../../types/pebblingTypes';
import type { NodeTemplate } from '../types/canvas.types';

/**
 * 节点默认模板注册表。
 * 新增节点类型必须在此登记默认模板。
 */
export const NODE_TEMPLATES: Partial<Record<NodeType, NodeTemplate>> = {
  // === 源文本 ===
  text: {
    title: '文本',
    summary: '输入提示词或文本内容',
    width: 320,
    height: 200,
    minWidth: 240,
    minHeight: 120,
    featureId: 'source-text',
    icon: 'Type',
    executable: true,
  },

  idea: {
    title: '创意',
    summary: '创意灵感输入',
    width: 320,
    height: 200,
    minWidth: 240,
    minHeight: 120,
    featureId: 'source-text',
    icon: 'Lightbulb',
    executable: true,
  },

  // === 源图片 ===
  image: {
    title: '图片',
    summary: '上传或引用图片素材',
    width: 360,
    height: 300,
    minWidth: 200,
    minHeight: 180,
    featureId: 'source-media',
    icon: 'Image',
    executable: true,
  },

  // === 源视频 ===
  video: {
    title: '视频',
    summary: '上传或引用视频素材',
    width: 360,
    height: 280,
    minWidth: 240,
    minHeight: 200,
    featureId: 'source-media',
    icon: 'Video',
    executable: true,
  },

  // === LLM 对话 ===
  llm: {
    title: 'LLM 对话',
    summary: '大语言模型对话与视觉理解',
    width: 400,
    height: 440,
    minWidth: 320,
    minHeight: 280,
    featureId: 'text-ai',
    icon: 'Brain',
    executable: true,
  },

  // === 输出素材 ===
  output: {
    title: '输出素材',
    summary: '展示上游产出的图片、视频等素材',
    width: 360,
    height: 300,
    minWidth: 200,
    minHeight: 180,
    featureId: 'canvas',
    icon: 'Image',
    executable: false,
  },
  'video-output': {
    title: '视频输出',
    summary: '展示上游产出的视频素材',
    width: 360,
    height: 280,
    minWidth: 240,
    minHeight: 200,
    featureId: 'canvas',
    icon: 'Video',
    executable: false,
  },

  // === 中继 ===
  relay: {
    title: '中继',
    summary: '透传上游资产到下游',
    width: 240,
    height: 100,
    minWidth: 180,
    minHeight: 80,
    featureId: 'canvas',
    icon: 'ArrowLeftRight',
    executable: true,
  },

  // === RunningHub ===
  runninghub: {
    title: 'RunningHub',
    summary: 'RunningHub AI 应用',
    width: 380,
    height: 360,
    minWidth: 300,
    minHeight: 240,
    featureId: 'runninghub',
    icon: 'Zap',
    executable: true,
  },
  'rh-main': {
    title: 'RH 主节点',
    summary: 'RunningHub 封面主节点',
    width: 300,
    height: 200,
    minWidth: 220,
    minHeight: 160,
    featureId: 'runninghub',
    icon: 'Star',
    executable: false,
  },
  'rh-param': {
    title: 'RH 参数',
    summary: 'RunningHub 独立参数',
    width: 280,
    height: 140,
    minWidth: 200,
    minHeight: 100,
    featureId: 'runninghub',
    icon: 'SlidersHorizontal',
    executable: false,
  },
  'rh-config': {
    title: 'RH 配置',
    summary: 'RunningHub 应用配置',
    width: 340,
    height: 240,
    minWidth: 280,
    minHeight: 180,
    featureId: 'runninghub',
    icon: 'Settings',
    executable: false,
  },

  // === 画板 ===
  'drawing-board': {
    title: '画板',
    summary: '自由绘制与图片组合',
    width: 500,
    height: 420,
    minWidth: 320,
    minHeight: 280,
    featureId: 'image-editing',
    icon: 'Pencil',
    executable: true,
  },

  // === 图片编辑 ===
  edit: {
    title: '图片编辑',
    summary: '编辑/裁剪/调整图片',
    width: 360,
    height: 300,
    minWidth: 280,
    minHeight: 200,
    featureId: 'image-editing',
    icon: 'Edit',
    executable: true,
  },
  resize: {
    title: '调整尺寸',
    summary: '调整图片尺寸',
    width: 300,
    height: 220,
    minWidth: 240,
    minHeight: 180,
    featureId: 'image-editing',
    icon: 'Maximize2',
    executable: true,
  },
  'remove-bg': {
    title: '移除背景',
    summary: '移除图片背景',
    width: 300,
    height: 200,
    minWidth: 240,
    minHeight: 160,
    featureId: 'image-editing',
    icon: 'Scissors',
    executable: true,
  },
  upscale: {
    title: '图片放大',
    summary: 'AI 超分辨率放大',
    width: 300,
    height: 220,
    minWidth: 240,
    minHeight: 180,
    featureId: 'image-editing',
    icon: 'ZoomIn',
    executable: true,
  },

  // === Prompt 处理 ===
  'prompt-line': {
    title: '行选择',
    summary: '按行号选择文本',
    width: 280,
    height: 160,
    minWidth: 200,
    minHeight: 120,
    featureId: 'source-text',
    icon: 'List',
    executable: true,
  },
  'show-text': {
    title: '显示文本',
    summary: '展示文本内容',
    width: 300,
    height: 200,
    minWidth: 220,
    minHeight: 140,
    featureId: 'source-text',
    icon: 'Eye',
    executable: true,
  },
  'replace-text': {
    title: '文本替换',
    summary: '查找并替换文本',
    width: 300,
    height: 220,
    minWidth: 240,
    minHeight: 180,
    featureId: 'source-text',
    icon: 'Replace',
    executable: true,
  },

  // === BP 模板 ===
  bp: {
    title: 'BP 模板',
    summary: '业务流程模板',
    width: 360,
    height: 300,
    minWidth: 280,
    minHeight: 220,
    featureId: 'creative-library',
    icon: 'LayoutTemplate',
    executable: true,
  },

  // === 帧提取 ===
  'frame-extractor': {
    title: '帧提取',
    summary: '从视频中提取关键帧',
    width: 360,
    height: 320,
    minWidth: 280,
    minHeight: 240,
    featureId: 'source-media',
    icon: 'Camera',
    executable: true,
  },

  // === combine (废弃) ===
  combine: {
    title: '组合',
    summary: '组合多个输入（已废弃）',
    width: 240,
    height: 120,
    minWidth: 180,
    minHeight: 80,
    featureId: 'canvas',
    icon: 'Combine',
    executable: false,
  },
};

/** 获取节点模板，不存在则返回通用默认值 */
export function getNodeTemplate(nodeType: NodeType): NodeTemplate {
  return NODE_TEMPLATES[nodeType] || {
    title: nodeType,
    summary: '',
    width: 300,
    height: 200,
    minWidth: 180,
    minHeight: 100,
    featureId: 'canvas',
    icon: 'Box',
    executable: false,
  };
}
