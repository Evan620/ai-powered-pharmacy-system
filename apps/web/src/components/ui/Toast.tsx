'use client';
import * as React from 'react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const show = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { id, message, type };

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const success = (message: string) => show(message, 'success');
  const error = (message: string) => show(message, 'error');
  const info = (message: string) => show(message, 'info');
  const warning = (message: string) => show(message, 'warning');

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
            'transform transition-all duration-300 ease-in-out',
            'animate-in slide-in-from-right-full',
            {
              'bg-green-600 text-white': toast.type === 'success',
              'bg-red-600 text-white': toast.type === 'error',
              'bg-blue-600 text-white': toast.type === 'info',
              'bg-orange-600 text-white': toast.type === 'warning',
            }
          )}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <span>✓</span>}
            {toast.type === 'error' && <span>✕</span>}
            {toast.type === 'info' && <span>ℹ</span>}
            {toast.type === 'warning' && <span>⚠</span>}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  return { show, success, error, info, warning, ToastContainer } as const;
}

