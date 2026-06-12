import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { getCustomerUserId } from "@/lib/customerAuth";

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

export function isReviewApproved(review: ReviewRecord): boolean {
  return review.approved === true;
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

  return rows
    .sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""))
    .slice(0, limit);
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

  return rows.sort(
    (a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
  );
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

  return rows;
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

  const result = await client.models.Review.create({
    orderId: input.orderId,
    userId,
    rating,
    text,
    displayName: input.displayName?.trim() || undefined,
    approved: false,
    source: "site",
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
  const result = await client.models.Review.create({
    orderId,
    userId: IMPORTED_REVIEW_USER_ID,
    rating,
    text,
    displayName: input.displayName?.trim() || undefined,
    approved: input.approved ?? true,
    source: input.source ?? "etsy",
    images: images?.length ? images : undefined,
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

export async function deleteReview(
  client: AmplifyDataClient,
  orderId: string,
): Promise<void> {
  const result = await client.models.Review.delete({ orderId });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}
