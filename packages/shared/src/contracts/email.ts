/** M20a — transactional email port (Lambda adapters live in amplify/functions/order-shared). */

export type EmailKind = "order" | "general";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** order → orders@; general → melissa@ */
  kind: EmailKind;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<boolean>;
}
