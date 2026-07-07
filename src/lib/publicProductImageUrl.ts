import outputs from "../../amplify_outputs.json";
import { isStoragePath, normalizeImageRef } from "./productImageRefs";

type StorageOutputs = {
  storage?: {
    aws_region?: string;
    bucket_name?: string;
    buckets?: Array<{
      aws_region?: string;
      bucket_name?: string;
    }>;
  };
};

/** S3 bucket + region for catalog images (from amplify_outputs.json). */
export function getProductImageBucketConfig(): {
  bucket: string;
  region: string;
} | null {
  const storage = (outputs as StorageOutputs).storage;
  const bucket =
    storage?.bucket_name ?? storage?.buckets?.[0]?.bucket_name ?? "";
  const region = storage?.aws_region ?? storage?.buckets?.[0]?.aws_region ?? "";
  if (!bucket || !region) return null;
  return { bucket, region };
}

/** Percent-encode each path segment for a stable S3 object URL. */
export function encodeS3ObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** True when the ref resolves to a catalog image under products/*. */
export function isPublicProductImagePath(ref: string): boolean {
  const path = normalizeImageRef(ref);
  return path.startsWith("products/");
}

/**
 * Stable, anonymously readable URL for catalog images (products/* only).
 * Requires S3 bucket policy from amplify/backend.ts (M13).
 */
export function buildPublicProductImageUrl(ref: string): string | undefined {
  const path = normalizeImageRef(ref);
  if (!path.startsWith("products/")) return undefined;

  const config = getProductImageBucketConfig();
  if (!config) return undefined;

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodeS3ObjectKey(path)}`;
}

/** Resolve a stored ref to a browser- or feed-ready image URL. */
export function resolveCatalogImageUrl(ref: string | undefined): string | undefined {
  if (!ref?.trim()) return undefined;
  const path = normalizeImageRef(ref);
  if (isStoragePath(path)) {
    return buildPublicProductImageUrl(path) ?? undefined;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}
