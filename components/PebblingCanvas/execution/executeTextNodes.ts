import { ExecutorContext } from './executorTypes';

/** Execute a text node: write content to data.output for downstream consumption. */
export async function executeTextNode(ctx: ExecutorContext): Promise<void> {
  const { node, nodeId, updateNode, saveCurrentCanvas } = ctx;
  const textContent = node.content || '';
  if (!textContent || textContent.trim() === '') {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: '内容为空' } });
    return;
  }
  updateNode(nodeId, {
    content: textContent, status: 'completed',
    data: { ...node.data, output: textContent, error: undefined },
  });
  saveCurrentCanvas();
}

/** Execute a show-text node: resolve upstream text, display and output. */
export async function executeShowTextNode(ctx: ExecutorContext): Promise<void> {
  const { node, nodeId, resolveInputs, updateNode, saveCurrentCanvas } = ctx;
  const inputs = resolveInputs(nodeId);
  const upstreamText = inputs.texts.join('\n').trim();
  const textContent = upstreamText || node.content || '';
  if (!textContent || textContent.trim() === '') {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: '内容为空' } });
    return;
  }
  updateNode(nodeId, {
    content: textContent, status: 'completed',
    data: { ...node.data, output: textContent, error: undefined },
  });
  saveCurrentCanvas();
}

/** Execute a replace-text node: find-and-replace on upstream text. */
export async function executeReplaceTextNode(ctx: ExecutorContext): Promise<void> {
  const { node, nodeId, resolveInputs, updateNode, saveCurrentCanvas } = ctx;
  const replaceInputs = resolveInputs(nodeId);
  const upstreamText = replaceInputs.texts.join('\n').trim();
  const sourceContent = upstreamText || node.content || '';
  if (!sourceContent || sourceContent.trim() === '') {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: '内容为空' } });
    return;
  }
  const findText = node.data?.findText || '';
  const replaceText = node.data?.replaceText || '';
  let result: string;
  try {
    result = sourceContent.split(findText).join(replaceText);
  } catch {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: '替换失败' } });
    return;
  }
  updateNode(nodeId, {
    content: sourceContent, status: 'completed',
    data: { ...node.data, output: result, error: undefined },
  });
  saveCurrentCanvas();
}

/** Execute a prompt-line node: split upstream text into lines and dispatch each to downstream. */
export async function executePromptLineNode(ctx: ExecutorContext): Promise<void> {
  const { node, nodeId, signal, resolveInputs, connectionsRef, updateNode, handleExecuteNode, saveCurrentCanvas } = ctx;
  const inputs = resolveInputs(nodeId);
  const upstreamText = inputs.texts.join('\n').trim();
  const sourceContent = upstreamText || node.content || '';
  const lines = sourceContent.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: '无有效行' } });
    return;
  }
  updateNode(nodeId, { content: sourceContent });
  const downstreamConns = connectionsRef.current.filter(c => c.fromNode === nodeId);
  const STAGGER_DELAY_MS = 2000;
  const allTasks: Promise<void>[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (signal.aborted) return;
    const line = lines[i];
    updateNode(nodeId, {
      content: sourceContent,
      data: { ...node.data, output: line, lineIndex: i + 1, cascadeProgress: `${i + 1}/${lines.length}` },
    });
    for (const conn of downstreamConns) {
      if (signal.aborted) return;
      allTasks.push(handleExecuteNode(conn.toNode, 1));
    }
    if (i < lines.length - 1 && !signal.aborted) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, STAGGER_DELAY_MS);
        signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
  }
  try { await Promise.all(allTasks); } catch (err) { console.warn('[PromptLine] 部分下游任务失败:', err); }
  updateNode(nodeId, {
    content: sourceContent, status: 'completed',
    data: { ...node.data, output: lines[lines.length - 1], lineIndex: lines.length, error: undefined },
  });
  saveCurrentCanvas();
}
