import { sendEmail } from "./emailProvider.js";

function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
}

async function sendPrintRequestEmail(input: {
  to: string;
  subject: string;
  text: string;
  channel: "print_quote" | "print_declined";
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to) {
    console.warn("Print request email skipped — missing recipient.");
    return false;
  }

  return sendEmail({
    to,
    subject: input.subject,
    text: input.text,
    kind: "general",
    channel: input.channel,
  });
}

/** Email guest (or any request with contact email) when a quote is ready. */
export async function sendPrintQuoteReadyEmail(input: {
  email: string;
  printRequestId: string;
  originalFileName: string;
  summary: string;
  quoteCents: number;
}): Promise<boolean> {
  const detailUrl = `${siteBaseUrl()}/account/print-requests/${input.printRequestId}`;
  const total = `$${(input.quoteCents / 100).toFixed(2)}`;
  const text = [
    "Your Emperium Forgeworks print quote is ready.",
    "",
    `File: ${input.originalFileName}`,
    `Breakdown: ${input.summary}`,
    `Total before shipping & tax: ${total}`,
    "",
    `Review and pay: ${detailUrl}`,
    "",
    "Open that link in the same browser you used to submit (guest requests are tied to this device until you create an account).",
  ].join("\n");

  return sendPrintRequestEmail({
    to: input.email,
    subject: "Your print quote is ready — Emperium Forgeworks",
    text,
    channel: "print_quote",
  });
}

/** Email when admin declines a print request. */
export async function sendPrintRequestDeclinedEmail(input: {
  email: string;
  printRequestId: string;
  originalFileName: string;
  adminNotes?: string;
}): Promise<boolean> {
  const detailUrl = `${siteBaseUrl()}/account/print-requests/${input.printRequestId}`;
  const notePart = input.adminNotes?.trim()
    ? `\n\nNote from the shop: ${input.adminNotes.trim()}`
    : "";
  const text = [
    "Your Emperium Forgeworks print request could not be accepted.",
    "",
    `File: ${input.originalFileName}${notePart}`,
    "",
    `Details: ${detailUrl}`,
  ].join("\n");

  return sendPrintRequestEmail({
    to: input.email,
    subject: "Print request update — Emperium Forgeworks",
    text,
    channel: "print_declined",
  });
}
