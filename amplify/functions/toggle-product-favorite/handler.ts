import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { issueFavoriteGrantIfNeeded } from "../promo-shared/grantIssuance.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["toggleProductFavorite"]["functionHandler"] =
  async (event) => {
    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;
    if (!userId) {
      throw new Error("Sign in to save favorites.");
    }

    const productId = event.arguments.productId;
    const productSlug = event.arguments.productSlug?.trim() || undefined;
    const favorited = event.arguments.favorited;

    if (favorited) {
      const existing = await dataClient.models.Favorite.get({
        userId,
        productId,
      });
      if (!existing.data) {
        const createResult = await dataClient.models.Favorite.create({
          userId,
          productId,
          ...(productSlug ? { productSlug } : {}),
        });
        if (createResult.errors?.length) {
          throw new Error(createResult.errors.map((e) => e.message).join("; "));
        }
      }

      const grantIssued = await issueFavoriteGrantIfNeeded(
        dataClient,
        userId,
        productId,
      );

      return { favorited: true, grantIssued };
    }

    const deleteResult = await dataClient.models.Favorite.delete({
      userId,
      productId,
    });
    if (deleteResult.errors?.length) {
      throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
    }

    return { favorited: false, grantIssued: false };
  };
