/**
 * ModelContext — 全局模型状态管理
 * 所有页面共享：已选模型列表 + 当前激活模型
 * 持久化到 localStorage key: yuli_selected_models
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ModelInfo, ModelCategory } from '../types';
import { getOrFetchModels, getModelsByCategory, clearModelCache } from '../services/modelService';

// ========== 存储结构 ==========

interface ModelState {
  imageModels: string[];   // 图像模型 ID 列表
  chatModels: string[];    // 聊天模型 ID 列表
  videoModels: string[];   // 视频模型 ID 列表
  activeImageModel: string;
  activeChatModel: string;
  activeVideoModel: string;
}

interface ModelContextValue extends ModelState {
  // 模型详情（从 API 拉取的全部模型）
  allModels: ModelInfo[];

  // 设置当前激活的模型
  setActiveImageModel: (id: string) => void;
  setActiveChatModel: (id: string) => void;
  setActiveVideoModel: (id: string) => void;

  // 管理已选模型列表
  setSelectedModels: (category: ModelCategory, ids: string[]) => void;
  addSelectedModel: (category: ModelCategory, id: string) => void;
  removeSelectedModel: (category: ModelCategory, id: string) => void;

  // 刷新模型列表（从 API 重新拉取）
  refreshModels: (baseUrl: string, apiKey: string) => Promise<void>;

  // 直接设置 allModels（设置页拉取后同步，避免重复请求）
  setAllModelsDirect: (models: ModelInfo[]) => void;

  // 是否已配置 API
  isConfigured: boolean;
}

// ========== 默认值 ==========

const STORAGE_KEY = 'yuli_selected_models';

const DEFAULT_STATE: ModelState = {
  imageModels: ['gpt-image-2'],
  chatModels: ['gemini-2.5-pro'],
  videoModels: ['sora-2'],
  activeImageModel: 'gpt-image-2',
  activeChatModel: 'gemini-2.5-pro',
  activeVideoModel: 'sora-2',
};

function loadState(): ModelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...saved };
    }
  } catch {}
  return DEFAULT_STATE;
}

function saveState(state: ModelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ========== Context ==========

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelState>(loadState);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);

  // 启动时恢复缓存的模型列表（避免画布下拉只显示默认模型）
  useEffect(() => {
    try {
      const raw = localStorage.getItem('yuli_model_cache');
      if (raw) {
        const cache = JSON.parse(raw);
        if (cache.models && cache.models.length > 0) {
          setAllModels(cache.models);
        }
      }
    } catch {}
  }, []);

  // 持久化
  useEffect(() => {
    saveState(state);
  }, [state]);

  const isConfigured = state.imageModels.length > 0 || state.chatModels.length > 0;

  // 设置激活模型
  const setActiveImageModel = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeImageModel: id }));
  }, []);
  const setActiveChatModel = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeChatModel: id }));
  }, []);
  const setActiveVideoModel = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeVideoModel: id }));
  }, []);

  // 管理已选模型列表
  const setSelectedModels = useCallback((category: ModelCategory, ids: string[]) => {
    setState(prev => {
      const next = { ...prev };
      switch (category) {
        case 'image': next.imageModels = ids; break;
        case 'chat': next.chatModels = ids; break;
        case 'video': next.videoModels = ids; break;
      }
      // 如果当前激活的模型不在新列表中，切换到第一个
      if (category === 'image' && !ids.includes(prev.activeImageModel) && ids.length > 0) {
        next.activeImageModel = ids[0];
      }
      if (category === 'chat' && !ids.includes(prev.activeChatModel) && ids.length > 0) {
        next.activeChatModel = ids[0];
      }
      if (category === 'video' && !ids.includes(prev.activeVideoModel) && ids.length > 0) {
        next.activeVideoModel = ids[0];
      }
      return next;
    });
  }, []);

  const addSelectedModel = useCallback((category: ModelCategory, id: string) => {
    setState(prev => {
      const key = category === 'image' ? 'imageModels' : category === 'chat' ? 'chatModels' : 'videoModels';
      if (prev[key].includes(id)) return prev;
      return { ...prev, [key]: [...prev[key], id] };
    });
  }, []);

  const removeSelectedModel = useCallback((category: ModelCategory, id: string) => {
    setState(prev => {
      const key = category === 'image' ? 'imageModels' : category === 'chat' ? 'chatModels' : 'videoModels';
      return { ...prev, [key]: prev[key].filter(m => m !== id) };
    });
  }, []);

  // 刷新模型
  const refreshModels = useCallback(async (baseUrl: string, apiKey: string) => {
    const models = await getOrFetchModels(baseUrl, apiKey);
    setAllModels(models);
  }, []);

  // 直接设置 allModels（设置页拉取后同步，避免重复请求 API）
  const setAllModelsDirect = useCallback((models: ModelInfo[]) => {
    setAllModels(models);
  }, []);

  return (
    <ModelContext.Provider
      value={{
        ...state,
        allModels,
        setActiveImageModel,
        setActiveChatModel,
        setActiveVideoModel,
        setSelectedModels,
        addSelectedModel,
        removeSelectedModel,
        refreshModels,
        setAllModelsDirect,
        isConfigured,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

// ========== Hook ==========

export function useModelContext() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModelContext must be used within ModelProvider');
  return ctx;
}

export default ModelContext;
