import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  normalizePrintServiceConfigRow,
  PRINT_SERVICE_CONFIG_KEY,
} from "../order-shared/printService.js";
import { verifyGuestToken } from "../guest-shared/cookie.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type AppSyncEvent = {
  fieldName?: string;
  info?: { fieldName?: string };
  identity?: { sub?: string } | null;
  arguments: {
    uploadId?: string;
    storagePath?: string;
    originalFileName?: string;
    resinTypeId?: string;
    resinColorId?: string;
    customerNotes?: string | null;
    guestId?: string | null;
    guestToken?: string | null;
    email?: string | null;
    printRequestId?: string | null;
  };
};

function resolveFieldName(event: AppSyncEvent): string {
  return event.fieldName ?? event.info?.fieldName ?? "";
}

async function requireGuestId(event: AppSyncEvent): Promise<string> {
  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";
  if (!(await verifyGuestToken(guestId, guestToken))) {
    throw new Error("Invalid or missing guest session.");
  }
  return guestId;
}

function normalizeEmail(raw: string | null | undefined): string {
  const email = raw?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    throw new Error("A valid contact email is required.");
  }
  return email;
}

function toGuestItem(row: Schema["PrintRequest"]["type"]) {
  return {
    id: row.id,
    guestId: row.guestId ?? undefined,
    email: row.email ?? undefined,
    status: row.status,
    uploadId: row.uploadId,
    storagePath: row.storagePath,
    originalFileName: row.originalFileName,
    resinTypeId: row.resinTypeId,
    resinTypeLabel: row.resinTypeLabel,
    resinColorId: row.resinColorId,
    resinColorLabel: row.resinColorLabel,
    customerNotes: row.customerNotes ?? undefined,
    adminNotes: row.adminNotes ?? undefined,
    figureLines: row.figureLines ?? undefined,
    quoteCents: row.quoteCents ?? undefined,
    quotedAt: row.quotedAt ?? undefined,
    orderId: row.orderId ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

async function handleGetGuestPrintRequests(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const printRequestId = event.arguments.printRequestId?.trim();

  if (printRequestId) {
    const { data, errors } = await dataClient.models.PrintRequest.get({
      id: printRequestId,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!data || data.guestId !== guestId) {
      return { requests: [] };
    }
    return { requests: [toGuestItem(data)] };
  }

  const rows: ReturnType<typeof toGuestItem>[] = [];
  let nextToken: string | undefined;
  do {
    const response = await dataClient.models.PrintRequest.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(toGuestItem(row));
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return { requests: rows };
}

async function handleSubmit(event: AppSyncEvent) {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;

  let guestId: string | undefined;
  let email: string | undefined;
  if (!userId) {
    guestId = await requireGuestId(event);
    email = normalizeEmail(event.arguments.email);
  }

  const uploadId = event.arguments.uploadId?.trim() ?? "";
  const storagePath = event.arguments.storagePath?.trim() ?? "";
  const originalFileName = event.arguments.originalFileName?.trim() ?? "";
  const resinTypeId = event.arguments.resinTypeId?.trim() ?? "";
  const resinColorId = event.arguments.resinColorId?.trim() ?? "";
  const customerNotes = event.arguments.customerNotes?.trim() || undefined;

  if (!uploadId || !storagePath || !originalFileName) {
    throw new Error("Upload details are incomplete.");
  }
  if (!storagePath.startsWith("print-jobs/")) {
    throw new Error("Invalid upload path.");
  }
  if (!resinTypeId || !resinColorId) {
    throw new Error("Select a resin type and color.");
  }

  const { data: configRow, errors: configErrors } =
    await dataClient.models.PrintServiceConfig.get({
      configKey: PRINT_SERVICE_CONFIG_KEY,
    });
  if (configErrors?.length) {
    throw new Error(configErrors.map((e) => e.message).join("; "));
  }
  const config = normalizePrintServiceConfigRow(configRow);
  if (!config?.active) {
    throw new Error("Printing as a Service is not available right now.");
  }

  const resinType = config.resinTypes.find((row) => row.id === resinTypeId);
  const resinColor = config.resinColors.find((row) => row.id === resinColorId);
  if (!resinType || !resinColor) {
    throw new Error("Selected resin options are no longer available.");
  }
  if (
    resinColor.resinTypeIds?.length &&
    !resinColor.resinTypeIds.includes(resinTypeId)
  ) {
    throw new Error("That color is not available for the selected resin type.");
  }

  const { data, errors } = await dataClient.models.PrintRequest.create({
    ...(userId ? { userId } : {}),
    ...(guestId ? { guestId } : {}),
    ...(email ? { email } : {}),
    status: "submitted",
    uploadId,
    storagePath,
    originalFileName,
    resinTypeId: resinType.id,
    resinTypeLabel: resinType.label,
    resinColorId: resinColor.id,
    resinColorLabel: resinColor.label,
    ...(customerNotes ? { customerNotes } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.id) {
    throw new Error("Could not create print request.");
  }

  return {
    success: true,
    printRequestId: data.id,
  };
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  if (fieldName === "getGuestPrintRequests") {
    return handleGetGuestPrintRequests(event);
  }
  if (
    event.arguments.guestId &&
    event.arguments.guestToken &&
    !event.arguments.uploadId
  ) {
    return handleGetGuestPrintRequests(event);
  }
  return handleSubmit(event);
};
