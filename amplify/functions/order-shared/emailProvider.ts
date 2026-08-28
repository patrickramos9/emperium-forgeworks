/**
 * Transactional email via Resend (M20a).
 * Order-related → orders@; everything else → melissa@. Reply-To always melissa@.
 */

export type EmailKind = "order" | "general";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  kind: EmailKind;
};

const DEFAULT_ORDER_FROM = "orders@emperiumforgeworks.com";
const DEFAULT_GENERAL_FROM = "melissa@emperiumforgeworks.com";
const DEFAULT_REPLY_TO = "melissa@emperiumforgeworks.com";
const FROM_DISPLAY = "Emperium Forgeworks";

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function fromAddress(kind: EmailKind): string {
  const raw =
    kind === "order"
      ? (trimEnv("ORDER_EMAIL_FROM") ?? DEFAULT_ORDER_FROM)
      : (trimEnv("GENERAL_EMAIL_FROM") ?? DEFAULT_GENERAL_FROM);
  if (raw.includes("<")) return raw;
  return `${FROM_DISPLAY} <${raw}>`;
}

function replyToAddress(): string {
  return (
    trimEnv("EMAIL_REPLY_TO") ??
    trimEnv("SUPPORT_INBOX_EMAIL") ??
    DEFAULT_REPLY_TO
  );
}

function normalizeTo(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return list.map((a) => a.trim()).filter(Boolean);
}

/**
 * Sends via Resend HTTP API. Returns false when skipped (missing config) or API error.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = trimEnv("RESEND_API_KEY");
  const recipients = normalizeTo(input.to);

  if (!apiKey) {
    console.warn("Email skipped — set RESEND_API_KEY.");
    return false;
  }
  if (!recipients.length) {
    console.warn("Email skipped — no recipients.");
    return false;
  }

  const payload = {
    from: fromAddress(input.kind),
    to: recipients,
    reply_to: replyToAddress(),
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, "<br>"),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Resend send failed (${res.status}): ${body}`);
    return false;
  }

  return true;
}
