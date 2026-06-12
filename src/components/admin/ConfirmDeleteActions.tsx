type ConfirmDeleteActionsProps = {
  itemLabel: string;
  pending: boolean;
  busy?: boolean;
  onBegin: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

export function ConfirmDeleteActions({
  itemLabel,
  pending,
  busy = false,
  onBegin,
  onConfirm,
  onCancel,
  className = "",
}: ConfirmDeleteActionsProps) {
  if (!pending) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onBegin}
        className={`font-label-sm uppercase text-error hover:underline disabled:opacity-50 ${className}`}
      >
        Delete
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label={`Confirm delete ${itemLabel}`}
    >
      <span className="text-body-sm text-on-surface-variant">
        Delete &ldquo;{itemLabel}&rdquo;?
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="border border-outline-variant/30 px-2 py-1 font-label-sm uppercase text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="border border-error bg-error/10 px-2 py-1 font-label-sm uppercase text-error transition-colors hover:bg-error/20 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </button>
    </div>
  );
}
