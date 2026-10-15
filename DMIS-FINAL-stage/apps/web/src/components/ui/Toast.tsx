import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastTone = "success" | "error" | "warning" | "info";
interface ToastInput {
  tone: ToastTone;
  title: string;
  message?: string;
}
interface ToastItem extends ToastInput {
  id: number;
}

const STYLE: Record<ToastTone, { cls: string; Icon: typeof Info }> = {
  success: { cls: "border-green-300 bg-green-50 text-green-900", Icon: CircleCheck },
  error: { cls: "border-red-300 bg-red-50 text-red-900", Icon: OctagonAlert },
  warning: { cls: "border-amber-300 bg-amber-50 text-amber-900", Icon: TriangleAlert },
  info: { cls: "border-blue-300 bg-blue-50 text-blue-900", Icon: Info },
};

const ToastContext = createContext<{ push: (t: ToastInput) => void } | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: ToastInput) => {
      const id = nextId++;
      setItems((cur) => [...cur, { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 8000 : 5000);
    },
    [dismiss]
  );
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="region" aria-label="Notifications" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-96">
        {items.map((t) => {
          const { cls, Icon } = STYLE[t.tone];
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-3 shadow-lg", cls)}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && <p className="mt-0.5 text-sm">{t.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="-m-1 rounded p-1 hover:bg-black/5">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
