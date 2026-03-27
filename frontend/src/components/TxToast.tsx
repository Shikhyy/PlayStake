import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Icons, getIcon } from "./Icons";

export type TxStatus = "pending" | "confirmed" | "failed";

export interface TxToastItem {
  id: string;
  title: string;
  description: string;
  digest: string;
  status: TxStatus;
  timestamp: number;
}

interface TxToastContextValue {
  toasts: TxToastItem[];
  addToast: (title: string, description: string, digest: string) => void;
  confirmToast: (digest: string) => void;
  failToast: (digest: string) => void;
  removeToast: (id: string) => void;
}

const TxToastContext = createContext<TxToastContextValue | null>(null);

const EXPLORER_URL = "https://explorer.onelabs.cc";

function getExplorerTxUrl(digest: string) {
  return `${EXPLORER_URL}/txblock/${digest}`;
}

export function TxToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<TxToastItem[]>([]);

  const addToast = useCallback((title: string, description: string, digest: string) => {
    const id = `${digest}-${Date.now()}`;
    setToasts(prev => [...prev, { id, title, description, digest, status: "pending", timestamp: Date.now() }]);
  }, []);

  const confirmToast = useCallback((digest: string) => {
    setToasts(prev => prev.map(t => t.digest === digest ? { ...t, status: "confirmed" as TxStatus } : t));
  }, []);

  const failToast = useCallback((digest: string) => {
    setToasts(prev => prev.map(t => t.digest === digest ? { ...t, status: "failed" as TxStatus } : t));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => {
        if (t.status === "pending") return true;
        return now - t.timestamp < 8000;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TxToastContext.Provider value={{ toasts, addToast, confirmToast, failToast, removeToast }}>
      {children}
      <TxToastContainer toasts={toasts} onRemove={removeToast} />
    </TxToastContext.Provider>
  );
}

export function useTxToast() {
  const ctx = useContext(TxToastContext);
  if (!ctx) throw new Error("useTxToast must be used within TxToastProvider");
  return ctx;
}

function TxToastContainer({ toasts, onRemove }: { toasts: TxToastItem[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="card-game p-4 animate-slide-in-right gradient-border-glow"
          style={{
            borderColor: toast.status === "confirmed"
              ? "rgba(0,255,136,0.4)"
              : toast.status === "failed"
              ? "rgba(255,51,102,0.4)"
              : "rgba(183,189,247,0.3)"
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {toast.status === "pending" && (
                <div className="w-5 h-5 border-2 border-dim border-t-accent-lavender rounded-full animate-spin" />
              )}
              {toast.status === "confirmed" && (
                <span className="text-[#00FF88]">{getIcon("check" as keyof typeof Icons, { size: 20 })}</span>
              )}
              {toast.status === "failed" && (
                <span className="text-[#FF3366]">{getIcon("cross" as keyof typeof Icons, { size: 20 })}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold font-display">
                  {toast.status === "pending" ? "Transaction Submitted" :
                   toast.status === "confirmed" ? "Transaction Confirmed" : "Transaction Failed"}
                </p>
                <button
                  onClick={() => onRemove(toast.id)}
                  className="text-dim hover:text-normal ml-2 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-dim font-tech mt-0.5">{toast.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <a
                  href={getExplorerTxUrl(toast.digest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-accent-lavender hover:underline"
                >
                  {toast.digest.slice(0, 12)}...
                </a>
                <span className="text-xs text-dim">•</span>
                <span className={`text-xs font-tech ${
                  toast.status === "confirmed" ? "text-[#00FF88]" :
                  toast.status === "failed" ? "text-[#FF3366]" : "text-dim"
                }`}>
                  {toast.status === "pending" ? "Confirming..." :
                   toast.status === "confirmed" ? "On-chain" : "Rejected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
