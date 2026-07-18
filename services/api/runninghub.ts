// RunningHub API 服务
import { post, get } from './index';

// ============================================
// 类型定义
// ============================================

// 节点信息
export interface RHNodeInfo {
    nodeId: string;
    fieldName: string;
    fieldValue: string;
}

// 任务创建响应
export interface RHTaskCreateResponse {
    netWssUrl?: string;
    taskId: string;
    clientId?: string;
    taskStatus: 'CREATE' | 'SUCCESS' | 'FAILED' | 'RUNNING' | 'QUEUED';
    promptTips?: string;
}

// 任务输出
export interface RHTaskOutput {
    fileUrl: string;
    fileType: string;
    taskCostTime: string;
    nodeId: string;
    consumeCoins: string;
}

// RunningHub 配置
export interface RHConfig {
    consumerConfigured: boolean;
    enterpriseConfigured: boolean;
}

// ============================================
// API 调用
// ============================================

/**
 * 获取 RunningHub 配置
 */
export const getRunningHubConfig = async (): Promise<{
    success: boolean;
    data?: RHConfig;
    error?: string;
}> => {
    return get<RHConfig>('/runninghub/config');
};

/**
 * 保存 RunningHub API Key（消费级 + 企业级）
 */
export const saveRunningHubConfig = async (consumerKey: string, enterpriseKey: string): Promise<{
    success: boolean;
    data?: { consumerConfigured: boolean; enterpriseConfigured: boolean };
    error?: string;
}> => {
    return post('/runninghub/config', { consumerKey, enterpriseKey });
};

/**
 * 获取 AI 应用信息
 * 包括 nodeInfoList、应用名称、封面等
 */
export const getAIAppInfo = async (webappId: string, keyType?: string): Promise<{
    success: boolean;
    data?: RHAIAppInfo;
    error?: string;
}> => {
    return post('/runninghub/ai-app/info', { webappId, keyType: keyType || 'consumer' });
};

/**
 * 创建任务
 */
export const createRunningHubTask = async (
    workflowId: string,
    nodeInfoList?: RHNodeInfo[],
    cost?: number
): Promise<{
    success: boolean;
    data?: RHTaskCreateResponse;
    coinsDeducted?: number;
    error?: string;
}> => {
    return post<RHTaskCreateResponse>('/runninghub/create', {
        workflowId,
        nodeInfoList,
        cost
    });
};

/**
 * 查询任务状态
 */
export const queryRunningHubStatus = async (
    taskId: string
): Promise<{
    success: boolean;
    status?: string;
    error?: string;
}> => {
    return post('/runninghub/status', { taskId });
};

/**
 * 查询任务输出
 */
export const queryRunningHubOutputs = async (
    taskId: string,
    keyType?: string
): Promise<{
    success: boolean;
    data?: RHTaskOutput[];
    status?: 'RUNNING' | 'QUEUED' | 'FAILED' | 'SUCCESS';
    error?: string;
    failedReason?: any;
}> => {
    return post('/runninghub/outputs', { taskId, keyType: keyType || 'consumer' });
};

/**
 * 上传文件到 RunningHub
 */
export const uploadToRunningHub = async (
    file: File,
    keyType?: string
): Promise<{
    success: boolean;
    fileName?: string;
    error?: string;
}> => {
    const formData = new FormData();
    formData.append('file', file);
    if (keyType) {
        formData.append('keyType', keyType);
    }

    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/runninghub/upload', {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
    });

    return response.json();
};

/**
 * 上传图片到 RunningHub（base64）
 * 返回 fileKey 用于作为 fieldValue
 */
export const uploadImage = async (
    base64Data: string,
    keyType?: string
): Promise<{
    success: boolean;
    data?: {
        fileKey: string;
        fileName?: string;
    };
    error?: string;
}> => {
    return post('/runninghub/upload-image', { image: base64Data, keyType: keyType || 'consumer' });
};

/**
 * 一站式生成：创建任务并等待结果
 */
export const generateWithRunningHub = async (
    workflowId: string,
    nodeInfoList?: RHNodeInfo[],
    cost?: number
): Promise<{
    success: boolean;
    data?: {
        taskId: string;
        outputs: RHTaskOutput[];
    };
    coinsDeducted?: number;
    error?: string;
    failedReason?: any;
}> => {
    return post('/runninghub/generate', {
        workflowId,
        nodeInfoList,
        cost,
        maxAttempts: 60,
        interval: 3000
    });
};

/**
 * 等待任务完成
 */
export const waitForRunningHubResult = async (
    taskId: string
): Promise<{
    success: boolean;
    data?: RHTaskOutput[];
    error?: string;
}> => {
    return post('/runninghub/wait', {
        taskId,
        maxAttempts: 60,
        interval: 3000
    });
};

// ============================================
// AI 应用 (webappId) 相关
// ============================================

// AI 应用节点信息
export interface RHAIAppNodeInfo {
    nodeId: string;
    fieldName: string;
    fieldValue: string;
    description?: string;
}

// AI 应用节点信息（详细）
export interface RHAIAppNodeInfoItem {
    nodeId: string;
    nodeName: string;
    fieldName: string;
    fieldValue: string;
    fieldData?: string;
    fieldType: string; // 'IMAGE' | 'STRING' | 'LIST' | 'AUDIO' | 'VIDEO'
    description: string;
    descriptionEn?: string;
}

// AI 应用封面
export interface RHAIAppCover {
    id: string;
    url: string;
    thumbnailUri: string;
    imageWidth?: string;
    imageHeight?: string;
}

// AI 应用信息
export interface RHAIAppInfo {
    webappName: string;
    nodeInfoList: RHAIAppNodeInfoItem[];
    covers: RHAIAppCover[];
    tags?: Array<{ id: string; name: string; nameEn?: string }>;
    statisticsInfo?: {
        likeCount: string;
        downloadCount: string;
        useCount: string;
        pv: string;
        collectCount: string;
    };
    curl?: string;
}

/**
 * 运行 AI 应用并等待结果
 * 调用一站式 /generate 接口，自动轮询等待结果
 */
export const runAIApp = async (
    webappId: string,
    nodeInfoList: RHAIAppNodeInfo[],
    cost?: number,
    keyType: string = 'consumer',
    instanceType?: string,
): Promise<{
    success: boolean;
    data?: {
        taskId: string;
        outputs: RHTaskOutput[];
    };
    coinsDeducted?: number;
    error?: string;
    failedReason?: any;
    taskId?: string;
}> => {
    // 使用一站式 /generate 接口，包含发起任务和轮询等待结果
    return post('/runninghub/generate', {
        webappId,
        nodeInfoList,
        cost,
        keyType,
        instanceType,
        maxAttempts: 720,  // 最多等待 60 分钟 (720 * 5s)
        interval: 5000     // 每 5 秒查询一次
    });
};

/**
 * 提交 ComfyUI 工作流任务（一站式：创建 + 轮询）
 * 来源: 灵感魔盒 api/rh.py submit_workflow()
 */
export const submitWorkflow = async (
    workflowId: string,
    nodeInfoList: RHNodeInfo[],
    instanceType: string = 'default',
    keyType: string = 'consumer',
): Promise<{
    success: boolean;
    data?: { taskId: string; outputs: RHTaskOutput[] };
    error?: string;
    failedReason?: any;
    taskId?: string;
}> => {
    return post('/runninghub/workflow/generate', {
        workflowId,
        nodeInfoList,
        instanceType,
        keyType,
        maxAttempts: 720,   // 最多等待 60 分钟 (720 * 5s)
        interval: 5000,
    });
};
