/**
 * Amplify Data client for order-shared helpers.
 *
 * Intentionally loose: each Lambda may install its own `aws-amplify`, and ampx
 * typecheck treats those V6Client types as incompatible. Do not use
 * `ReturnType<typeof generateClient<Schema>>` here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OrderSharedDataClient = any;
