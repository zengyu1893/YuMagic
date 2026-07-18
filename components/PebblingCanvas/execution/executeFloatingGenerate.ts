import { CanvasNode, GenerationConfig, NodeData, NodeType } from '../../../types/pebblingTypes';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { editCreativeImage, generateCreativeImage } from '../apiAdapters';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

interface FloatingGenerateContext {
  type: NodeType;
  prompt: string;
  config: GenerationConfig;
  files?: File[];
  addNode: (
    type: NodeType,
    content?: string,
    position?: { x: number; y: number },
    title?: string,
    data?: NodeData,
  ) => CanvasNode;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  setIsGenerating: (value: boolean) => void;
  onImageGenerated?: (url: string, prompt: string, canvasId?: string, canvasName?: string) => void;
  currentCanvasId?: string | null;
  canvasName: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target?.result as string);
    reader.readAsDataURL(file);
  });
}

export async function executeFloatingGenerate(ctx: FloatingGenerateContext): Promise<void> {
  const {
    type,
    prompt,
    config,
    files,
    addNode,
    updateNode,
    setIsGenerating,
    onImageGenerated,
    currentCanvasId,
    canvasName,
  } = ctx;

  setIsGenerating(true);

  let base64Files: string[] = [];
  if (files && files.length > 0) {
    base64Files = await Promise.all(files.map(fileToDataUrl));
  }

  const newNode = addNode(type, '', undefined, undefined, {
    prompt,
    settings: config,
  });
  updateNode(newNode.id, { status: 'running' });

  try {
    let result: string | null = null;
    if (type === 'image') {
      result = await generateCreativeImage(prompt, config);
    } else if (type === 'edit') {
      result = await editCreativeImage(base64Files, prompt, config);
    }

    if (result) {
      const localResult = await persistGeneratedImageForCanvas(result, {
        downloadRemoteToOutput,
        saveToOutput,
      }, `canvas_${newNode.id}_${Date.now()}.png`);
      updateNode(newNode.id, { content: localResult, status: 'completed' });
      if (onImageGenerated) {
        onImageGenerated(localResult, prompt, currentCanvasId || undefined, canvasName);
      }
    } else {
      updateNode(newNode.id, { status: 'error' });
    }
  } catch (error) {
    console.error('[FloatingInput] 生成失败:', error);
    updateNode(newNode.id, { status: 'error' });
  } finally {
    setIsGenerating(false);
  }
}
