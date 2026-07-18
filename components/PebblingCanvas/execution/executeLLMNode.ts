import { ExecutorContext } from './executorTypes';
import { chatWithThirdPartyApi, getThirdPartyConfig, stripThinkingTags } from '../../../services/geminiService';
import { base64ToFile } from '../apiAdapters';
import { loadCanvasNodeThirdPartyConfig } from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';

/** Execute an LLM node: resolve system/user prompts, call chat API, write result. */
export async function executeLLMNode(ctx: ExecutorContext): Promise<void> {
  const { node, nodeId, signal, inputs, resolveInputs, connectionsRef, nodesRef, updateNode, saveCurrentCanvas, llmTaskCountersRef } = ctx;

  // System prompt: priority = system-port upstream > node.systemInstruction > default
  let systemPrompt = node.data?.systemInstruction || '';
  const systemPortConns = connectionsRef.current.filter(
    c => c.toNode === nodeId && c.toPortKey === 'system'
  );
  if (systemPortConns.length > 0) {
    const systemTexts: string[] = [];
    for (const sc of systemPortConns) {
      const upstreamNode = nodesRef.current.find(n => n.id === sc.fromNode);
      if (upstreamNode) {
        const text = upstreamNode.data?.output || upstreamNode.content || '';
        if (text.trim()) systemTexts.push(text.trim());
      }
    }
    if (systemTexts.length > 0) systemPrompt = systemTexts.join('\n');
  }
  if (!systemPrompt) systemPrompt = 'You are a helpful assistant.';

  // User prompt: exclude system-port connections from upstream text collection
  const userInputs = resolveInputs(nodeId, new Set(), ['system']);
  const userPrompt = node.data?.prompt || userInputs.texts.join('\n') || node.content;
  if (!userPrompt || userPrompt.trim() === '') {
    updateNode(nodeId, { status: 'error', content: '请输入提示词' });
    return;
  }

  // Task counter for concurrent execution progress display
  let counter = llmTaskCountersRef.current.get(nodeId);
  if (!counter) {
    counter = { total: 0, completed: 0 };
    llmTaskCountersRef.current.set(nodeId, counter);
  }
  counter.total++;
  const progressLabel = `${counter.completed + 1}/${counter.total}`;
  updateNode(nodeId, { data: { ...node.data, llmProgress: progressLabel } });

  try {
    let imageFiles: File[] | undefined;
    if (inputs.images.length > 0) {
      imageFiles = await Promise.all(
        inputs.images.map((img, i) => base64ToFile(img, `llm_input_${i}.png`))
      );
    }
    const providerConfig = await loadCanvasNodeThirdPartyConfig(node.data, 'chat', getThirdPartyConfig());
    const hasSelectedProvider = !!node.data?.apiProviderProfileId;
    const chatModel = node.data?.chatModel || providerConfig?.chatModel || '';
    if (hasSelectedProvider && (!providerConfig || !chatModel)) {
      throw new Error('No chat model selected');
    }
    const rawResult = await chatWithThirdPartyApi(
      systemPrompt, userPrompt, imageFiles,
      chatModel || undefined, node.data?.maxTokens, providerConfig,
    );
    if (signal.aborted) return;

    const result = node.data?.stripThinking !== false
      ? stripThinkingTags(rawResult) : rawResult;

    counter.completed++;
    const doneLabel = counter.completed >= counter.total
      ? `${counter.total}/${counter.total}`
      : `${counter.completed}/${counter.total}`;
    updateNode(nodeId, {
      content: result, status: 'idle',
      data: { ...node.data, output: result, llmProgress: doneLabel },
    });
    saveCurrentCanvas();
    if (counter.completed >= counter.total) llmTaskCountersRef.current.delete(nodeId);
  } catch (err) {
    counter.completed++;
    if (!signal.aborted) {
      const failLabel = `${counter.completed}/${counter.total} (${err instanceof Error ? err.message.slice(0, 20) : '失败'})`;
      updateNode(nodeId, { status: 'error', data: { ...node.data, llmProgress: failLabel } });
    }
    if (counter.completed >= counter.total) llmTaskCountersRef.current.delete(nodeId);
  }
}
