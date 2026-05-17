import { IS_LOCAL } from "@/lib/config";

export function MockCheckoutBanner() {
  if (!IS_LOCAL) return null;
  return (
    <div className="border border-primary/30 bg-primary/10 px-4 py-2 text-center text-label-sm uppercase tracking-widest text-primary">
      Mock checkout — no charge will be made
    </div>
  );
}
