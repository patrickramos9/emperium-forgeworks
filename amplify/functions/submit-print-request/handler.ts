import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  normalizePrintServiceConfigRow,
  PRINT_SERVICE_CONFIG_KEY,
} from "../order-shared/printService.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["submitPrintRequest"]["functionHandler"] = async (
  event,
) => {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;
  if (!userId) {
    throw new Error("Sign in to submit a print request.");
  }

  const uploadId = event.arguments.uploadId.trim();
  const storagePath = event.arguments.storagePath.trim();
  const originalFileName = event.arguments.originalFileName.trim();
  const resinTypeId = event.arguments.resinTypeId.trim();
  const resinColorId = event.arguments.resinColorId.trim();
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
    userId,
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
};
