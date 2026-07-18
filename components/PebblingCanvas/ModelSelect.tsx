/**
 * ModelSelect — 画布节点模型选择下拉
 * 参照 Desktop 的 ModelQuickSelector：简洁、单类别、模型来自设置
 * 图像节点→图像模型，LLM节点→聊天模型，视频节点→视频模型
 */

import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import ModelContext from '../../contexts/ModelContext';
import { useTheme } from '../../contexts/ThemeContext';

interface ModelSelectProps {
  /** 模型类别 */
  category: 'image' | 'chat' | 'video';
  /** 当前值 */
  value: string;
  /** 选择回调 */
  onChange: (model: string) => void;
  /** 浅色画布主题 */
  isLightCanvas?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = { image: '图像', chat: '分析', video: '视频' };
const CATEGORY_ICON: Record<string, string> = { image: '🖼️', chat: '📝', video: '🎬' };

export const ModelSelect: React.FC<ModelSelectProps> = ({ category, value, onChange, isLightCanvas = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modelCtx = useContext(ModelContext);
  const { isDark: globalDark } = useTheme();

  const isDark = isLightCanvas ? false : globalDark;

  const modelIds: string[] =
    category === 'image' ? (modelCtx?.imageModels || [])
    : category === 'chat' ? (modelCtx?.chatModels || [])
    : (modelCtx?.videoModels || []);

  // 🔍 调试：打印实际拿到的模型数据
  useEffect(() => {
    console.log(
      `%c[ModelSelect] %c${category} %c节点`,
      'color:#60a5fa;font-weight:bold',
      'color:#c084fc;font-weight:bold',
      'color:inherit',
      '\n  modelIds:', modelIds,
      '\n  modelIds.length:', modelIds.length,
      '\n  modelCtx?.imageModels:', modelCtx?.imageModels,
      '\n  modelCtx?.chatModels:', modelCtx?.chatModels,
      '\n  modelCtx?.videoModels:', modelCtx?.videoModels,
      '\n  allModels.length:', modelCtx?.allModels?.length || 0,
      '\n  modelCtx 是否为 null:', modelCtx === null,
    );
  }, [category, modelIds, modelCtx]);

  // 从 allModels 解析显示名称
  const allModels = modelCtx?.allModels || [];
  const modelDisplayMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of allModels) {
      if (m.displayName && m.displayName !== m.id) {
        map[m.id] = m.displayName;
      }
    }
    return map;
  }, [allModels]);

  // 解析模型ID为显示名称，优先用 allModels 中的 displayName
  const resolveDisplayName = (id: string): string => {
    return modelDisplayMap[id] || id;
  };

  const label = CATEGORY_LABEL[category] || category;
  const icon = CATEGORY_ICON[category] || '';
  const hasModels = modelIds.length > 0;

  // 搜索过滤
  const filteredModels = search.trim()
    ? modelIds.filter(m => {
        const display = resolveDisplayName(m);
        return display.toLowerCase().includes(search.toLowerCase()) ||
               m.toLowerCase().includes(search.toLowerCase());
      })
    : modelIds;

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ====== 颜色定义 ======
  const colors = {
    triggerBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    triggerBgHover: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    triggerBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    triggerText: isDark ? '#e5e5e5' : '#1f2937',
    triggerDisabledBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    triggerDisabledText: isDark ? '#52525b' : '#9ca3af',

    dropdownBg: isDark ? '#1a1a1a' : '#ffffff',
    dropdownBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    dropdownShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',

    categoryColor: category === 'image' ? '#60a5fa'
      : category === 'chat' ? '#c084fc'
      : '#fbbf24',

    itemText: isDark ? '#d4d4d8' : '#374151',
    itemTextSub: isDark ? '#737373' : '#9ca3af',
    itemHoverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    itemSelectedBg: category === 'image'
      ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)')
      : category === 'chat'
      ? (isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.08)')
      : (isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.08)'),
    itemSelectedText: category === 'image' ? '#60a5fa'
      : category === 'chat' ? '#c084fc'
      : '#fbbf24',

    searchBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    searchBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    searchText: isDark ? '#e5e5e5' : '#374151',

    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    mutedText: isDark ? '#737373' : '#9ca3af',
    currentBadgeBg: category === 'image'
      ? 'rgba(59,130,246,0.2)'
      : category === 'chat'
      ? 'rgba(168,85,247,0.2)'
      : 'rgba(251,191,36,0.2)',
  };

  const currentDisplayName = value ? resolveDisplayName(value) : '';
  // 计算最长的模型名用于自适应宽度
  const longestName = useMemo(() => {
    let max = 0;
    for (const id of modelIds) {
      const name = resolveDisplayName(id);
      if (name.length > max) max = name.length;
    }
    return max;
  }, [modelIds, resolveDisplayName]);
  // 根据最长模型名动态调整宽度：每个字符约 8px（中文约 14px），最少 260px，最多 400px
  const panelWidth = Math.max(260, Math.min(400, longestName * 10 + 120));

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {/* 触发按钮 — 更大更明显 */}
      <button
        type="button"
        disabled={!hasModels}
        onClick={() => hasModels && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 rounded-lg transition-all duration-150"
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          lineHeight: '1.5',
          background: hasModels ? colors.triggerBg : colors.triggerDisabledBg,
          border: `1px solid ${colors.triggerBorder}`,
          color: hasModels ? colors.triggerText : colors.triggerDisabledText,
          cursor: hasModels ? 'pointer' : 'not-allowed',
          opacity: hasModels ? 1 : 0.5,
          minHeight: '38px',
        }}
        title={!hasModels ? '请在设置中配置模型' : `${label}: ${currentDisplayName || '未选择'}`}
        onMouseEnter={(e) => {
          if (hasModels) (e.currentTarget as HTMLButtonElement).style.background = colors.triggerBgHover;
        }}
        onMouseLeave={(e) => {
          if (hasModels) (e.currentTarget as HTMLButtonElement).style.background = colors.triggerBg;
        }}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="shrink-0 font-semibold"
            style={{ fontSize: '11px', color: colors.categoryColor }}
          >
            {icon} {label}
          </span>
          <span className="truncate font-semibold" style={{ color: colors.triggerText }}>
            {currentDisplayName || '未选择'}
          </span>
        </span>
        {hasModels && (
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
          />
        )}
      </button>

      {/* 下拉面板 — 向上展开，更宽更大 */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 rounded-xl z-50 overflow-hidden flex flex-col"
          style={{
            width: `${panelWidth}px`,
            maxHeight: '320px',
            background: colors.dropdownBg,
            border: `1px solid ${colors.dropdownBorder}`,
            boxShadow: colors.dropdownShadow,
          }}
        >
          {/* 搜索框 */}
          {modelIds.length > 4 && (
            <div
              className="px-3 pt-3 pb-2"
              style={{ borderBottom: `1px solid ${colors.divider}` }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  fontSize: '13px',
                  background: colors.searchBg,
                  border: `1px solid ${colors.searchBorder}`,
                }}
              >
                <Search size={14} className="shrink-0" style={{ color: colors.mutedText }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索模型..."
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: '13px', color: colors.searchText }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* 模型列表 — 每个选项更大 */}
          <div className="overflow-y-auto custom-scrollbar py-1" style={{ maxHeight: '260px' }}>
            {filteredModels.length === 0 ? (
              <div
                className="px-4 py-6 text-center"
                style={{ fontSize: '13px', color: colors.mutedText }}
              >
                {search.trim() ? '无匹配模型' : '暂无可用模型'}
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = m === value;
                const displayName = resolveDisplayName(m);
                const showDetail = displayName !== m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { onChange(m); setIsOpen(false); }}
                    className="w-full text-left transition-colors flex items-center justify-between"
                    style={{
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: isSelected ? colors.itemSelectedBg : 'transparent',
                      color: isSelected ? colors.itemSelectedText : colors.itemText,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.background = colors.itemHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <span className="truncate min-w-0 flex-1">
                      <span>{displayName}</span>
                      {showDetail && (
                        <span
                          className="block truncate mt-0.5"
                          style={{ fontSize: '11px', color: colors.itemTextSub }}
                        >
                          {m}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span
                        className="shrink-0 ml-3 px-2 py-0.5 rounded font-medium"
                        style={{
                          fontSize: '11px',
                          background: colors.currentBadgeBg,
                          color: colors.itemSelectedText,
                        }}
                      >
                        当前
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* 底部提示 */}
          {!hasModels && (
            <div
              className="px-4 py-3 text-center"
              style={{
                fontSize: '12px',
                borderTop: `1px solid ${colors.divider}`,
                color: colors.mutedText,
              }}
            >
              ⚙️ 前往设置添加模型
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelect;
