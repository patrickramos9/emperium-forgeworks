import { Navigate } from "react-router-dom";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { useVaultGate } from "@/hooks/useVaultGate";

export function VaultProductDetailPage() {
  const { status } = useVaultGate();

  if (status === "loading" || status === "denied") {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Checking vault access...</p>
      </main>
    );
  }

  if (status === "locked") {
    return <Navigate to="/vault" replace />;
  }

  return (
    <ProductDetailPage
      catalogMode="vault"
      listPath="/vault"
      listLabel="Hidden Vault"
      productBasePath="/vault"
      requiresVaultUnlock
    />
  );
}
