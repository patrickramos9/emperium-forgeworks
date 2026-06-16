import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useToast, type ToastMessage } from "@/context/ToastContext";

function toneClass(tone: ToastMessage["tone"]): string {
  switch (tone) {
    case "success":
      return "border-primary/50 bg-surface-container text-on-surface";
    case "error":
      return "border-error/50 bg-surface-container text-on-surface";
    default:
      return "border-outline-variant/30 bg-surface-container text-on-surface";
  }
}

export function ToastRegion() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] mx-auto flex max-w-container-max flex-col gap-3 px-margin-mobile md:bottom-6 md:px-margin-desktop"
    >
      {toasts.map((toast) => (
        <section
          key={toast.id}
          role="status"
          className={`pointer-events-auto border p-4 iron-bevel shadow-lg ${toneClass(toast.tone)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-label-md uppercase">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {toast.description}
                </p>
              ) : null}
              {toast.action ? (
                toast.action.href ? (
                  <Link
                    to={toast.action.href}
                    className="mt-2 inline-block font-label-sm uppercase text-primary underline hover:text-plasma-glow"
                  >
                    {toast.action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={toast.action.onClick}
                    className="mt-2 font-label-sm uppercase text-primary underline hover:text-plasma-glow"
                  >
                    {toast.action.label}
                  </button>
                )
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="rounded border border-outline-variant/30 p-1 text-on-surface-variant hover:border-primary/40 hover:text-primary"
            >
              <Icon name="close" />
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
