import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ToastContextValue {
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const toast = useCallback((m: string) => setMsg(m), []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && (
        <div className="fixed bottom-4 right-4 z-[70] flex items-center gap-3 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="ml-2 rounded p-0.5 hover:bg-white/20">
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
