import { GenerationConfig } from '../../../types/pebblingTypes';
import { ExecutorContext } from './executorTypes';
import { generateCreativeImage, editCreativeImage } from '../apiAdapters';
import { generateAdvancedLLM } from '../apiAdapters';
import { downloadRemoteToOutput, saveToOutput } from '../../../services/api/files';
import { persistGeneratedImageForCanvas } from './generatedImageAsset';

/**
 * Execute a BP (Blueprint) node. Runs agent fields through the LLM,
 * substitutes template variables, then calls the image generation API.
 */
export async function executeBPNode(ctx: ExecutorContext): Promise<void> {
  const {
    node, nodeId, signal, inputs,
    connectionsRef, updateNode,
    saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName,
  } = ctx;

  const bpTemplate = node.data?.bpTemplate;
  const bpInputs = node.data?.bpInputs || {};
  const inputImages = inputs.images;
  const bpChatModel = node.data?.chatModel;
  const bpImageModel = node.data?.settings?.model;

  if (!bpTemplate) {
    console.error('BP节点执行失败：无模板配置');
    return;
  }

  try {
    const bpFields = bpTemplate.bpFields || [];
    const inputFields = bpFields.filter((f: any) => f.type === 'input');
    const agentFields = bpFields.filter((f: any) => f.type === 'agent');

    // 1. Collect user input values
    const userInputValues: Record<string, string> = {};
    for (const field of inputFields) {
      userInputValues[field.name] = bpInputs[field.id] || bpInputs[field.name] || '';
    }

    // 2. Execute agent fields sequentially
    const agentResults: Record<string, string> = {};
    for (const field of agentFields) {
      if (field.agentConfig) {
        let instruction = field.agentConfig.instruction;
        for (const [name, value] of Object.entries(userInputValues)) {
          instruction = instruction.split(`/${name}`).join(value);
        }
        for (const [name, result] of Object.entries(agentResults)) {
          instruction = instruction.split(`{${name}}`).join(result);
        }
        try {
          const agentResult = await generateAdvancedLLM(
            node, instruction,
            'You are a creative assistant. Generate content based on the given instruction.',
            inputImages.length > 0 ? [] : undefined,
            bpChatModel,
            signal,
          );
          agentResults[field.name] = agentResult;
        } catch (agentErr) {
          console.error(`[BP节点] Agent ${field.name} 执行失败:`, agentErr);
          agentResults[field.name] = `[Agent错误: ${agentErr}]`;
        }
      }
    }

    // 3. Substitute template variables
    let finalPrompt = bpTemplate.prompt;
    for (const [name, value] of Object.entries(userInputValues)) {
      finalPrompt = finalPrompt.split(`/${name}`).join(value);
    }
    for (const [name, result] of Object.entries(agentResults)) {
      finalPrompt = finalPrompt.split(`{${name}}`).join(result);
    }

    // 4. Call image generation API
    const settings = node.data?.settings || {};
    const aspectRatio = settings.aspectRatio || 'AUTO';
    const resolution = settings.resolution || '2K';
    const quality = settings.quality || 'auto';
    const moderation = settings.moderation === 'low' || settings.moderation === 'auto'
      ? settings.moderation
      : undefined;

    let result: string | null = null;
    if (inputImages.length > 0) {
      let config: GenerationConfig | undefined;
      if (aspectRatio === 'AUTO') {
        if (resolution !== 'AUTO' && resolution !== '1K') {
          config = { resolution: resolution as '1K' | '2K' | '4K', quality, moderation };
        } else {
          config = { quality, moderation };
        }
      } else {
        config = { aspectRatio, resolution: resolution as '1K' | '2K' | '4K', quality, moderation };
      }
      result = await editCreativeImage(inputImages, finalPrompt, config, signal, bpImageModel);
    } else {
      const config: GenerationConfig = {
        aspectRatio: aspectRatio !== 'AUTO' ? aspectRatio : '1:1',
        resolution: resolution as '1K' | '2K' | '4K',
        quality,
        moderation,
      };
      result = await generateCreativeImage(finalPrompt, config, signal, bpImageModel);
    }

    if (!signal.aborted && result) {
      const localResult = await persistGeneratedImageForCanvas(result, {
        downloadRemoteToOutput,
        saveToOutput,
      }, `canvas_${nodeId}_${Date.now()}.png`);
      const hasDownstream = connectionsRef.current.some(c => c.fromNode === nodeId);
      if (hasDownstream) {
        updateNode(nodeId, {
          data: { ...node.data, output: localResult },
          status: 'completed',
        });
      } else {
        updateNode(nodeId, {
          content: localResult,
          status: 'completed',
        });
      }
      saveCurrentCanvas();
      if (onImageGenerated) {
        onImageGenerated(localResult, finalPrompt, currentCanvasId || undefined, canvasName);
      }
    } else if (!signal.aborted) {
      updateNode(nodeId, { status: 'error' });
    }
  } catch (err) {
    console.error('BP节点执行失败:', err);
    if (!signal.aborted) updateNode(nodeId, { status: 'error' });
  }
}
