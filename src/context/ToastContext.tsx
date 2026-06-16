import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "info" | "success" | "error";

export type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  durationMs?: number;
};

type ToastContextValue = {
  toasts: ToastMessage[];
  showToast: (input: ToastInput) => number;
  dismissToast: (id: number) => void;
};

const DEFAULT_DURATION_MS = 3600;
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const toast: ToastMessage = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "info",
        action: input.action,
      };
      setToasts((prev) => [...prev, toast]);

      const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
      const timer = setTimeout(() => dismissToast(id), durationMs);
      timers.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
