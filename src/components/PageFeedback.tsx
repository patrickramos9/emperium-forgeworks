import type { ReactNode } from "react";

type PageFeedbackTone = "info" | "success" | "error";

const toneClass: Record<PageFeedbackTone, string> = {
  info: "border-outline-variant/30 bg-surface-container-low text-on-surface",
  success: "border-secondary/30 bg-surface-container-low text-secondary",
  error: "border-error/40 bg-error/10 text-error",
};

type PageFeedbackProps = {
  tone?: PageFeedbackTone;
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
};

/** Inline status / error banner — matches shop catalog feedback styling (M9a). */
export function PageFeedback({
  tone = "info",
  children,
  className = "",
  role = tone === "error" ? "alert" : "status",
}: PageFeedbackProps) {
  return (
    <p
      role={role}
      className={`mb-4 border p-3 text-body-sm ${toneClass[tone]} ${className}`}
    >
      {children}
    </p>
  );
}
