import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useVaultGate } from "@/hooks/useVaultGate";

function VaultCatalog() {
  const { products, loading, loadError } = useProducts("vault");

  if (loadError) {
    return <p className="mt-stack-lg text-on-surface-variant">{loadError}</p>;
  }

  if (loading) {
    return <p className="mt-stack-lg text-on-surface-variant">Summoning wares...</p>;
  }

  if (products.length === 0) {
    return (
      <p className="mt-stack-lg text-on-surface-variant">
        The vault stands empty. Mark products as vault-only in admin when ready.
      </p>
    );
  }

  return (
    <div className="mt-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} shopBasePath="/vault" />
      ))}
    </div>
  );
}

export function VaultPage() {
  const { status } = useVaultGate();
  const isAuthorized = useMemo(() => status === "authorized", [status]);

  if (status === "loading") {
    return (
      <main className="px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Checking vault access...</p>
      </main>
    );
  }
  if (!isAuthorized) return null;

  return (
    <main className="px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mx-auto max-w-container-max">
        <div className="flex flex-wrap items-end justify-between gap-stack-md border-l-4 border-primary pl-4">
          <div>
            <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
              Hidden Vault
            </h1>
            <p className="mt-2 font-body-md text-on-surface-variant">
              Exclusive offerings — visible only to approved accounts.
            </p>
          </div>
        </div>

        <VaultCatalog />
      </div>
    </main>
  );
}
