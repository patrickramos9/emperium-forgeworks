import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useVaultGate } from "@/hooks/useVaultGate";
import { clearVaultUnlocked } from "@/lib/vaultSession";
import {
  isVaultUnlockLockedOut,
  unlockVaultWithKey,
} from "@/lib/vaultUnlock";

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
  const { status, recheck } = useVaultGate();
  const [key, setKey] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    setUnlockError(null);
    setUnlocking(true);
    const result = await unlockVaultWithKey(key.trim());
    setUnlocking(false);
    if (result.ok) {
      setKey("");
      await recheck();
      return;
    }
    setUnlockError(result.message);
  }

  function handleLock() {
    clearVaultUnlocked();
    void recheck();
  }

  if (status === "loading" || status === "denied") {
    return (
      <main className="px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Checking vault access...</p>
      </main>
    );
  }

  if (status === "locked") {
    return (
      <main className="px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <div className="mx-auto max-w-md border border-outline-variant/20 bg-surface-container-low p-8 iron-bevel">
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            Hidden Vault
          </h1>
          <p className="mt-4 font-body-md text-on-surface-variant">
            Exclusive miniatures await behind the seal. Enter the access key
            assigned to your account, or sign in if your key is already linked.
          </p>
          <form onSubmit={(e) => void handleUnlock(e)} className="mt-stack-lg space-y-4">
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Access key
              </span>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                autoComplete="off"
                disabled={isVaultUnlockLockedOut()}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-high px-3 py-2"
              />
            </label>
            {unlockError && <p className="text-error">{unlockError}</p>}
            <button
              type="submit"
              disabled={unlocking || isVaultUnlockLockedOut()}
              className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
            >
              {unlocking ? "Verifying..." : "Unlock the Vault"}
            </button>
          </form>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-1 font-label-sm uppercase text-primary hover:text-plasma-glow"
          >
            <Icon name="arrow_back" className="text-sm" />
            Return to the Arsenal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mx-auto max-w-container-max">
        <div className="flex flex-wrap items-end justify-between gap-stack-md border-l-4 border-primary pl-4">
          <div>
            <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
              Hidden Vault
            </h1>
            <p className="mt-2 font-body-md text-on-surface-variant">
              Exclusive offerings — visible only to those who hold the key.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLock}
            className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase text-on-surface-variant hover:border-primary hover:text-primary"
          >
            Seal the Vault
          </button>
        </div>

        <VaultCatalog />
      </div>
    </main>
  );
}
