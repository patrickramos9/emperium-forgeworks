import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

async function countPaidOrders(): Promise<number> {
  let paidSalesCount = 0;
  let nextToken: string | undefined;

  do {
    const response = await dataClient.models.Order.list({
      limit: 100,
      nextToken,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }

    for (const row of response.data ?? []) {
      if (row?.status === "paid") {
        paidSalesCount += 1;
      }
    }

    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return paidSalesCount;
}

export const handler: Schema["getStorefrontStats"]["functionHandler"] =
  async () => {
    const paidSalesCount = await countPaidOrders();
    return { paidSalesCount };
  };
