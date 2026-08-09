import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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
}): Promise<boolean> {
  const from = process.env.ORDER_NOTIFICATION_FROM_EMAIL?.trim();
  const to = input.to.trim();
  if (!to || !from) {
    console.warn(
      "Print request email skipped — missing recipient or ORDER_NOTIFICATION_FROM_EMAIL.",
    );
    return false;
  }

  const client = new SESClient({});
  await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: input.text, Charset: "UTF-8" },
          Html: {
            Data: input.text.replace(/\n/g, "<br>"),
            Charset: "UTF-8",
          },
        },
      },
    }),
  );
  return true;
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
  });
}
