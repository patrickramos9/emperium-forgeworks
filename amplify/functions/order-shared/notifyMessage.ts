import { sendEmail } from "./emailProvider.js";

/** Email guest (or any thread with customerEmail) when the shop posts a new message. */
export async function sendNewMessageEmailAlert(input: {
  to: string;
  subject: string;
  conversationId: string;
  previewBody?: string;
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to) return false;

  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
  const threadUrl = `${siteUrl}/account/messages/${input.conversationId}`;
  const preview = input.previewBody?.trim();
  const previewLines =
    preview && preview !== "(Photo attached)"
      ? ["", preview.length > 280 ? `${preview.slice(0, 277)}…` : preview, ""]
      : [""];

  const text = [
    "You have a new message from Emperium Forgeworks.",
    "",
    `Subject: ${input.subject}`,
    ...previewLines,
    `View the conversation: ${threadUrl}`,
    "",
    "Open that link in the same browser you used before if you are shopping as a guest.",
  ].join("\n");

  return sendEmail({
    to,
    subject: `New message — ${input.subject}`,
    text,
    kind: "general",
    channel: "shop_message",
  });
}
