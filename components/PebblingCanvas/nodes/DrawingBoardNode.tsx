import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';
import { Icons } from '../Icons';

export const DrawingBoardNode = React.memo(function DrawingBoardNode(props: NodeRendererProps & {
  showMediaInfo: boolean;
  setShowMediaInfo: (v: boolean) => void;
  getAspectRatio: (w: number, h: number) => string;
}) {
  const {
    node, onUpdate, onExecute, isRunning, isLightCanvas,
    themeColors, controlBg, incomingConnections, onEndConnection,
    showMediaInfo, setShowMediaInfo, getAspectRatio,
  } = props;
    const boardElements = node.data?.boardElements || [];
    const boardWidth = node.data?.boardWidth || 1920; // 默认 1920
    const boardHeight = node.data?.boardHeight || 1920; // 默认 1920
    const receivedImages = node.data?.receivedImages || [];
    const outputImageUrl = node.data?.outputImageUrl;
    const canvasRef = useRef<HTMLCanvasElement>(null);
        
    // 画板状态
    const [selectedTool, setSelectedTool] = useState<'select' | 'pencil' | 'text' | 'rect' | 'circle'>('select');
    const [selectedColor, setSelectedColor] = useState('#ef4444');
    const [brushSize, setBrushSize] = useState(4);
    const [isDrawing, setIsDrawingLocal] = useState(false);
    const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{x: number, y: number, screenX: number, screenY: number} | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [elements, setElements] = useState<any[]>(boardElements);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [localBoardWidth, setLocalBoardWidth] = useState(boardWidth);
    const [localBoardHeight, setLocalBoardHeight] = useState(boardHeight);
    const [showSizeSettings, setShowSizeSettings] = useState(false);
    const [isResizingElement, setIsResizingElement] = useState(false); // 调整元素尺寸
    const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
    const lastPointRef = useRef<{x: number, y: number} | null>(null); // 用于节流
        
    // 预设颜色
    const COLORS = [
        { name: '红', value: '#ef4444' },
        { name: '黄', value: '#eab308' },
        { name: '蓝', value: '#3b82f6' },
        { name: '绿', value: '#22c55e' },
        { name: '黑', value: '#1f2937' },
        { name: '白', value: '#ffffff' },
    ];
        
    // 重绘画布
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
            
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, localBoardWidth, localBoardHeight);
            
        elements.forEach((el: any) => {
            switch (el.type) {
                case 'image':
                    // 检查 imageData 是否为有效的 HTMLImageElement
                    if (el.imageData && el.imageData instanceof HTMLImageElement && el.imageData.complete) {
                        ctx.drawImage(el.imageData, el.x, el.y, el.width || 100, el.height || 100);
                    } else if (el.imageUrl) {
                        // imageData 无效，绘制占位框并重新加载
                        ctx.fillStyle = '#f0f0f0';
                        ctx.fillRect(el.x, el.y, el.width || 100, el.height || 100);
                        ctx.strokeStyle = '#ccc';
                        ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 100);
                        ctx.fillStyle = '#999';
                        ctx.font = '12px sans-serif';
                        ctx.fillText('加载中...', el.x + 10, el.y + (el.height || 100) / 2);
                    }
                    break;
                case 'path':
                    if (el.points && el.points.length > 1) {
                        ctx.beginPath();
                        ctx.strokeStyle = el.strokeColor || '#000';
                        ctx.lineWidth = el.strokeWidth || 2;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.moveTo(el.points[0].x, el.points[0].y);
                        el.points.slice(1).forEach((p: any) => ctx.lineTo(p.x, p.y));
                        ctx.stroke();
                    }
                    break;
                case 'text':
                    const fontSize = el.fontSize || 48;
                    ctx.font = `${fontSize}px sans-serif`;
                    ctx.fillStyle = el.color || '#000';
                    // 文字基线在底部，所以 y 要加上字体高度
                    ctx.fillText(el.text || '', el.x, el.y + fontSize);
                    break;
                case 'rect':
                    ctx.fillStyle = el.fillColor || '#000';
                    ctx.fillRect(el.x, el.y, el.width || 50, el.height || 50);
                    break;
                case 'circle':
                    ctx.beginPath();
                    ctx.fillStyle = el.fillColor || '#000';
                    const radius = Math.min(el.width || 50, el.height || 50) / 2;
                    ctx.arc(el.x + radius, el.y + radius, radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
                
            if (el.id === selectedElementId && el.type !== 'path') {
                // 文字元素的宽高需要根据实际文字计算
                let selW = el.width || 50;
                let selH = el.height || 50;
                if (el.type === 'text') {
                    const textFontSize = el.fontSize || 48;
                    ctx.font = `${textFontSize}px sans-serif`;
                    const metrics = ctx.measureText(el.text || '');
                    selW = metrics.width;
                    selH = textFontSize;
                }
                
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(el.x - 4, el.y - 4, selW + 8, selH + 8);
                ctx.setLineDash([]);
                
                // 绘制缩放手柄（右下角）
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(el.x + selW - 6, el.y + selH - 6, 10, 10);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(el.x + selW - 6, el.y + selH - 6, 10, 10);
            }
        });
            
        if (currentPath.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    }, [elements, selectedElementId, currentPath, selectedColor, brushSize, localBoardWidth, localBoardHeight]);
        
    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);
    
    // 检测并重新加载缺失 imageData 的图片元素
    useEffect(() => {
        elements.forEach((el: any) => {
            if (el.type === 'image' && el.imageUrl && (!el.imageData || !(el.imageData instanceof HTMLImageElement))) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    setElements((prev: any[]) => prev.map(item => 
                        item.id === el.id ? { ...item, imageData: img } : item
                    ));
                };
                img.src = el.imageUrl;
            }
        });
    }, [elements.length]); // 只在元素数量变化时检查
        
    // 加载接收的图片 - 并自动计算画布尺寸
    useEffect(() => {
        if (receivedImages.length > 0) {
            let totalWidth = 0;
            let maxHeight = 0;
            let loadedCount = 0;
            
            receivedImages.forEach((url: string, idx: number) => {
                if (!elements.some((el: any) => el.imageUrl === url)) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        // 🔧 图片尺寸等比缩放，最长边不超过1600（画布默认1920）
                        const maxSize = 1600;
                        let w = img.width, h = img.height;
                        if (w > maxSize || h > maxSize) {
                            const ratio = Math.min(maxSize / w, maxSize / h);
                            w *= ratio;
                            h *= ratio;
                        }
                        
                        totalWidth += w + 30;
                        maxHeight = Math.max(maxHeight, h);
                        loadedCount++;
                        
                        setElements((prev: any[]) => [...prev, {
                            id: `img-${Date.now()}-${idx}`,
                            type: 'image',
                            x: 20 + (idx % 3) * (w + 40),
                            y: 20 + Math.floor(idx / 3) * (h + 40),
                            width: w,
                            height: h,
                            imageUrl: url,
                            imageData: img,
                        }]);
                        
                        // 所有图片加载完成后，检查是否需要扩展画布（不缩小）
                        if (loadedCount === receivedImages.length) {
                            // 保持默认 1920×1920，只有当图片超出时才扩展
                            const neededWidth = totalWidth + 40;
                            const neededHeight = maxHeight * Math.ceil(receivedImages.length / 3) + 80;
                            const newWidth = Math.max(localBoardWidth, neededWidth);
                            const newHeight = Math.max(localBoardHeight, neededHeight);
                            if (newWidth > localBoardWidth || newHeight > localBoardHeight) {
                                setLocalBoardWidth(newWidth);
                                setLocalBoardHeight(newHeight);
                                onUpdate(node.id, { data: { ...node.data, boardWidth: newWidth, boardHeight: newHeight } });
                            }
                        }
                    };
                    img.src = url;
                }
            });
        }
    }, [receivedImages]);
        
    // 获取画布坐标（修复缩放偏差）
    const getCanvasCoords = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        // 计算缩放比例：实际显示尺寸 vs canvas内部尺寸
        const scaleX = localBoardWidth / rect.width;
        const scaleY = localBoardHeight / rect.height;
        return { 
            x: (e.clientX - rect.left) * scaleX, 
            y: (e.clientY - rect.top) * scaleY 
        };
    };
        
    const findElementAtPoint = (x: number, y: number) => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type === 'path') continue;
            const w = el.width || 50;
            const h = el.height || 50;
            if (x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h) return el;
        }
        return null;
    };
    
    // 获取元素实际尺寸（文字需要根据字体计算）
    const getElementSize = (el: any): { w: number, h: number } => {
        if (el.type === 'text') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const textFontSize = el.fontSize || 48;
                    ctx.font = `${textFontSize}px sans-serif`;
                    const metrics = ctx.measureText(el.text || '');
                    return { w: metrics.width, h: textFontSize };
                }
            }
        }
        return { w: el.width || 50, h: el.height || 50 };
    };
    
    // 检测是否点击在缩放手柄上
    const findResizeHandle = (x: number, y: number): 'br' | null => {
        if (!selectedElementId) return null;
        const el = elements.find((e: any) => e.id === selectedElementId);
        if (!el || el.type === 'path') return null;
        
        const { w, h } = getElementSize(el);
        const handleSize = 12;
        
        // 只检测右下角手柄
        if (x >= el.x + w - handleSize && x <= el.x + w + 4 &&
            y >= el.y + h - handleSize && y <= el.y + h + 4) {
            return 'br';
        }
        return null;
    };
        
    const handleCanvasMouseDown = (e: MouseEvent) => {
        const coords = getCanvasCoords(e);
        lastPointRef.current = coords;
        console.log('[DrawingBoard] MouseDown, tool:', selectedTool, 'coords:', coords);
        
        if (selectedTool === 'select') {
            // 先检查是否点击在缩放手柄上
            const handle = findResizeHandle(coords.x, coords.y);
            if (handle) {
                setIsResizingElement(true);
                setResizeCorner(handle);
                return;
            }
            
            const el = findElementAtPoint(coords.x, coords.y);
            if (el) {
                setSelectedElementId(el.id);
                setDragOffset({ x: coords.x - el.x, y: coords.y - el.y });
                setIsDraggingElement(true);
            } else {
                setSelectedElementId(null);
                setIsDraggingElement(false);
            }
        } else if (selectedTool === 'pencil') {
            setIsDrawingLocal(true);
            setCurrentPath([coords]);
        } else if (selectedTool === 'text') {
            // 如果已经有输入框显示，先保存当前输入
            if (textPosition && textInput.trim()) {
                setElements((prev: any[]) => [...prev, {
                    id: `text-${Date.now()}`,
                    type: 'text',
                    x: textPosition.x,
                    y: textPosition.y,
                    text: textInput,
                    fontSize: 48, // 默认字号48
                    color: selectedColor,
                }]);
                setTextInput('');
            }
            // 同时保存画布坐标和屏幕坐标
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setTextPosition({
                    x: coords.x,
                    y: coords.y,
                    screenX: e.clientX - rect.left,
                    screenY: e.clientY - rect.top
                });
                // 延迟聚焦确保输入框已渲染
                setTimeout(() => textInputRef.current?.focus(), 10);
            }
        } else if (['rect', 'circle'].includes(selectedTool)) {
            setIsDrawingLocal(true);
            setCurrentPath([coords]);
        }
    };
        
    const handleCanvasMouseMove = (e: MouseEvent) => {
        const coords = getCanvasCoords(e);
        
        // 缩放元素
        if (isResizingElement && selectedElementId && resizeCorner) {
            setElements((prev: any[]) => prev.map(el => {
                if (el.id !== selectedElementId) return el;
                
                // 文字元素：通过拖拽调整字号
                if (el.type === 'text') {
                    const { w: currentW, h: currentH } = getElementSize(el);
                    const currentFontSize = el.fontSize || 48;
                    // 根据拖拽距离计算新字号
                    const newHeight = Math.max(16, coords.y - el.y);
                    const newFontSize = Math.round(newHeight);
                    return { ...el, fontSize: newFontSize };
                }
                
                // 其他元素：调整宽高
                const minSize = 30;
                const newWidth = Math.max(minSize, coords.x - el.x);
                const newHeight = Math.max(minSize, coords.y - el.y);
                return { ...el, width: newWidth, height: newHeight };
            }));
            return;
        }
        
        // 拖拽元素
        if (selectedTool === 'select' && selectedElementId && isDraggingElement) {
            setElements((prev: any[]) => prev.map(el => 
                el.id === selectedElementId ? { ...el, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y } : el
            ));
        } else if (selectedTool === 'pencil' && isDrawing) {
            // 节流：只有移动距离超过3像素才添加新点
            const lastPoint = lastPointRef.current;
            if (lastPoint) {
                const dist = Math.sqrt(Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2));
                if (dist >= 3) {
                    setCurrentPath(prev => [...prev, coords]);
                    lastPointRef.current = coords;
                }
            } else {
                setCurrentPath(prev => [...prev, coords]);
                lastPointRef.current = coords;
            }
        }
    };
        
    const handleCanvasMouseUp = (e: MouseEvent) => {
        const coords = getCanvasCoords(e);
        
        // 结束缩放
        if (isResizingElement) {
            setIsResizingElement(false);
            setResizeCorner(null);
            return;
        }
        
        if (selectedTool === 'pencil' && currentPath.length > 1) {
            setElements((prev: any[]) => [...prev, {
                id: `path-${Date.now()}`,
                type: 'path',
                x: 0, y: 0,
                points: currentPath,
                strokeColor: selectedColor,
                strokeWidth: brushSize,
            }]);
        } else if (selectedTool === 'rect' && currentPath.length > 0) {
            const start = currentPath[0];
            const newEl = {
                id: `rect-${Date.now()}`,
                type: 'rect',
                x: Math.min(start.x, coords.x),
                y: Math.min(start.y, coords.y),
                width: Math.abs(coords.x - start.x),
                height: Math.abs(coords.y - start.y),
                fillColor: selectedColor,
            };
            if (newEl.width > 5 && newEl.height > 5) setElements((prev: any[]) => [...prev, newEl]);
        } else if (selectedTool === 'circle' && currentPath.length > 0) {
            const start = currentPath[0];
            const size = Math.max(Math.abs(coords.x - start.x), Math.abs(coords.y - start.y));
            if (size > 5) {
                setElements((prev: any[]) => [...prev, {
                    id: `circle-${Date.now()}`,
                    type: 'circle',
                    x: Math.min(start.x, coords.x),
                    y: Math.min(start.y, coords.y),
                    width: size,
                    height: size,
                    fillColor: selectedColor,
                }]);
            }
        }
        setIsDrawingLocal(false);
        setCurrentPath([]);
        setIsDraggingElement(false);
        lastPointRef.current = null;
    };
        
    const handleAddText = () => {
        if (!textInput.trim() || !textPosition) return;
        setElements((prev: any[]) => [...prev, {
            id: `text-${Date.now()}`,
            type: 'text',
            x: textPosition.x,
            y: textPosition.y,
            text: textInput,
            fontSize: 48, // 🔧 默认字号48
            color: selectedColor,
        }]);
        setTextInput('');
        setTextPosition(null);
    };
    
    // 🔧 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
    
    // 🔧 图层操作函数
    const moveElementUp = (elementId: string) => {
        setElements(prev => {
            const idx = prev.findIndex(el => el.id === elementId);
            if (idx < prev.length - 1) {
                const newArr = [...prev];
                [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
                return newArr;
            }
            return prev;
        });
        setContextMenu(null);
    };
    
    const moveElementDown = (elementId: string) => {
        setElements(prev => {
            const idx = prev.findIndex(el => el.id === elementId);
            if (idx > 0) {
                const newArr = [...prev];
                [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
                return newArr;
            }
            return prev;
        });
        setContextMenu(null);
    };
    
    const moveElementToTop = (elementId: string) => {
        setElements(prev => {
            const idx = prev.findIndex(el => el.id === elementId);
            if (idx >= 0 && idx < prev.length - 1) {
                const el = prev[idx];
                return [...prev.slice(0, idx), ...prev.slice(idx + 1), el];
            }
            return prev;
        });
        setContextMenu(null);
    };
    
    const moveElementToBottom = (elementId: string) => {
        setElements(prev => {
            const idx = prev.findIndex(el => el.id === elementId);
            if (idx > 0) {
                const el = prev[idx];
                return [el, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
            }
            return prev;
        });
        setContextMenu(null);
    };
    
    const deleteElement = (elementId: string) => {
        setElements(prev => prev.filter(el => el.id !== elementId));
        setSelectedElementId(null);
        setContextMenu(null);
    };
    
    // 🔧 右键菜单处理
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const coords = getCanvasCoords(e);
        const el = findElementAtPoint(coords.x, coords.y);
        if (el) {
            setSelectedElementId(el.id);
            // 计算菜单位置（相对于画布容器）
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setContextMenu({ 
                    x: e.clientX - rect.left + 8, 
                    y: e.clientY - rect.top + 48,
                    elementId: el.id 
                });
            }
        } else {
            setContextMenu(null);
        }
    };
        
    const handleClear = () => {
        setElements([]);
        setSelectedElementId(null);
    };
        
    return (
        <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg" style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${isLightCanvas ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                    
            {/* 头部 - 简洁标题 */}
            <div className="h-7 flex items-center justify-between px-3 shrink-0" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.2)'}`, backgroundColor: isLightCanvas ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.1)' }}>
                <div className="flex items-center gap-2">
                    <Icons.Palette size={14} className={isLightCanvas ? 'text-amber-600' : 'text-amber-400'} />
                    <span className="text-[11px] font-bold" style={{ color: isLightCanvas ? '#d97706' : '#fcd34d' }}>画板</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: isLightCanvas ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)', color: isLightCanvas ? '#b45309' : '#fbbf24' }}>
                        {localBoardWidth}×{localBoardHeight}
                    </span>
                </div>
            </div>
                        
            {/* 工具栏 - 更美观 */}
            <div className="px-3 py-2 flex items-center gap-3 flex-wrap" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.1)'}`, backgroundColor: isLightCanvas ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.2)' }}>
                {/* 工具选择 */}
                <div className={`flex items-center gap-1 rounded-lg p-1 ${isLightCanvas ? 'bg-gray-100' : 'bg-black/40'}`}>
                    {[
                        { id: 'select', icon: <Icons.Move size={14}/>, tip: '选择' },
                        { id: 'pencil', icon: <Icons.Edit size={14}/>, tip: '画笔' },
                        { id: 'text', icon: <Icons.Type size={14}/>, tip: '文字' },
                        { id: 'rect', icon: <Icons.Stop size={14}/>, tip: '矩形' },
                        { id: 'circle', icon: <Icons.Circle size={14}/>, tip: '圆形' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedTool(t.id as any); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${selectedTool === t.id ? 'bg-amber-500 text-white shadow-md' : (isLightCanvas ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10')}`}
                            title={t.tip}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>
                        
                {/* 颜色选择 */}
                <div className="flex items-center gap-1">
                    {COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={(e) => { e.stopPropagation(); setSelectedColor(c.value); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === c.value ? 'border-amber-400 scale-110 shadow-md' : 'border-transparent'}`}
                            style={{ backgroundColor: c.value, boxShadow: c.value === '#ffffff' ? 'inset 0 0 0 1px #ddd' : undefined }}
                            title={c.name}
                        />
                    ))}
                </div>
                        
                {/* 画笔大小 */}
                <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${isLightCanvas ? 'bg-gray-100' : 'bg-black/40'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setBrushSize(s => Math.max(1, s - 2)); }} onMouseDown={(e) => e.stopPropagation()} className={`w-5 h-5 flex items-center justify-center rounded ${isLightCanvas ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                        <Icons.Minus size={12}/>
                    </button>
                    <span className={`text-[10px] w-5 text-center font-medium ${isLightCanvas ? 'text-gray-700' : 'text-gray-200'}`}>{brushSize}</span>
                    <button onClick={(e) => { e.stopPropagation(); setBrushSize(s => Math.min(32, s + 2)); }} onMouseDown={(e) => e.stopPropagation()} className={`w-5 h-5 flex items-center justify-center rounded ${isLightCanvas ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                        <Icons.Plus size={12}/>
                    </button>
                </div>
                        
                {/* 操作按钮 */}
                <div className="flex items-center gap-1 ml-auto">
                    {/* 🔧 接收按钮 */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onExecute(node.id, 1); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-7 px-2 text-[10px] font-medium rounded-md bg-blue-500 hover:bg-blue-400 text-white shadow-sm transition-all flex items-center gap-1"
                        title="接收上游图片"
                    >
                        <Icons.Download size={12}/>
                        接收
                    </button>
                    {/* 🔧 输出按钮 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const canvas = canvasRef.current;
                            if (canvas) {
                                const dataUrl = canvas.toDataURL('image/png');
                                onUpdate(node.id, { content: dataUrl, data: { ...node.data, outputImageUrl: dataUrl, boardElements: elements } });
                                onExecute(node.id, 2);
                            }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={elements.length === 0}
                        className="h-7 px-2 text-[10px] font-medium rounded-md bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="输出PNG"
                    >
                        <Icons.Upload size={12}/>
                        输出
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1"></div>
                    {/* 信息按钮 */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setShowMediaInfo(true)}
                        onMouseLeave={() => setShowMediaInfo(false)}
                    >
                        <button
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${isLightCanvas ? 'bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            title="画布信息"
                        >
                            <Icons.Info size={14}/>
                        </button>
                        {showMediaInfo && (
                            <div 
                                className="absolute top-full right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 text-[10px] text-white/90 whitespace-nowrap shadow-lg z-50"
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="space-y-0.5">
                                    <div><span className="text-zinc-500">画布宽度:</span> {localBoardWidth} px</div>
                                    <div><span className="text-zinc-500">画布高度:</span> {localBoardHeight} px</div>
                                    <div><span className="text-zinc-500">比例:</span> {getAspectRatio(localBoardWidth, localBoardHeight)}</div>
                                    <div><span className="text-zinc-500">元素数:</span> {elements.length}</div>
                                    <div><span className="text-zinc-500">输出格式:</span> PNG</div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* 下载按钮 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const canvas = canvasRef.current;
                            if (canvas) {
                                const dataUrl = canvas.toDataURL('image/png');
                                const link = document.createElement('a');
                                link.download = `drawing-board-${Date.now()}.png`;
                                link.href = dataUrl;
                                link.click();
                            }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={elements.length === 0}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-30 ${isLightCanvas ? 'bg-gray-100 text-gray-500 hover:text-blue-500 hover:bg-blue-50' : 'bg-black/40 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20'}`}
                        title="下载PNG"
                    >
                        <Icons.Download size={14}/>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={elements.length === 0}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-30 ${isLightCanvas ? 'bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50' : 'bg-black/40 text-gray-400 hover:text-red-400 hover:bg-red-500/20'}`}
                        title="清空"
                    >
                        <Icons.Close size={14}/>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowSizeSettings(!showSizeSettings); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${showSizeSettings ? 'bg-amber-500 text-white' : (isLightCanvas ? 'bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10')}`}
                        title="设置画布尺寸"
                    >
                        <Icons.Resize size={14}/>
                    </button>
                </div>
            </div>
                    
            {/* 尺寸设置弹出层 */}
            {showSizeSettings && (
                <div className="px-3 py-2 flex items-center gap-3 flex-wrap" style={{ borderBottom: `1px solid ${isLightCanvas ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.1)'}`, backgroundColor: isLightCanvas ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.1)' }}>
                    <span className={`text-[10px] font-medium ${isLightCanvas ? 'text-gray-600' : 'text-gray-300'}`}>宽:</span>
                    <input
                        type="number"
                        value={localBoardWidth}
                        onChange={(e) => setLocalBoardWidth(Math.max(200, Math.min(4096, parseInt(e.target.value) || 1920)))}
                        onBlur={() => onUpdate(node.id, { data: { ...node.data, boardWidth: localBoardWidth } })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-16 px-2 py-1 text-[11px] rounded-md border bg-transparent ${isLightCanvas ? 'border-gray-200 text-gray-800' : 'border-white/10 text-zinc-200'}`}
                    />
                    <span className={`text-[10px] font-medium ${isLightCanvas ? 'text-gray-600' : 'text-gray-300'}`}>高:</span>
                    <input
                        type="number"
                        value={localBoardHeight}
                        onChange={(e) => setLocalBoardHeight(Math.max(200, Math.min(4096, parseInt(e.target.value) || 1920)))}
                        onBlur={() => onUpdate(node.id, { data: { ...node.data, boardHeight: localBoardHeight } })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-16 px-2 py-1 text-[11px] rounded-md border bg-transparent ${isLightCanvas ? 'border-gray-200 text-gray-800' : 'border-white/10 text-zinc-200'}`}
                    />
                    {/* 快捷预设 */}
                    <div className="flex items-center gap-1 ml-auto">
                        {[
                            { label: '1080', w: 1080, h: 1080 },
                            { label: '1920', w: 1920, h: 1920 },
                            { label: '2K', w: 2048, h: 2048 },
                            { label: '16:9', w: 1920, h: 1080 },
                        ].map(preset => (
                            <button
                                key={preset.label}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLocalBoardWidth(preset.w);
                                    setLocalBoardHeight(preset.h);
                                    onUpdate(node.id, { data: { ...node.data, boardWidth: preset.w, boardHeight: preset.h } });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${localBoardWidth === preset.w && localBoardHeight === preset.h ? 'bg-amber-500 text-white' : (isLightCanvas ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-black/40 text-gray-300 hover:text-white hover:bg-white/10')}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
                
            {/* 画布区域 */}
            <div className="flex-1 p-2 relative overflow-hidden" style={{ backgroundColor: isLightCanvas ? '#f5f5f5' : 'rgba(0,0,0,0.1)' }} onClick={() => setContextMenu(null)} onMouseDown={(e) => e.stopPropagation()}>
                <canvas
                    ref={canvasRef}
                    width={localBoardWidth}
                    height={localBoardHeight}
                    className="rounded-lg cursor-crosshair shadow-inner"
                    style={{ display: 'block', backgroundColor: '#ffffff', maxWidth: '100%', maxHeight: '100%' }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleCanvasMouseDown(e);
                    }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onContextMenu={handleContextMenu}
                />
                {/* 🔧 文字直接输入（类似微信截图） */}
                {textPosition && (() => {
                    // 计算画布缩放比例
                    const canvas = canvasRef.current;
                    const canvasRect = canvas?.getBoundingClientRect();
                    const scaleRatio = canvasRect ? canvasRect.width / localBoardWidth : 1;
                    const displayFontSize = Math.round(48 * scaleRatio);
                    
                    return (
                        <input
                            ref={textInputRef}
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="输入文字..."
                            className="absolute bg-transparent outline-none caret-amber-500 z-10"
                            style={{ 
                                left: textPosition.screenX + 8, 
                                top: textPosition.screenY + 8,
                                color: selectedColor,
                                fontSize: `${displayFontSize}px`, // 根据画布缩放调整显示字号
                                fontFamily: 'sans-serif',
                                minWidth: '50px',
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddText();
                                }
                                if (e.key === 'Escape') { 
                                    e.preventDefault();
                                    setTextPosition(null); 
                                    setTextInput(''); 
                                }
                            }}
                            onBlur={(e) => {
                                const relatedTarget = e.relatedTarget as HTMLElement;
                                if (relatedTarget?.tagName === 'CANVAS') return;
                                if (textInput.trim()) handleAddText();
                                else setTextPosition(null);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        />
                    );
                })()}
                {/* 🔧 右键菜单 */}
                {contextMenu && (
                    <div 
                        className="absolute bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="w-full px-3 py-1.5 text-[11px] text-left text-white/90 hover:bg-white/10 flex items-center gap-2"
                            onClick={() => moveElementToTop(contextMenu.elementId)}
                        >
                            <Icons.ArrowUp size={12}/> 置于顶层
                        </button>
                        <button 
                            className="w-full px-3 py-1.5 text-[11px] text-left text-white/90 hover:bg-white/10 flex items-center gap-2"
                            onClick={() => moveElementUp(contextMenu.elementId)}
                        >
                            <Icons.ChevronUp size={12}/> 上移一层
                        </button>
                        <button 
                            className="w-full px-3 py-1.5 text-[11px] text-left text-white/90 hover:bg-white/10 flex items-center gap-2"
                            onClick={() => moveElementDown(contextMenu.elementId)}
                        >
                            <Icons.ChevronDown size={12}/> 下移一层
                        </button>
                        <button 
                            className="w-full px-3 py-1.5 text-[11px] text-left text-white/90 hover:bg-white/10 flex items-center gap-2"
                            onClick={() => moveElementToBottom(contextMenu.elementId)}
                        >
                            <Icons.ArrowDown size={12}/> 置于底层
                        </button>
                        <div className="my-1 border-t border-white/10"></div>
                        <button 
                            className="w-full px-3 py-1.5 text-[11px] text-left text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                            onClick={() => deleteElement(contextMenu.elementId)}
                        >
                            <Icons.Trash size={12}/> 删除
                        </button>
                    </div>
                )}
            </div>
                
            {/* 底部状态 */}
            <div className="h-5 px-2 flex items-center justify-between text-[9px]" style={{ backgroundColor: themeColors.footerBg, borderTop: `1px solid ${isLightCanvas ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.1)'}`, color: themeColors.textMuted }}>
                <span>{elements.length} 个元素 · {localBoardWidth}×{localBoardHeight}</span>
                <span style={{ color: isLightCanvas ? '#d97706' : 'rgba(251,191,36,0.7)' }}>
                    {selectedTool === 'select' ? (selectedElementId ? '拖拽移动 / 点击空白取消' : '点击选择元素') : selectedTool === 'pencil' ? '自由绘制' : selectedTool === 'text' ? '点击添加文字' : '拖拽绘制'}
                </span>
            </div>
                
            {isRunning && (
                <SpinnerOverlay size="lg" colorClass="border-amber-400/50 border-t-amber-400" isLightCanvas={isLightCanvas} zIndex="z-30" />
            )}
        </div>
    );
});
