import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import {
  parsePrintFigureLines,
  type PrintFigureLine,
  type PrintFigureLineInput,
  type PrintRequestRecord,
  type PrintRequestStatus,
} from "@/lib/printRequest";

function mapPrintRequest(
  row: {
    id: string;
    userId?: string | null;
    status?: string | null;
    uploadId?: string | null;
    storagePath?: string | null;
    originalFileName?: string | null;
    resinTypeId?: string | null;
    resinTypeLabel?: string | null;
    resinColorId?: string | null;
    resinColorLabel?: string | null;
    customerNotes?: string | null;
    adminNotes?: string | null;
    figureLines?: unknown;
    quoteCents?: number | null;
    quotedAt?: string | null;
    orderId?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  },
): PrintRequestRecord | null {
  if (
    !row.userId ||
    !row.uploadId ||
    !row.storagePath ||
    !row.originalFileName ||
    !row.resinTypeId ||
    !row.resinTypeLabel ||
    !row.resinColorId ||
    !row.resinColorLabel ||
    !row.status
  ) {
    return null;
  }

  return {
    id: row.id,
    userId: row.userId,
    status: row.status as PrintRequestStatus,
    uploadId: row.uploadId,
    storagePath: row.storagePath,
    originalFileName: row.originalFileName,
    resinTypeId: row.resinTypeId,
    resinTypeLabel: row.resinTypeLabel,
    resinColorId: row.resinColorId,
    resinColorLabel: row.resinColorLabel,
    customerNotes: row.customerNotes,
    adminNotes: row.adminNotes,
    figureLines: parsePrintFigureLines(row.figureLines),
    quoteCents: row.quoteCents,
    quotedAt: row.quotedAt,
    orderId: row.orderId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function submitPrintRequest(
  client: AmplifyDataClient,
  input: {
    uploadId: string;
    storagePath: string;
    originalFileName: string;
    resinTypeId: string;
    resinColorId: string;
    customerNotes?: string;
  },
): Promise<string> {
  if (!client.mutations.submitPrintRequest) {
    throw new Error(
      "Print requests are not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.submitPrintRequest({
    uploadId: input.uploadId,
    storagePath: input.storagePath,
    originalFileName: input.originalFileName,
    resinTypeId: input.resinTypeId,
    resinColorId: input.resinColorId,
    ...(input.customerNotes?.trim()
      ? { customerNotes: input.customerNotes.trim() }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.printRequestId) {
    throw new Error("Could not submit print request.");
  }
  return data.printRequestId;
}

export async function listMyPrintRequests(
  client: AmplifyDataClient,
): Promise<PrintRequestRecord[]> {
  const model = client.models.PrintRequest;
  if (!model) return [];

  const rows: PrintRequestRecord[] = [];
  let nextToken: string | undefined;
  do {
    const response = await model.list({ limit: 50, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (!row) continue;
      const mapped = mapPrintRequest(row);
      if (mapped) rows.push(mapped);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export async function listAllPrintRequests(
  client: AmplifyDataClient,
): Promise<PrintRequestRecord[]> {
  return listMyPrintRequests(client);
}

export async function getPrintRequestById(
  client: AmplifyDataClient,
  id: string,
): Promise<PrintRequestRecord | null> {
  const model = client.models.PrintRequest;
  if (!model) return null;
  const { data, errors } = await model.get({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ? mapPrintRequest(data) : null;
}

export async function adminQuotePrintRequest(
  client: AmplifyDataClient,
  input: {
    printRequestId: string;
    figureLines: PrintFigureLineInput[];
    adminNotes?: string;
  },
): Promise<{ quoteCents: number; notificationSent: boolean }> {
  if (!client.mutations.adminQuotePrintRequest) {
    throw new Error(
      "Print quote is not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.adminQuotePrintRequest({
    printRequestId: input.printRequestId,
    figureLines: input.figureLines,
    ...(input.adminNotes?.trim()
      ? { adminNotes: input.adminNotes.trim() }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not save quote.");
  }
  return {
    quoteCents: data.quoteCents,
    notificationSent: data.notificationSent,
  };
}

export async function adminDeclinePrintRequest(
  client: AmplifyDataClient,
  input: { printRequestId: string; adminNotes?: string },
): Promise<{ notificationSent: boolean }> {
  if (!client.mutations.adminDeclinePrintRequest) {
    throw new Error(
      "Print decline is not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.adminDeclinePrintRequest({
    printRequestId: input.printRequestId,
    ...(input.adminNotes?.trim()
      ? { adminNotes: input.adminNotes.trim() }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not decline print request.");
  }
  return { notificationSent: data.notificationSent };
}

export async function createPrintQuoteCheckout(
  client: AmplifyDataClient,
  printRequestId: string,
): Promise<{ redirectUrl: string }> {
  if (!client.mutations.createPrintQuoteCheckoutSession) {
    throw new Error(
      "Print quote checkout is not deployed. Redeploy the Amplify backend.",
    );
  }

  const siteUrl = window.location.origin;
  const { data, errors } = await client.mutations.createPrintQuoteCheckoutSession(
    {
      printRequestId,
      successUrl: `${siteUrl}/checkout/success?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/account/print-requests/${printRequestId}`,
    },
  );

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.redirectUrl) {
    throw new Error("Could not start quote checkout.");
  }
  return { redirectUrl: data.redirectUrl };
}

export type { PrintFigureLine, PrintRequestRecord };
