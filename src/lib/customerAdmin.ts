import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

export type CustomerAccount = {
  userId: string;
  email: string;
};

export async function fetchCustomerAccounts(
  client: AmplifyDataClient,
  options: {
    emailFilter?: string;
    nextToken?: string;
    limit?: number;
  } = {},
): Promise<{ items: CustomerAccount[]; nextToken?: string | null }> {
  const { data, errors } = await client.queries.listCustomers({
    emailFilter: options.emailFilter?.trim() || undefined,
    nextToken: options.nextToken,
    limit: options.limit ?? 25,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const items = (data?.items ?? []).filter(
    (row): row is CustomerAccount =>
      Boolean(row?.userId && row?.email),
  );

  return {
    items,
    nextToken: data?.nextToken,
  };
}
