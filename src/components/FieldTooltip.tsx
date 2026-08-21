import { useId, useState, type ReactNode } from "react";

/** Accessible hover/focus tooltip for form field labels. */
export function FieldTooltip({
  text,
  label = "More info",
}: {
  text: string;
  label?: string;
}) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-outline-variant/50 text-[10px] font-label-sm leading-none text-on-surface-variant hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ?
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 border border-outline-variant/30 bg-surface-container-highest px-3 py-2 text-left text-body-sm font-normal normal-case tracking-normal text-on-surface shadow-md"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function FieldLabel({
  children,
  tooltip,
  htmlFor,
}: {
  children: ReactNode;
  tooltip?: string;
  htmlFor?: string;
}) {
  const content = (
    <>
      {children}
      {tooltip ? <FieldTooltip text={tooltip} /> : null}
    </>
  );

  if (htmlFor) {
    return (
      <label
        htmlFor={htmlFor}
        className="inline-flex items-center font-label-sm uppercase text-on-surface-variant"
      >
        {content}
      </label>
    );
  }

  return (
    <span className="inline-flex items-center font-label-sm uppercase text-on-surface-variant">
      {content}
    </span>
  );
}
