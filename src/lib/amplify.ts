import { Amplify } from "aws-amplify";

let configured = false;

export async function configureAmplify(): Promise<boolean> {
  if (configured) return true;

  try {
    const outputs = await import("../../amplify_outputs.json");
    Amplify.configure(outputs.default ?? outputs);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function isAmplifyConfigured(): boolean {
  return configured;
}
