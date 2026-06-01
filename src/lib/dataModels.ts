import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

const DEPLOY_HINT =
  "Deploy the backend first (push to main or run `npm run sandbox`) so new data models are available.";

export function requireAnnouncementModel(client: AmplifyDataClient) {
  const model = client.models.Announcement;
  if (!model) {
    throw new Error(`Announcements are not available in this environment. ${DEPLOY_HINT}`);
  }
  return model;
}

export function requireVaultAccessModel(client: AmplifyDataClient) {
  const model = client.models.VaultAccess;
  if (!model) {
    throw new Error(`Vault access is not available in this environment. ${DEPLOY_HINT}`);
  }
  return model;
}

export function hasAnnouncementModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.Announcement);
}

export function hasVaultAccessModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.VaultAccess);
}

export function requireNotificationModel(client: AmplifyDataClient) {
  const model = client.models.Notification;
  if (!model) {
    throw new Error(`Notifications are not available in this environment. ${DEPLOY_HINT}`);
  }
  return model;
}

export function hasNotificationModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.Notification);
}

export function requireReviewModel(client: AmplifyDataClient) {
  const model = client.models.Review;
  if (!model) {
    throw new Error(`Reviews are not available in this environment. ${DEPLOY_HINT}`);
  }
  return model;
}

export function hasReviewModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.Review);
}

export function requireSculptorModel(client: AmplifyDataClient) {
  const model = client.models.Sculptor;
  if (!model) {
    throw new Error(`Sculptors are not available in this environment. ${DEPLOY_HINT}`);
  }
  return model;
}

export function hasSculptorModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.Sculptor);
}

export function requireShippingProfileModel(client: AmplifyDataClient) {
  const model = client.models.ShippingProfile;
  if (!model) {
    throw new Error(
      `Shipping profiles are not available in this environment. ${DEPLOY_HINT}`,
    );
  }
  return model;
}

export function hasShippingProfileModel(client: AmplifyDataClient): boolean {
  return Boolean(client.models.ShippingProfile);
}
