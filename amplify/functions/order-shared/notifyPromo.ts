import { sendEmail } from "./emailProvider.js";
import { resolveContactEmail } from "./resolveContactEmail.js";

/** Email a signed-in customer when a promo grant is issued to their account. */
export async function sendPromoGrantEmailAlert(input: {
  userId: string;
  title: string;
  body: string;
}): Promise<boolean> {
  const to = await resolveContactEmail({ userId: input.userId });
  if (!to) {
    console.warn(
      `Promo grant email skipped — no Cognito email for userId ${input.userId}`,
    );
    return false;
  }

  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
  const accountUrl = `${siteUrl}/account`;

  const text = [
    input.title.trim() || "New offer on your account",
    "",
    input.body.trim(),
    "",
    `View your account: ${accountUrl}`,
    "",
    "Offers apply automatically at checkout when you are signed in.",
  ].join("\n");

  return sendEmail({
    to,
    subject: input.title.trim() || "New offer from Emperium Forgeworks",
    text,
    kind: "general",
    channel: "promo_grant",
  });
}
