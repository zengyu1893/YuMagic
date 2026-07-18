/**
 * RunningHub API 代理路由
 * 代理前端请求到 RunningHub 平台
 */
const express = require('express');
const config = require('../config');
const JsonStorage = require('../utils/jsonStorage');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// RunningHub API 基础地址
const RH_BASE_URL = 'https://www.runninghub.cn';

// 文件上传配置
const upload = multer({
    dest: path.join(config.DATA_DIR, 'rh_uploads'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ============================================
// 辅助函数
// ============================================

/**
 * 获取存储的 RunningHub API Key
 */
function getApiKey() {
    const settings = JsonStorage.load(config.SETTINGS_FILE, {});
    return settings.runningHubApiKey || '';
}

function getEnterpriseApiKey() {
    const settings = JsonStorage.load(config.SETTINGS_FILE, {});
    return settings.runningHubEnterpriseApiKey || '';
}

/**
 * 设置 RunningHub API Key
 */
function setApiKey(apiKey) {
    const settings = JsonStorage.load(config.SETTINGS_FILE, {});
    settings.runningHubApiKey = apiKey;
    JsonStorage.save(config.SETTINGS_FILE, settings);
}

/**
 * 代理请求到 RunningHub
 */
async function proxyToRH(endpoint, method, body, headers = {}) {
    const url = `${RH_BASE_URL}${endpoint}`;
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('未配置 RunningHub API Key');
    }
    
    // 在 body 中注入 apiKey
    const requestBody = body ? { ...body, apiKey } : { apiKey };
    
    const response = await fetch(url, {
        method,
        headers: {
            'Host': 'www.runninghub.cn',
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(requestBody)
    });
    
    return response.json();
}

// ============================================
// API 路由
// ============================================

/**
 * GET /config - 获取 RunningHub 配置状态
 */
router.get('/config', (req, res) => {
    try {
        const consumerKey = getApiKey();
        const enterpriseKey = getEnterpriseApiKey();
        res.json({
            success: true,
            data: {
                consumerConfigured: !!consumerKey,
                enterpriseConfigured: !!enterpriseKey,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /config - 保存 RunningHub API Key（消费级 + 企业级）
 */
router.post('/config', (req, res) => {
    try {
        const { consumerKey, enterpriseKey } = req.body;
        const settings = JsonStorage.load(config.SETTINGS_FILE, {});
        // 只在提供了有效值时才更新，防止空字符串或掩码覆盖已有密钥
        if (consumerKey && consumerKey !== '••••••••') {
            settings.runningHubApiKey = consumerKey;
        }
        if (enterpriseKey && enterpriseKey !== '••••••••') {
            settings.runningHubEnterpriseApiKey = enterpriseKey;
        }
        JsonStorage.save(config.SETTINGS_FILE, settings);
        res.json({
            success: true,
            data: {
                consumerConfigured: !!settings.runningHubApiKey,
                enterpriseConfigured: !!settings.runningHubEnterpriseApiKey,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /ai-app/info - 获取 AI 应用信息
 * 获取 nodeInfoList、应用名称、封面等
 */
router.post('/ai-app/info', async (req, res) => {
    try {
        const { webappId, keyType } = req.body;
        if (!webappId) {
            return res.status(400).json({ success: false, error: '缺少 webappId 参数' });
        }

        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        // 使用 GET 请求获取 AI 应用信息
        const url = `${RH_BASE_URL}/api/webapp/apiCallDemo?apiKey=${encodeURIComponent(apiKey)}&webappId=${encodeURIComponent(webappId)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Host': 'www.runninghub.cn'
            }
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.json({
                success: false,
                error: result.msg || '获取 AI 应用信息失败',
                code: result.code
            });
        }
    } catch (error) {
        console.error('获取 AI 应用信息失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /upload - 上传文件到 RunningHub
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const keyType = req.body.keyType || 'consumer';
        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: '未上传文件' });
        }
        
        // 读取文件
        const filePath = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);
        
        // 构建 FormData
        const formData = new FormData();
        formData.append('apiKey', apiKey);
        formData.append('fileType', 'input');
        formData.append('file', fileBuffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        // 上传到 RunningHub
        const response = await fetch(`${RH_BASE_URL}/task/openapi/upload`, {
            method: 'POST',
            headers: {
                'Host': 'www.runninghub.cn',
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const result = await response.json();
        
        // 清理临时文件
        fs.unlinkSync(filePath);
        
        if (result.code === 0) {
            res.json({
                success: true,
                fileName: result.data?.fileName,
                fileType: result.data?.fileType
            });
        } else {
            res.json({
                success: false,
                error: result.msg || '文件上传失败'
            });
        }
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /upload-image - 上传 base64 图片到 RunningHub
 */
router.post('/upload-image', async (req, res) => {
    try {
        const keyType = req.body.keyType || 'consumer';
        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ success: false, error: '缺少图片数据' });
        }
        
        // 解析 base64 数据
        let base64Data = image;
        let mimeType = 'image/png';
        let extension = '.png';
        
        if (image.startsWith('data:')) {
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                base64Data = matches[2];
                
                // 根据 MIME 类型确定扩展名
                if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                    extension = '.jpg';
                } else if (mimeType.includes('png')) {
                    extension = '.png';
                } else if (mimeType.includes('gif')) {
                    extension = '.gif';
                } else if (mimeType.includes('webp')) {
                    extension = '.webp';
                }
            }
        }
        
        // 将 base64 转换为 Buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileName = `upload_${Date.now()}${extension}`;
        
        // 构建 FormData
        const formData = new FormData();
        formData.append('apiKey', apiKey);
        formData.append('fileType', 'input');
        formData.append('file', imageBuffer, {
            filename: fileName,
            contentType: mimeType
        });
        
        // 上传到 RunningHub
        const response = await fetch(`${RH_BASE_URL}/task/openapi/upload`, {
            method: 'POST',
            headers: {
                'Host': 'www.runninghub.cn',
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            res.json({
                success: true,
                data: {
                    fileKey: result.data?.fileName,
                    fileName: result.data?.fileName,
                    fileType: result.data?.fileType
                }
            });
        } else {
            res.json({
                success: false,
                error: result.msg || '图片上传失败'
            });
        }
    } catch (error) {
        console.error('图片上传失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /ai-app/run - 发起 AI 应用任务
 */
router.post('/ai-app/run', async (req, res) => {
    try {
        const { webappId, nodeInfoList, webhookUrl, instanceType, keyType } = req.body;

        if (!webappId) {
            return res.status(400).json({ success: false, error: '缺少 webappId 参数' });
        }

        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        const requestBody = {
            apiKey,
            webappId,
            nodeInfoList: nodeInfoList || []
        };
        
        if (webhookUrl) requestBody.webhookUrl = webhookUrl;
        if (instanceType) requestBody.instanceType = instanceType;
        
        const response = await fetch(`${RH_BASE_URL}/task/openapi/ai-app/run`, {
            method: 'POST',
            headers: {
                'Host': 'www.runninghub.cn',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.json({
                success: false,
                error: result.msg || '发起任务失败',
                code: result.code
            });
        }
    } catch (error) {
        console.error('发起 AI 应用任务失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /outputs - 查询任务输出结果
 */
router.post('/outputs', async (req, res) => {
    try {
        const { taskId, keyType } = req.body;

        if (!taskId) {
            return res.status(400).json({ success: false, error: '缺少 taskId 参数' });
        }

        const apiKey = getKeyByType(keyType || 'consumer');
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        const response = await fetch(`${RH_BASE_URL}/task/openapi/outputs`, {
            method: 'POST',
            headers: {
                'Host': 'www.runninghub.cn',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey, taskId })
        });

        const result = await response.json();

        // 根据 code 返回不同状态
        // code 0 = 成功, code 804 = 运行中, code 813 = 排队中, code 805 = 失败
        if (result.code === 0) {
            res.json({
                success: true,
                status: 'SUCCESS',
                data: result.data
            });
        } else if (result.code === 804) {
            res.json({
                success: true,
                status: 'RUNNING',
                data: result.data
            });
        } else if (result.code === 813) {
            res.json({
                success: true,
                status: 'QUEUED',
                data: null
            });
        } else if (result.code === 805) {
            const fr = result.data?.failedReason;
            if (fr) {
                console.error('[RH] 任务失败详情:', JSON.stringify(fr, null, 2));
            }
            res.json({
                success: false,
                status: 'FAILED',
                error: result.msg || '任务失败',
                failedReason: fr
            });
        } else {
            res.json({
                success: false,
                error: result.msg || '查询失败',
                code: result.code
            });
        }
    } catch (error) {
        console.error('查询任务输出失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /generate - 一站式生成：发起任务并轮询等待结果
 */
router.post('/generate', async (req, res) => {
    try {
        const { webappId, nodeInfoList, maxAttempts = 720, interval = 5000, keyType, instanceType } = req.body;

        if (!webappId) {
            return res.status(400).json({ success: false, error: '缺少 webappId 参数' });
        }

        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }
        
        // 1. 发起任务
        const createResponse = await fetch(`${RH_BASE_URL}/task/openapi/ai-app/run`, {
            method: 'POST',
            headers: {
                'Host': 'www.runninghub.cn',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey,
                webappId,
                nodeInfoList: nodeInfoList || [],
                ...(instanceType ? { instanceType } : {})
            })
        });
        
        const createResult = await createResponse.json();
        
        if (createResult.code !== 0) {
            return res.json({
                success: false,
                error: createResult.msg || '发起任务失败'
            });
        }
        
        const taskId = createResult.data?.taskId;
        if (!taskId) {
            return res.json({
                success: false,
                error: '未获取到 taskId'
            });
        }
        
        // 2. 轮询等待结果
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, interval));

            const outputResponse = await fetch(`${RH_BASE_URL}/task/openapi/outputs`, {
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey, taskId })
            });

            const outputResult = await outputResponse.json();

            if (outputResult.code === 0 && Array.isArray(outputResult.data) && outputResult.data.length > 0) {
                // 成功获取结果
                return res.json({
                    success: true,
                    data: {
                        taskId,
                        outputs: outputResult.data
                    }
                });
            } else if (outputResult.code === 805) {
                // 任务失败
                const fr2 = outputResult.data?.failedReason;
                if (fr2) {
                    console.error('[RH] 一站式生成任务失败详情:', JSON.stringify(fr2, null, 2));
                }
                return res.json({
                    success: false,
                    error: outputResult.msg || '任务执行失败',
                    failedReason: fr2
                });
            }
            // 其他状态（运行中、排队中）继续轮询
        }
        
        // 超时
        res.json({
            success: false,
            error: '等待超时（60分钟），任务可能仍在运行中',
            taskId
        });
        
    } catch (error) {
        console.error('一站式生成失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 根据 keyType 获取对应的 API Key
 */
function getKeyByType(keyType) {
    if (keyType === 'enterprise') {
        return getEnterpriseApiKey();
    }
    return getApiKey();
}

/**
 * POST /workflow/create — 创建 ComfyUI 工作流任务
 * 来源: 灵感魔盒 api/rh.py submit_workflow()
 */
router.post('/workflow/create', async (req, res) => {
    try {
        const { workflowId, nodeInfoList, instanceType, keyType } = req.body;
        if (!workflowId) {
            return res.status(400).json({ success: false, error: '缺少 workflowId 参数' });
        }
        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }

        const body = {
            apiKey,
            workflowId,
            nodeInfoList: nodeInfoList || [],
            instanceType: instanceType || 'default',
        };

        console.log(`[RH工作流] POST /task/openapi/create (workflowId=${workflowId}, instanceType=${instanceType || 'default'}, keyType=${keyType || 'consumer'})`);

        const response = await fetch(`${RH_BASE_URL}/task/openapi/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            timeout: 60000,
        });

        const result = await response.json();
        if (result.code !== 0) {
            return res.json({ success: false, error: result.msg || '创建任务失败', code: result.code });
        }

        const data = result.data || {};
        const taskId = typeof data === 'string' ? data : data.taskId;
        if (!taskId) {
            return res.json({ success: false, error: '未获取到 taskId' });
        }

        res.json({ success: true, data: { taskId } });

    } catch (error) {
        console.error('[RH工作流] 创建失败:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /workflow/outputs — 查询工作流任务输出
 */
router.post('/workflow/outputs', async (req, res) => {
    try {
        const { taskId, keyType } = req.body;
        if (!taskId) {
            return res.status(400).json({ success: false, error: '缺少 taskId 参数' });
        }
        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }

        const response = await fetch(`${RH_BASE_URL}/task/openapi/outputs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, taskId }),
            timeout: 30000,
        });

        const result = await response.json();

        if (result.code === 0 && Array.isArray(result.data) && result.data.length > 0) {
            res.json({ success: true, status: 'SUCCESS', data: { taskId, outputs: result.data } });
        } else if (result.code === 804) {
            res.json({ success: true, status: 'RUNNING', data: null });
        } else if (result.code === 813) {
            res.json({ success: true, status: 'QUEUED', data: null });
        } else if (result.code === 805) {
            res.json({ success: false, status: 'FAILED', error: result.msg || '任务失败', failedReason: result.data?.failedReason });
        } else {
            res.json({ success: false, error: result.msg || '查询失败', code: result.code });
        }

    } catch (error) {
        console.error('[RH工作流] 查询输出失败:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /workflow/generate — 一站式工作流：创建 + 轮询 (最多 60 分钟)
 */
router.post('/workflow/generate', async (req, res) => {
    try {
        const { workflowId, nodeInfoList, instanceType, keyType, maxAttempts = 720, interval = 5000 } = req.body;

        if (!workflowId) {
            return res.status(400).json({ success: false, error: '缺少 workflowId 参数' });
        }

        const apiKey = getKeyByType(keyType);
        if (!apiKey) {
            return res.status(400).json({ success: false, error: '未配置 RunningHub API Key' });
        }

        // 1. 创建任务
        const createBody = {
            apiKey,
            workflowId,
            nodeInfoList: nodeInfoList || [],
            instanceType: instanceType || 'default',
        };

        console.log(`[RH工作流] 一站式 (workflowId=${workflowId}, keyType=${keyType || 'consumer'})`);

        const createResponse = await fetch(`${RH_BASE_URL}/task/openapi/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createBody),
            timeout: 60000,
        });

        const createResult = await createResponse.json();
        if (createResult.code !== 0) {
            return res.json({ success: false, error: createResult.msg || '创建任务失败', code: createResult.code });
        }

        const data = createResult.data || {};
        const taskId = typeof data === 'string' ? data : data.taskId;
        if (!taskId) {
            return res.json({ success: false, error: '未获取到 taskId' });
        }

        // 2. 轮询
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, interval));

            const outputResponse = await fetch(`${RH_BASE_URL}/task/openapi/outputs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, taskId }),
                timeout: 30000,
            });

            const outputResult = await outputResponse.json();

            if (outputResult.code === 0 && Array.isArray(outputResult.data) && outputResult.data.length > 0) {
                return res.json({ success: true, data: { taskId, outputs: outputResult.data } });
            } else if (outputResult.code === 805) {
                return res.json({ success: false, error: outputResult.msg || '任务执行失败', failedReason: outputResult.data?.failedReason });
            }
            // 804 (RUNNING) 或 813 (QUEUED) 继续轮询
        }

        res.json({ success: false, error: '等待超时（60分钟），任务可能仍在运行中', taskId });

    } catch (error) {
        console.error('[RH工作流] 一站式失败:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
