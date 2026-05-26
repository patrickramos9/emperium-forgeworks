import { ProductDetailPage } from "@/pages/ProductDetailPage";

export function VaultProductDetailPage() {
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
