'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  toastListeners.forEach(fn => fn([...toasts]));
}

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toasts.push({ id, title, description, variant });
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 3000);
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter(fn => fn !== setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-5 py-4 shadow-lg animate-in slide-in-from-bottom-5',
            t.variant === 'destructive'
              ? 'border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)]'
              : t.variant === 'success'
              ? 'border-[var(--success)] bg-[var(--success)] text-white'
              : 'border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]'
          )}
        >
          <div className="flex-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
          <button
            onClick={() => { toasts = toasts.filter(x => x.id !== t.id); notify(); }}
            className="shrink-0 rounded-full p-1.5 opacity-70 hover:opacity-100 touch-manipulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
