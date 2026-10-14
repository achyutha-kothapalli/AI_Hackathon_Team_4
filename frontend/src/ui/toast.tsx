import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Show = (message: string, icon?: IconName) => void;

const ToastContext = createContext<Show>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; icon: IconName } | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<Show>((message, icon = "check") => {
    setToast({ message, icon });
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${visible ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Icon name={toast.icon} />
            <span>{toast.message}</span>
          </>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** Copies `value` and confirms with a toast. Falls back to execCommand off HTTPS. */
export function useCopy() {
  const show = useToast();
  return useCallback(
    (value: string) => {
      const done = () => show(`Copied: ${value}`, "copy");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(done, () => fallbackCopy(value, done));
      } else {
        fallbackCopy(value, done);
      }
    },
    [show],
  );
}

function fallbackCopy(value: string, done: () => void) {
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  ta.remove();
  done();
}
