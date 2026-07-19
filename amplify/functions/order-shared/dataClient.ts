/**
 * Structural Amplify Data client for order-shared helpers.
 * Do not use `ReturnType<typeof generateClient<Schema>>` here: each Lambda
 * may install its own `aws-amplify`, and ampx typecheck treats those V6Client
 * types as incompatible across packages.
 */
export type OrderSharedDataClient = {
  models: {
    Order: {
      get: (input: { id: string }) => Promise<{
        data?: unknown;
        errors?: { message: string }[] | null;
      }>;
      update: (input: Record<string, unknown>) => Promise<{
        data?: unknown;
        errors?: { message: string }[] | null;
      }>;
      list: (input?: {
        filter?: unknown;
        limit?: number;
        nextToken?: string | null;
      }) => Promise<{
        data?: unknown[] | null;
        errors?: { message: string }[] | null;
        nextToken?: string | null;
      }>;
    };
    ReturnRequest?: {
      list: (input?: {
        filter?: unknown;
        limit?: number;
        nextToken?: string | null;
      }) => Promise<{
        data?: unknown[] | null;
        errors?: { message: string }[] | null;
        nextToken?: string | null;
      }>;
    };
  };
};
