import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { formatPrice, type Product } from "@/data/seedProducts";
import { parseJsonField } from "@/lib/productPayload";
import {
  formatProductShippingDisplay,
  resolveProductShippingProfile,
  type ProductShippingDisplay,
} from "@/lib/shippingProfiles";
import {
  getShippingProfileById,
  listAllShippingProfiles,
} from "@/services/shippingProfileService";

export function parseProductShippingDisplay(
  raw: unknown,
): ProductShippingDisplay | null {
  const parsed = parseJsonField(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const profileName =
    typeof row.profileName === "string" ? row.profileName.trim() : "";
  const rateLabel =
    typeof row.rateLabel === "string" ? row.rateLabel.trim() : "";
  if (!profileName || !rateLabel) return null;
  const readyToShipLabel =
    typeof row.readyToShipLabel === "string"
      ? row.readyToShipLabel.trim() || null
      : null;
  return { profileName, rateLabel, readyToShipLabel };
}

export function toProductShippingDisplayField(
  display: ProductShippingDisplay,
): string {
  return JSON.stringify(display);
}

/** Build snapshot stored on Product (survives guest ShippingProfile list/auth issues). */
export async function buildShippingDisplaySnapshot(
  client: AmplifyDataClient,
  input: {
    shippingProfileId?: string;
    weightOz?: number;
  },
): Promise<ProductShippingDisplay | null> {
  let profile = null;

  if (input.shippingProfileId) {
    profile = await getShippingProfileById(client, input.shippingProfileId);
    if (profile && profile.active === false) profile = null;
  }

  if (!profile) {
    const profiles = await listAllShippingProfiles(client);
    profile = resolveProductShippingProfile(
      { shippingProfileId: input.shippingProfileId },
      profiles,
    );
  }

  if (!profile) return null;

  return formatProductShippingDisplay(profile, {
    weightOz: input.weightOz,
    formatPrice,
  });
}

/**
 * Resolve shipping copy for PDP: product snapshot first, then live profile fetch.
 */
export async function resolveShippingDisplayForProduct(
  client: AmplifyDataClient,
  product: Product,
): Promise<{ display: ProductShippingDisplay | null; error: string | null }> {
  const snapshot = parseProductShippingDisplay(product.shippingDisplay);
  if (snapshot) {
    return { display: snapshot, error: null };
  }

  const model = client.models.ShippingProfile;
  if (!model) {
    return {
      display: null,
      error:
        "Shipping profiles are not available in this app build. Redeploy the backend and rebuild the frontend.",
    };
  }

  try {
    let profile = null;

    if (product.shippingProfileId) {
      const response = await model.get({ id: product.shippingProfileId });
      if (response.errors?.length) {
        throw new Error(response.errors.map((e) => e.message).join("; "));
      }
      if (response.data && response.data.active !== false) {
        profile = response.data;
      }
    }

    if (!profile) {
      const profiles = await listAllShippingProfiles(client);
      profile = resolveProductShippingProfile(product, profiles);
    }

    if (!profile) {
      return {
        display: null,
        error: product.shippingProfileId
          ? "Assigned shipping profile could not be loaded."
          : "No default shipping profile is configured.",
      };
    }

    return {
      display: formatProductShippingDisplay(profile, {
        weightOz: product.weightOz,
        formatPrice,
      }),
      error: null,
    };
  } catch (err) {
    return {
      display: null,
      error:
        err instanceof Error
          ? err.message
          : "Could not load shipping profile.",
    };
  }
}
