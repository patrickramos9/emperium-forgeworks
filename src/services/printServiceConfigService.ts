import { configureAmplify } from "@/lib/amplify";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import {
  defaultPrintServiceConfig,
  normalizePrintServiceConfig,
  PRINT_SERVICE_CONFIG_KEY,
  type PrintServiceConfigData,
} from "@/lib/printService";

export async function fetchPrintServiceConfig(): Promise<PrintServiceConfigData> {
  await configureAmplify();
  const client = await getGuestDataClient();
  if (!client?.models.PrintServiceConfig) {
    return defaultPrintServiceConfig();
  }

  const { data, errors } = await client.models.PrintServiceConfig.get({
    configKey: PRINT_SERVICE_CONFIG_KEY,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return normalizePrintServiceConfig(data) ?? defaultPrintServiceConfig();
}

export async function savePrintServiceConfig(
  config: PrintServiceConfigData,
): Promise<void> {
  await configureAmplify();
  const client = await getGuestDataClient();
  if (!client?.models.PrintServiceConfig) {
    throw new Error("PrintServiceConfig model is not deployed.");
  }

  const payload = {
    configKey: PRINT_SERVICE_CONFIG_KEY,
    active: config.active,
    catalogProductSlug: config.catalogProductSlug,
    policyMarkdown: config.policyMarkdown,
    maxFileBytes: config.maxFileBytes,
    sizeTiers: JSON.stringify(config.sizeTiers),
    resinTypes: JSON.stringify(config.resinTypes),
    resinColors: JSON.stringify(config.resinColors),
  };

  const existing = await client.models.PrintServiceConfig.get({
    configKey: PRINT_SERVICE_CONFIG_KEY,
  });

  const result = existing.data
    ? await client.models.PrintServiceConfig.update(payload)
    : await client.models.PrintServiceConfig.create(payload);

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}

export async function resolvePrintCatalogProduct(
  config: PrintServiceConfigData,
) {
  await configureAmplify();
  const client = await getGuestDataClient();
  if (!client) return null;

  const slug = config.catalogProductSlug.trim();
  const response = await client.models.Product.list({
    filter: { slug: { eq: slug } },
    limit: 1,
  });
  if (response.errors?.length) {
    throw new Error(response.errors.map((e) => e.message).join("; "));
  }
  return response.data?.[0] ?? null;
}
