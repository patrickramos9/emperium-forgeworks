import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

let configured = false;

export async function configureAmplify(): Promise<boolean> {
  if (configured) return true;

  try {
    Amplify.configure(outputs);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function isAmplifyConfigured(): boolean {
  return configured;
}
