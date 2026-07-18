/**
 * ModelSelector — 可复用的模型下拉选择器
 * 根据 category 筛选模型，支持搜索和刷新
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronDown, Search } from 'lucide-react';
import { ModelInfo, ModelCategory } from '../types';
import { getOrFetchModels, getModelsByCategory, searchModels } from '../services/modelService';

interface ModelSelectorProps {
  baseUrl: string;
  apiKey: string;
  category: ModelCategory;
  currentModel: string;
  onSelect: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  baseUrl,
  apiKey,
  category,
  currentModel,
  onSelect,
  placeholder = '选择模型...',
  disabled = false,
  className = '',
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 拉取模型
  const loadModels = useCallback(async () => {
    if (!baseUrl || !apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const allModels = await getOrFetchModels(baseUrl, apiKey);
      setModels(getModelsByCategory(allModels, category));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, apiKey, category]);

  useEffect(() => {
    if (baseUrl && apiKey) {
      loadModels();
    }
  }, [baseUrl, apiKey, category, loadModels]);

  // 过滤搜索结果
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    return searchModels(models, searchQuery);
  }, [models, searchQuery]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => setIsOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isOpen]);

  const categoryLabel: Record<ModelCategory, string> = {
    image: '🖼️',
    chat: '📝',
    video: '🎬',
    audio: '🎵',
    embedding: '🔌',
    other: '📦',
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* 触发器 */}
      <div className="flex gap-1">
        <button
          type="button"
          disabled={disabled || !apiKey}
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-xs
                     hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={currentModel ? 'text-white' : 'text-gray-500'}>
            {categoryLabel[category]} {currentModel || placeholder}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 刷新按钮 */}
        <button
          type="button"
          disabled={disabled || !apiKey || isLoading}
          onClick={loadModels}
          className="px-2 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-xs text-gray-400
                     hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
          title="刷新模型列表"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
          {/* 搜索框 */}
          {models.length > 10 && (
            <div className="p-2 border-b border-gray-700">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 rounded">
                <Search className="w-3 h-3 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索模型..."
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-gray-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* 列表 */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {isLoading && (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                加载中...
              </div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button
                  onClick={loadModels}
                  className="ml-2 text-blue-400 hover:underline"
                >
                  重试
                </button>
              </div>
            )}

            {!isLoading && !error && filteredModels.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                {models.length === 0 ? '请先配置 API Key 后刷新' : '无匹配模型'}
              </div>
            )}

            {!isLoading &&
              !error &&
              filteredModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between
                    ${m.id === currentModel ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  <span className="truncate">{m.id}</span>
                  {m.id === currentModel && (
                    <span className="text-blue-400 text-[10px] ml-2 shrink-0">✓ 当前</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
