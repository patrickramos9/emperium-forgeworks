import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { ETSY_SHOP_REVIEWS_URL } from "@/lib/config";
import type { Schema } from "../../amplify/data/resource";
import { getCustomerUserId } from "@/lib/customerAuth";
import { parseOrderLineItems } from "@/services/orderService";
import type { OrderRecord } from "@/services/orderService";

export type ReviewRecord = Schema["Review"]["type"];
export type ReviewSource = NonNullable<ReviewRecord["source"]>;

/** Placeholder owner for admin-imported testimonials (not a real Cognito user). */
export const IMPORTED_REVIEW_USER_ID = "imported";

export function reviewDisplayName(review: ReviewRecord): string {
  const name = review.displayName?.trim();
  return name || "Verified Customer";
}

export function reviewSource(review: ReviewRecord): ReviewSource {
  return review.source ?? "site";
}

export function isImportedReview(review: ReviewRecord): boolean {
  return reviewSource(review) === "etsy";
}

export function reviewBadgeLabel(review: ReviewRecord): string {
  return isImportedReview(review) ? "Etsy Customer" : "Verified Purchase";
}

/** Outbound Etsy URL for imported reviews (custom `sourceUrl` or shop reviews page). */
export function reviewEtsyUrl(review: ReviewRecord): string | null {
  if (!isImportedReview(review)) return null;
  const custom = review.sourceUrl?.trim();
  return custom || ETSY_SHOP_REVIEWS_URL;
}

export function normalizeReviewSourceUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Etsy review link must be a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Etsy review link must use https.");
  }
  if (!/(^|\.)etsy\.com$/i.test(url.hostname)) {
    throw new Error("Etsy review link must be an etsy.com URL.");
  }
  return url.toString();
}

export function isReviewApproved(review: ReviewRecord): boolean {
  return review.approved === true;
}

/** Date shown and used for ordering — `reviewedAt` when set, else `createdAt`. */
export function reviewTimestamp(
  review: Pick<ReviewRecord, "reviewedAt" | "createdAt">,
): string | null {
  return review.reviewedAt ?? review.createdAt ?? null;
}

export function formatReviewDate(
  review: Pick<ReviewRecord, "reviewedAt" | "createdAt">,
): string {
  const value = reviewTimestamp(review);
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function compareReviewsByDate(
  a: Pick<ReviewRecord, "reviewedAt" | "createdAt">,
  b: Pick<ReviewRecord, "reviewedAt" | "createdAt">,
): number {
  return Date.parse(reviewTimestamp(b) ?? "") - Date.parse(reviewTimestamp(a) ?? "");
}

/** `YYYY-MM-DD` for `<input type="date">` from a review timestamp. */
export function reviewDateInputValue(
  review: Pick<ReviewRecord, "reviewedAt" | "createdAt">,
): string {
  const value = reviewTimestamp(review);
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local calendar date → ISO datetime (noon local to avoid timezone day-shift). */
export function reviewDateInputToIso(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Review date must be a valid calendar date.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Review date must be a valid calendar date.");
  }
  return date.toISOString();
}

/** Link a review to a product when the order contains a single catalog item. */
export function primaryProductSlugFromLineItems(
  lineItems: OrderRecord["lineItems"],
): string | undefined {
  const items = parseOrderLineItems(lineItems);
  const slugs = [
    ...new Set(items.map((item) => item.slug.trim()).filter(Boolean)),
  ];
  return slugs.length === 1 ? slugs[0] : undefined;
}

export async function listApprovedReviewsForProduct(
  client: AmplifyDataClient,
  productSlug: string,
): Promise<ReviewRecord[]> {
  const rows: ReviewRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Review.list({
      limit: 100,
      nextToken,
      filter: { productSlug: { eq: productSlug } },
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row && isReviewApproved(row)) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(compareReviewsByDate);
}

export function reviewImagePaths(review: ReviewRecord): string[] {
  return (review.images ?? []).filter(
    (path): path is string => Boolean(path?.trim()),
  );
}

export function generateImportedReviewId(): string {
  return `etsy-${crypto.randomUUID()}`;
}

export async function listApprovedReviews(
  client: AmplifyDataClient,
  limit = 50,
): Promise<ReviewRecord[]> {
  const rows: ReviewRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Review.list({
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row && isReviewApproved(row)) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(compareReviewsByDate).slice(0, limit);
}

export async function listAllReviews(
  client: AmplifyDataClient,
): Promise<ReviewRecord[]> {
  const rows: ReviewRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Review.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(compareReviewsByDate);
}

export async function listMyReviews(
  client: AmplifyDataClient,
): Promise<ReviewRecord[]> {
  const userId = await getCustomerUserId();
  if (!userId) return [];

  const rows: ReviewRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Review.list({
      limit: 100,
      nextToken,
      filter: { userId: { eq: userId } },
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(compareReviewsByDate);
}

export async function getReviewForOrder(
  client: AmplifyDataClient,
  orderId: string,
): Promise<ReviewRecord | null> {
  const { data, errors } = await client.models.Review.get({ orderId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

export type CreateReviewInput = {
  orderId: string;
  rating: number;
  text: string;
  displayName?: string;
  lineItems?: OrderRecord["lineItems"];
};

export async function createReview(
  client: AmplifyDataClient,
  input: CreateReviewInput,
): Promise<ReviewRecord> {
  const userId = await getCustomerUserId();
  if (!userId) {
    throw new Error("Sign in to leave a review.");
  }

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }

  const text = input.text.trim();
  if (text.length < 10) {
    throw new Error("Review must be at least 10 characters.");
  }

  const existing = await getReviewForOrder(client, input.orderId);
  if (existing) {
    throw new Error("You already reviewed this order.");
  }

  const productSlug = input.lineItems
    ? primaryProductSlugFromLineItems(input.lineItems)
    : undefined;

  const result = await client.models.Review.create({
    orderId: input.orderId,
    userId,
    rating,
    text,
    displayName: input.displayName?.trim() || undefined,
    approved: false,
    source: "site",
    reviewedAt: new Date().toISOString(),
    ...(productSlug ? { productSlug } : {}),
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Could not save review.");
  }
  return result.data;
}

export type CreateImportedReviewInput = {
  rating: number;
  text: string;
  displayName?: string;
  approved?: boolean;
  source?: Extract<ReviewSource, "etsy">;
  orderId?: string;
  images?: string[];
  productSlug?: string;
  sourceUrl?: string;
  reviewedAt?: string;
};

export async function createImportedReview(
  client: AmplifyDataClient,
  input: CreateImportedReviewInput,
): Promise<ReviewRecord> {
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }

  const text = input.text.trim();
  if (text.length < 10) {
    throw new Error("Review must be at least 10 characters.");
  }

  const orderId = input.orderId ?? generateImportedReviewId();
  const images = input.images?.filter(Boolean);
  const productSlug = input.productSlug?.trim();
  const sourceUrl = normalizeReviewSourceUrl(input.sourceUrl);
  const reviewedAt = input.reviewedAt?.trim() || new Date().toISOString();
  const result = await client.models.Review.create({
    orderId,
    userId: IMPORTED_REVIEW_USER_ID,
    rating,
    text,
    displayName: input.displayName?.trim() || undefined,
    approved: input.approved ?? true,
    source: input.source ?? "etsy",
    reviewedAt,
    images: images?.length ? images : undefined,
    ...(productSlug ? { productSlug } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Could not save imported review.");
  }
  return result.data;
}

export async function setReviewApproved(
  client: AmplifyDataClient,
  orderId: string,
  approved: boolean,
): Promise<void> {
  const result = await client.models.Review.update({ orderId, approved });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}

/** Assign (or clear) which product this review appears on / counts toward. */
export async function setReviewProductSlug(
  client: AmplifyDataClient,
  orderId: string,
  productSlug: string | null,
): Promise<ReviewRecord> {
  const slug = productSlug?.trim() || null;
  const result = await client.models.Review.update({
    orderId,
    // Amplify clears optional string fields with null.
    productSlug: slug as string | null | undefined,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Could not update review product.");
  }
  return result.data;
}

export async function setReviewReviewedAt(
  client: AmplifyDataClient,
  orderId: string,
  reviewedAt: string | null,
): Promise<ReviewRecord> {
  const result = await client.models.Review.update({
    orderId,
    reviewedAt: reviewedAt as string | null | undefined,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Could not update review date.");
  }
  return result.data;
}

/** Set or clear the outbound Etsy (or listing) URL for an imported review. */
export async function setReviewSourceUrl(
  client: AmplifyDataClient,
  orderId: string,
  sourceUrl: string | null,
): Promise<ReviewRecord> {
  const normalized = normalizeReviewSourceUrl(sourceUrl);
  const result = await client.models.Review.update({
    orderId,
    sourceUrl: normalized as string | null | undefined,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Could not update Etsy review link.");
  }
  return result.data;
}

export async function deleteReview(
  client: AmplifyDataClient,
  orderId: string,
): Promise<void> {
  const result = await client.models.Review.delete({ orderId });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}
