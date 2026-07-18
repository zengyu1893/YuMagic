import { useState, useEffect, useCallback } from 'react';
import type { TaskLogEntry } from '../types';

const STORAGE_KEY = 'task_log';
const TASK_LOG_SYNC_EVENT = 'task-log-sync';
const MAX_ENTRIES = 200;

function loadTasks(): TaskLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: TaskLogEntry[]): void {
  try {
    const trimmed = tasks.length > MAX_ENTRIES
      ? tasks.slice(tasks.length - MAX_ENTRIES)
      : tasks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    try {
      const half = tasks.slice(tasks.length - Math.floor(MAX_ENTRIES / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
    } catch { /* silent */ }
  }
}

export function useTaskLog() {
  const [tasks, setTasks] = useState<TaskLogEntry[]>(loadTasks);

  // 跨标签页 + 同标签页跨 hook 实例同步
  useEffect(() => {
    const storageHandler = () => setTasks(loadTasks());
    window.addEventListener('storage', storageHandler);
    const syncHandler = () => setTasks(loadTasks());
    window.addEventListener(TASK_LOG_SYNC_EVENT, syncHandler);
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener(TASK_LOG_SYNC_EVENT, syncHandler);
    };
  }, []);

  const addTask = useCallback((entry: TaskLogEntry) => {
    setTasks(prev => {
      const next = [...prev, entry];
      saveTasks(next);
      window.dispatchEvent(new CustomEvent(TASK_LOG_SYNC_EVENT));
      return next;
    });
  }, []);

  const updateTask = useCallback((id: string, update: Partial<TaskLogEntry>) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...update } : t);
      saveTasks(next);
      window.dispatchEvent(new CustomEvent(TASK_LOG_SYNC_EVENT));
      return next;
    });
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(TASK_LOG_SYNC_EVENT));
  }, []);

  const sortedTasks = [...tasks].reverse();

  return { tasks: sortedTasks, addTask, updateTask, clearTasks };
}
