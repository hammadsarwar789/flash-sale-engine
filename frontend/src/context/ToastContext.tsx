import React, { createContext, useContext, useState, useCallback } from 'react';
import { Info, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    info: (msg: string, duration?: number) => void;
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration: number = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    info: useCallback((msg: string, d?: number) => addToast('info', msg, d), [addToast]),
    success: useCallback((msg: string, d?: number) => addToast('success', msg, d), [addToast]),
    error: useCallback((msg: string, d?: number) => addToast('error', msg, d), [addToast]),
    warning: useCallback((msg: string, d?: number) => addToast('warning', msg, d), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Floating Toasts Container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const bgStyles =
            t.type === 'error'
              ? 'bg-surface dark:bg-[#181414] border-rose/50 text-rose'
              : t.type === 'success'
              ? 'bg-surface dark:bg-[#131815] border-mint/50 text-mint'
              : t.type === 'warning'
              ? 'bg-surface dark:bg-[#181612] border-amber/50 text-amber'
              : 'bg-surface dark:bg-[#131715] border-line text-text';

          const IconComponent =
            t.type === 'error'
              ? AlertCircle
              : t.type === 'success'
              ? CheckCircle2
              : t.type === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-card border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bgStyles}`}
            >
              <IconComponent className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-xs font-mono font-medium leading-relaxed break-words">
                {t.message}
              </p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-text-mute hover:text-text transition-colors p-0.5"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType['toast'] => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
