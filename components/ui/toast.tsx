'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

function notify() {
  listeners.forEach(listener => listener([...toasts]));
}

function removeToast(id: string) {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notify();
  }
}

export function toast(title: string, options?: { description?: string; variant?: Toast['variant'] }) {
  const id = (toastId++).toString();
  const newToast: Toast = {
    id,
    title,
    description: options?.description,
    variant: options?.variant || 'default',
  };
  
  toasts.push(newToast);
  notify();
  
  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      notify();
    }
  }, 3000);
  
  return id;
}

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>([]);
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts);
    };
    listeners.add(listener);
    listener([...toasts]);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  return toastList;
}

export function Toaster() {
  const toastList = useToast();
  
  if (toastList.length === 0) return null;
  
  return (
    <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 max-w-[420px] w-full">
      {toastList.map(toastItem => (
        <div
          key={toastItem.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
            toastItem.variant === 'success' && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-900 dark:text-green-100",
            toastItem.variant === 'destructive' && "bg-destructive text-destructive-foreground",
            toastItem.variant === 'default' && "bg-background border-border"
          )}
        >
          <div className="flex-1 space-y-1">
            <div className="text-sm font-semibold">{toastItem.title}</div>
            {toastItem.description && (
              <div className="text-sm opacity-90">{toastItem.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toastItem.id)}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

