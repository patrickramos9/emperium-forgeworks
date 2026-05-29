const STORAGE_PREFIXES = ["products/", "sculptors/"] as const;

export function isStoragePath(ref: string): boolean {
  return STORAGE_PREFIXES.some((prefix) => ref.startsWith(prefix));
}

/** Normalize stored image values to S3 paths when possible. */
export function normalizeImageRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return trimmed;
  if (isStoragePath(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes(".s3.") && url.hostname.endsWith(".amazonaws.com")) {
      const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (isStoragePath(path)) return path;
    }
  } catch {
    /* static paths like /images/foo.png */
  }

  return trimmed;
}

export function normalizeImageRefs(refs: string[]): string[] {
  return refs.map(normalizeImageRef).filter(Boolean);
}
