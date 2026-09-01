import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  buildQuotedFigureLines,
  formatPrintFigureLinesSummary,
} from "../order-shared/printRequest.js";
import { sendPrintQuoteReadyEmail } from "../order-shared/notifyPrintRequest.js";
import { createGuestPrintNotification } from "../order-shared/guestPrintNotification.js";
import { resolveContactEmail } from "../order-shared/resolveContactEmail.js";
import {
  normalizePrintServiceConfigRow,
  PRINT_SERVICE_CONFIG_KEY,
} from "../order-shared/printService.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["adminQuotePrintRequest"]["functionHandler"] =
  async (event) => {
    const printRequestId = event.arguments.printRequestId;
    const adminNotes = event.arguments.adminNotes?.trim() || undefined;
    const figureInputs = (event.arguments.figureLines ?? [])
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        sizeTierId: row.sizeTierId,
        quantity: row.quantity,
        ...(row.unitPriceCents != null
          ? { unitPriceCents: row.unitPriceCents }
          : {}),
      }));

    const { data: request, errors } = await dataClient.models.PrintRequest.get({
      id: printRequestId,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!request) {
      throw new Error("Print request not found.");
    }
    if (
      request.status !== "submitted" &&
      request.status !== "in_review" &&
      request.status !== "quoted"
    ) {
      throw new Error(
        `Cannot quote a request in status "${request.status ?? "unknown"}".`,
      );
    }

    const { data: configRow, errors: configErrors } =
      await dataClient.models.PrintServiceConfig.get({
        configKey: PRINT_SERVICE_CONFIG_KEY,
      });
    if (configErrors?.length) {
      throw new Error(configErrors.map((e) => e.message).join("; "));
    }
    const config = normalizePrintServiceConfigRow(configRow);
    if (!config) {
      throw new Error("Print service config is missing.");
    }

    const { figureLines, quoteCents } = buildQuotedFigureLines(
      config,
      figureInputs,
      request.resinTypeId,
    );

    const quotedAt = new Date().toISOString();
    const updateResult = await dataClient.models.PrintRequest.update({
      id: printRequestId,
      status: "quoted",
      figureLines: JSON.stringify(figureLines),
      quoteCents,
      quotedAt,
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    });
    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }

    let notificationSent = false;
    const siteUrl = (
      process.env.SITE_URL ?? "https://emperiumforgeworks.com"
    ).replace(/\/$/, "");
    const summary = formatPrintFigureLinesSummary(figureLines);
    const detailUrl = `${siteUrl}/account/print-requests/${printRequestId}`;

    const userId = request.userId?.trim();
    if (userId) {
      try {
        const result = await dataClient.models.Notification.create({
          title: "Your print quote is ready",
          body: `Your print quote is ready (${summary}). Total before shipping & tax: $${(quoteCents / 100).toFixed(2)}. Review and pay: ${detailUrl}`,
          kind: "order",
          userId,
          active: true,
          sortOrder: 86,
        });
        notificationSent = !result.errors?.length;
      } catch (err) {
        console.error("Quote notification failed", err);
      }
    }

    const guestId = request.guestId?.trim();
    if (guestId) {
      try {
        const created = await createGuestPrintNotification(dataClient, {
          guestId,
          title: "Your print quote is ready",
          body: `Your print quote is ready (${summary}). Total before shipping & tax: $${(quoteCents / 100).toFixed(2)}. Review and pay: ${detailUrl}`,
        });
        if (created) notificationSent = true;
      } catch (err) {
        console.error("Guest quote notification failed", err);
      }
    }

    const email = await resolveContactEmail(request);
    if (email) {
      try {
        const emailed = await sendPrintQuoteReadyEmail({
          email,
          printRequestId,
          originalFileName: request.originalFileName,
          summary,
          quoteCents,
        });
        if (emailed) notificationSent = true;
        else {
          console.warn(
            `Quote email not sent to ${email} (Resend key / Settings toggle / API error).`,
          );
        }
      } catch (err) {
        console.error("Quote email failed", err);
      }
    } else {
      console.warn(
        `Quote email skipped — no contact email on print request ${printRequestId} (guest email empty or Cognito lookup failed).`,
      );
    }

    return {
      success: true,
      quoteCents,
      notificationSent,
    };
  };
