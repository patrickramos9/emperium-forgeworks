/**
 * Transactional email via Resend (M20a).
 * Order-related → orders@; everything else → melissa@. Reply-To always melissa@.
 * Per-path toggles live on CatalogSettings (Admin → Settings).
 */

export type EmailKind = "order" | "general";

/** Matches Admin Settings email channel toggles. */
export type EmailChannel =
  | "new_order_support"
  | "order_paid"
  | "order_shipped"
  | "shop_message"
  | "print_quote"
  | "print_declined";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  kind: EmailKind;
  channel: EmailChannel;
};

const DEFAULT_ORDER_FROM = "orders@emperiumforgeworks.com";
const DEFAULT_GENERAL_FROM = "melissa@emperiumforgeworks.com";
const DEFAULT_REPLY_TO = "melissa@emperiumforgeworks.com";
const FROM_DISPLAY = "Emperium Forgeworks";

const CHANNEL_FIELD: Record<EmailChannel, string> = {
  new_order_support: "emailNewOrderSupportEnabled",
  order_paid: "emailOrderPaidEnabled",
  order_shipped: "emailOrderShippedEnabled",
  shop_message: "emailShopMessageEnabled",
  print_quote: "emailPrintQuoteEnabled",
  print_declined: "emailPrintDeclinedEnabled",
};

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
 * Sends via Resend HTTP API. Returns false when skipped (missing config,
 * admin disabled email, or API error).
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const gate = await loadEmailGate(input.channel);
  if (!gate.allowed) {
    console.warn(`Email skipped — ${gate.reason}`);
    return false;
  }

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

async function loadEmailGate(
  channel: EmailChannel,
): Promise<{ allowed: boolean; reason: string }> {
  try {
    const { generateClient } = await import("aws-amplify/data");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = generateClient() as any;
    const model = client.models?.CatalogSettings;
    if (!model?.get) return { allowed: true, reason: "" };

    const { data, errors } = await model.get({ settingsKey: "store" });
    if (errors?.length) {
      console.warn("Email settings read failed; sending anyway", errors);
      return { allowed: true, reason: "" };
    }

    if (data?.emailNotificationsEnabled === false) {
      return {
        allowed: false,
        reason: "master emailNotificationsEnabled is off in Settings",
      };
    }

    const field = CHANNEL_FIELD[channel];
    if (data?.[field] === false) {
      return {
        allowed: false,
        reason: `${field} is off in Settings`,
      };
    }

    return { allowed: true, reason: "" };
  } catch (err) {
    console.warn("Email settings check failed; sending anyway", err);
    return { allowed: true, reason: "" };
  }
}
