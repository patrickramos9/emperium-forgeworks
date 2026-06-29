import { configureAmplify } from "@/lib/amplify";
import {
  getAdminDataClient,
  getGuestDataClient,
  type AmplifyDataClient,
} from "@/lib/amplifyDataClient";
import { toJsonField } from "@/lib/productPayload";
import {
  defaultPrintServiceConfig,
  normalizePrintServiceConfig,
  PRINT_SERVICE_CONFIG_KEY,
  type PrintServiceConfigData,
} from "@/lib/printService";

/** Backend deployed with M21 schema (PrintServiceConfig in amplify_outputs). */
export async function isPrintServiceConfigDeployed(): Promise<boolean> {
  await configureAmplify();
  const client = await getGuestDataClient();
  return Boolean(client?.models.PrintServiceConfig);
}

function configWhenNotDeployed(): PrintServiceConfigData {
  return defaultPrintServiceConfig();
}

/** Defaults used when the model exists but no row has been saved yet. */
function configWhenUnseeded(): PrintServiceConfigData {
  return { ...defaultPrintServiceConfig(), active: true };
}

export async function fetchPrintServiceConfig(): Promise<PrintServiceConfigData> {
  await configureAmplify();
  const client = await getGuestDataClient();
  if (!client?.models.PrintServiceConfig) {
    return configWhenNotDeployed();
  }

  const { data, errors } = await client.models.PrintServiceConfig.get({
    configKey: PRINT_SERVICE_CONFIG_KEY,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  if (!data) {
    return configWhenUnseeded();
  }

  return normalizePrintServiceConfig(data) ?? configWhenUnseeded();
}

function requirePrintServiceConfigModel(client: AmplifyDataClient) {
  const model = client.models.PrintServiceConfig;
  if (!model) {
    throw new Error(
      "PrintServiceConfig model is not deployed. Redeploy the backend and refresh amplify_outputs.json.",
    );
  }
  return model;
}

export async function savePrintServiceConfig(
  config: PrintServiceConfigData,
): Promise<void> {
  await configureAmplify();
  const client = await getAdminDataClient();
  if (!client) {
    throw new Error("Admin sign-in is required to save print service settings.");
  }

  const PrintServiceConfig = requirePrintServiceConfigModel(client);

  const payload = {
    configKey: PRINT_SERVICE_CONFIG_KEY,
    active: config.active,
    catalogProductSlug: config.catalogProductSlug,
    policyMarkdown: config.policyMarkdown,
    maxFileBytes: config.maxFileBytes,
    sizeTiers: toJsonField(config.sizeTiers),
    resinTypes: toJsonField(config.resinTypes),
    resinColors: toJsonField(config.resinColors),
  };

  const existing = await PrintServiceConfig.get({
    configKey: PRINT_SERVICE_CONFIG_KEY,
  });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const result = existing.data
    ? await PrintServiceConfig.update(payload)
    : await PrintServiceConfig.create(payload);

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
