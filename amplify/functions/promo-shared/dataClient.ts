/**
 * Amplify Data client for shared Lambda helpers.
 *
 * Intentionally loose: each function may install its own `aws-amplify`, and ampx
 * typecheck treats those V6Client types as incompatible across nested
 * node_modules. Do not use `ReturnType<typeof generateClient<Schema>>` here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SharedDataClient = any;
