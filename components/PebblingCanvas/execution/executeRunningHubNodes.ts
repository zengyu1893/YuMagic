import { CanvasNode, Connection } from '../../../types/pebblingTypes';
import { ExecutorContext } from './executorTypes';
import { runAIApp, getAIAppInfo } from '../../../services/api/runninghub';
import { downloadRemoteToOutput } from '../../../services/api/files';
import { extractImageMetadata } from '../apiAdapters';

/**
 * Execute rh-config or runninghub node.
 * Handles manual runninghub (fetch app info) and preset rh-config (validate, upload media, enqueue).
 */
export async function executeRunningHubConfigNode(ctx: ExecutorContext, batchCount: number): Promise<void> {
  const { node, nodeId, signal, connectionsRef, nodesRef, updateNode, setHasUnsavedChanges, getOrCreateOutputNode, resolveOutputPending, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName, rhTaskQueue } = ctx;
  const isWorkflowMode = node.data?.mode === 'workflow';
  const webappId = node.data?.webappId || '';
  const workflowId = node.data?.workflowId || '';
  const appInfo = node.data?.appInfo;
  const nodeInputs = { ...(node.data?.nodeInputs || {}) };
  const wfKeyType = node.data?.keyType || 'consumer';
  const wfInstanceType = node.data?.instanceType || 'default';
  const wfNodeList = node.data?.workflowNodeList || [];
  const isRunningHub = node.type === 'runninghub';

  // Manual runninghub: fetch app info if missing
  if (isRunningHub && !isWorkflowMode && !appInfo && webappId) {
    updateNode(nodeId, { data: { ...node.data, error: undefined } });
    try {
      const appInfoResult = await getAIAppInfo(webappId, wfKeyType);
      if (!appInfoResult.success || !appInfoResult.data) throw new Error(appInfoResult.error || '获取应用信息失败');
      const info = appInfoResult.data;
      const paramCount = info.nodeInfoList?.length || 0;
      const totalH = 32 + 200 + 48 + 40 + 16 + paramCount * 60 + 16;
      const defaultInputs: Record<string, string> = {};
      info.nodeInfoList?.forEach((field: any) => {
        const k = `${field.nodeId}_${field.fieldName}`;
        const ft = (field.fieldType || '').toUpperCase();
        defaultInputs[k] = ['IMAGE', 'VIDEO', 'AUDIO'].includes(ft) ? '' : (field.fieldValue || '');
      });
      updateNode(nodeId, {
        status: 'idle', height: totalH,
        data: { ...node.data, mode: 'app', webappId, appInfo: info, nodeInputs: defaultInputs, coverUrl: info.covers?.[0]?.url || info.covers?.[0]?.thumbnailUri, workflowId: '', workflowNodeList: [], error: undefined },
      });
      saveCurrentCanvas();
    } catch (err: any) {
      updateNode(nodeId, { status: 'error', data: { ...node.data, error: err.message || '获取应用信息失败' } });
    }
    return;
  }

  // Validation
  if (!isWorkflowMode && (!webappId || !appInfo)) { updateNode(nodeId, { data: { ...node.data, error: '缺少应用配置' } }); return; }
  if (isWorkflowMode && !workflowId) { updateNode(nodeId, { data: { ...node.data, error: '缺少工作流 ID' } }); return; }

  try {
    const appName = isWorkflowMode ? (node.title || '工作流') : ((appInfo as any)?.webappName || appInfo?.title || webappId);
    let nodeInfoList: any[];
    if (isWorkflowMode) {
      nodeInfoList = wfNodeList.map((e: any) => ({ nodeId: e.nodeId, fieldName: e.fieldName, fieldValue: e.fieldValue || '' }));
    } else {
      nodeInfoList = appInfo!.nodeInfoList?.map((info: any) => {
        const key = `${info.nodeId}_${info.fieldName}`;
        const hasUserValue = key in nodeInputs;
        return { nodeId: info.nodeId, fieldName: info.fieldName, fieldValue: hasUserValue ? (nodeInputs[key] || '') : (info.fieldValue || '') };
      }) || [];
    }

    // Validate file-type fields
    if (!isWorkflowMode && appInfo?.nodeInfoList) {
      const emptyFileFields = nodeInfoList.filter((info: any) => {
        const fieldDef = appInfo.nodeInfoList.find((n: any) => n.nodeId === info.nodeId && n.fieldName === info.fieldName);
        const ft = (fieldDef?.fieldType || '').toUpperCase();
        return ['IMAGE', 'VIDEO', 'AUDIO'].includes(ft) && !info.fieldValue;
      });
      if (emptyFileFields.length > 0) {
        const names = emptyFileFields.map((f: any) => `${f.fieldName}(node ${f.nodeId})`).join('、');
        updateNode(nodeId, { status: 'error', data: { ...node.data, error: `请先上传: ${names}` } });
        return;
      }
    }

    // Collect media uploads from incoming connections
    const currentConnections = connectionsRef.current;
    const incomingImageConns = currentConnections.filter(c => c.toNode === nodeId && c.toPortKey && c.toPortKey !== 'cover');
    const pendingImageUploads: Array<{ portKey: string; imageData: string }> = [];
    for (const conn of incomingImageConns) {
      const sourceNode = nodesRef.current.find(n => n.id === conn.fromNode);
      if (!sourceNode?.content) continue;
      const hasMediaContent = sourceNode.content.startsWith('data:image') || sourceNode.content.startsWith('data:audio') || sourceNode.content.startsWith('data:video') || sourceNode.content.startsWith('http') || sourceNode.content.startsWith('/files/');
      if (!hasMediaContent) continue;
      const portKey = conn.toPortKey!;
      if (nodeInputs[portKey] && nodeInputs[portKey].length > 10) continue;
      let imageData = sourceNode.content;
      const isAudioOrVideo = imageData.startsWith('data:audio') || imageData.startsWith('data:video');
      if (!isAudioOrVideo && (imageData.startsWith('/files/') || imageData.startsWith('http'))) {
        const img = new Image(); img.crossOrigin = 'anonymous';
        try {
          imageData = await new Promise<string>((resolve, reject) => {
            img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = imageData.startsWith('/files/') ? `http://localhost:8765${imageData}` : imageData;
          });
        } catch (err) { continue; }
      }
      pendingImageUploads.push({ portKey, imageData });
    }

    // Create output nodes
    const outputNodes: { id: string; pendingIdx: number; batchIndex: number }[] = [];
    for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
      const { node: outNode, pendingIdx } = getOrCreateOutputNode(nodeId);
      outputNodes.push({ id: outNode.id, pendingIdx, batchIndex: batchIdx });
    }
    setHasUnsavedChanges(true);

    // Enqueue to rhTaskQueue
    rhTaskQueue.enqueueTask({
      nodeId, canvasId: currentCanvasId || undefined, title: appName,
      webappId: webappId || workflowId, nodeInfoList, batchCount,
      pendingImageUploads: pendingImageUploads.length > 0 ? pendingImageUploads : undefined,
      mode: isWorkflowMode ? 'workflow' : 'app', workflowId: workflowId || undefined,
      keyType: wfKeyType, instanceType: wfInstanceType,
      onNodeInputsUpdate: (nid: string, updates: Record<string, string>) => {
        const targetNode = nodesRef.current.find(n => n.id === nid);
        if (targetNode) {
          const currentInputs = targetNode.data?.nodeInputs || {};
          updateNode(nid, { data: { ...targetNode.data, nodeInputs: { ...currentInputs, ...updates } } });
        }
      },
      onTaskComplete: async (taskId: string, batchIndex: number, result: any, status: string) => {
        const outputNode = outputNodes.find(o => o.batchIndex === batchIndex);
        if (!outputNode) return;
        if (result.outputs?.length) {
          const output = result.outputs[0];
          const remoteUrl = output.fileUrl;
          let localUrl = remoteUrl;
          try {
            const dlResult = await downloadRemoteToOutput(remoteUrl, `rh_${Date.now()}_${batchIndex}.png`);
            if (dlResult.success && dlResult.data?.url) localUrl = dlResult.data.url;
          } catch (err) {}
          resolveOutputPending(outputNode.id, outputNode.pendingIdx, localUrl);
          if (output.fileType !== 'video' && onImageGenerated) onImageGenerated(localUrl, `RunningHub: ${appName}`, currentCanvasId || undefined, canvasName);
        }
      },
      onTaskError: (taskId: string, batchIndex: number, error: string, status: string) => {
        const outputNode = outputNodes.find(o => o.batchIndex === batchIndex);
        if (outputNode) updateNode(outputNode.id, { status: 'error' });
      },
      onAllTasksDone: (nid: string, status: { failedCount: number }) => {
        updateNode(nid, { status: status.failedCount > 0 ? 'error' : 'completed' });
        saveCurrentCanvas();
      },
    });
  } catch (err: any) {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: err.message || '入队异常' } });
  }
}

/**
 * Execute rh-main node. Collects params from linked rh-param nodes and runs the AI app directly.
 */
export async function executeRHMainNode(ctx: ExecutorContext, batchCount: number): Promise<void> {
  const { node, nodeId, signal, connectionsRef, nodesRef, updateNode, uuid, setNodes, setConnections, setHasUnsavedChanges, saveCurrentCanvas, onImageGenerated, currentCanvasId, canvasName } = ctx;
  const webappId = node.data?.webappId;
  const appInfo = node.data?.appInfo;
  const mainNodeId = node.id;
  const wfKeyType = node.data?.keyType || 'consumer';
  const wfInstanceType = node.data?.instanceType || 'default';

  if (!webappId || !appInfo) { updateNode(nodeId, { data: { ...node.data, error: '缺少应用配置' } }); return; }

  try {
    const appName = (appInfo as any).webappName || appInfo.title || webappId;
    const currentNodes = nodesRef.current;
    const paramNodes = currentNodes.filter(n => n.type === 'rh-param' && n.data?.rhParentNodeId === mainNodeId);

    const nodeInfoList = appInfo.nodeInfoList?.map((info: any) => {
      const key = `${info.nodeId}_${info.fieldName}`;
      const paramNode = paramNodes.find(pn => pn.data?.rhParamInfo?.nodeId === info.nodeId && pn.data?.rhParamInfo?.fieldName === info.fieldName);
      const inputs = paramNode?.data?.nodeInputs || {};
      const userValue = inputs[key];
      return { nodeId: info.nodeId, fieldName: info.fieldName, fieldValue: userValue !== undefined ? (userValue || '') : (info.fieldValue || '') };
    }) || [];

    let lastParamNode = paramNodes[paramNodes.length - 1];
    const outputBaseY = lastParamNode ? lastParamNode.y + lastParamNode.height + 50 : node.y + node.height + 50;

    for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
      if (signal.aborted) return;
      const outputNodeId = uuid();
      const outputNode: CanvasNode = { id: outputNodeId, type: 'output', content: '', x: node.x, y: outputBaseY + batchIdx * 420, width: 300, height: 300, data: {}, status: 'running' };
      const fromNodeId = lastParamNode ? lastParamNode.id : nodeId;
      const newConnection: Connection = { id: uuid(), fromNode: fromNodeId, toNode: outputNodeId };
      nodesRef.current = [...nodesRef.current, outputNode];
      connectionsRef.current = [...connectionsRef.current, newConnection];
      setNodes(prev => [...prev, outputNode]);
      setConnections(prev => [...prev, newConnection]);
      setHasUnsavedChanges(true);

      const result = await runAIApp(webappId, nodeInfoList, undefined, wfKeyType, wfInstanceType);
      if (signal.aborted) return;
      if (result.success && result.data?.outputs?.length) {
        const output = result.data.outputs[0];
        const remoteUrl = output.fileUrl;
        let localUrl = remoteUrl;
        try {
          const dlResult = await downloadRemoteToOutput(remoteUrl, `rh_main_${Date.now()}_${batchIdx}.png`);
          if (dlResult.success && dlResult.data?.url) localUrl = dlResult.data.url;
        } catch (err) {}
        const metadata = await extractImageMetadata(localUrl);
        updateNode(outputNodeId, { content: localUrl, data: { imageMetadata: metadata }, status: 'completed' });
        if (output.fileType !== 'video' && onImageGenerated) onImageGenerated(localUrl, `RunningHub: ${appName}`, currentCanvasId || undefined, canvasName);
      } else {
        const errorMsg = (result.error || '执行失败') + (result.taskId ? ` [taskId: ${result.taskId}]` : '');
        updateNode(outputNodeId, { status: 'error', data: { error: errorMsg } });
      }
    }
    saveCurrentCanvas();
  } catch (err: any) {
    updateNode(nodeId, { status: 'error', data: { ...node.data, error: err.message || '执行异常' } });
  }
}
