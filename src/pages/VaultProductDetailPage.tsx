import { Navigate } from "react-router-dom";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { useVaultGate } from "@/hooks/useVaultGate";

export function VaultProductDetailPage() {
  const { status } = useVaultGate();

  if (status === "loading") {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Checking vault access...</p>
      </main>
    );
  }

  if (status !== "authorized") {
    return <Navigate to="/" replace />;
  }

  return (
    <ProductDetailPage
      catalogMode="vault"
      listPath="/vault"
      listLabel="Hidden Vault"
      productBasePath="/vault"
    />
  );
}
