import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORY_FILTERS } from "@/data/seedProducts";
import { useProducts } from "@/hooks/useProducts";

export function ShopPage() {
  const { products, loading, source, loadError } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "All";
  const initialQuery = searchParams.get("q") ?? "";
  const [category, setCategory] = useState(
    CATEGORY_FILTERS.includes(initialCategory as (typeof CATEGORY_FILTERS)[number])
      ? initialCategory
      : "All",
  );
  const search = initialQuery;

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        if (category === "All") return true;
        if (category === "Sci-Fi") {
          return p.category === "Sci-Fi" || p.category === "SF & Fantasy";
        }
        return p.category === category;
      })
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, category, search]);

  function selectCategory(cat: string) {
    setCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    setSearchParams(next, { replace: true });
  }

  return (
    <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mb-stack-lg flex flex-col justify-between gap-stack-md md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 font-display-lg text-display-lg uppercase tracking-tighter text-primary">
            The Vault
          </h1>
          <p className="max-w-2xl font-body-lg text-on-surface-variant">
            Forged in resin, born in shadow. Explore our collection of premium
            grimdark miniatures and tactical terrain sculps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={
                category === cat
                  ? "molten-glow bg-primary px-4 py-2 font-label-md uppercase tracking-widest text-on-primary transition-all hover:brightness-110"
                  : "border border-outline-variant/30 bg-surface-container-high px-4 py-2 font-label-md uppercase tracking-widest text-on-surface-variant transition-all hover:text-primary"
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loadError && !loading && (
        <p className="mb-4 border border-error/40 bg-error/10 px-4 py-3 text-body-sm text-error">
          Catalog could not load from the database ({loadError}). Try refreshing, or sign out of admin and reload.
        </p>
      )}

      {import.meta.env.DEV && !loading && (
        <p className="mb-4 text-body-sm text-on-surface-variant">
          Dev: catalog from <strong>{source}</strong> ({products.length} items)
          {loadError ? ` — ${loadError}` : ""}
        </p>
      )}

      {loading ? (
        <p className="text-on-surface-variant">Loading the vault...</p>
      ) : filtered.length === 0 ? (
        <p className="text-on-surface-variant">
          No artifacts match your search. Try another category or term.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <section className="mt-section-gap grid grid-cols-1 gap-gutter md:grid-cols-3">
        <div className="relative overflow-hidden border border-outline-variant/10 bg-surface-container-low p-stack-lg iron-bevel md:col-span-2">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
          <h2 className="mb-4 font-display-lg text-headline-lg uppercase tracking-tighter text-primary">
            Forge Announcement
          </h2>
          <div className="space-y-4 font-body-lg text-on-surface-variant">
            <p>
              Welcome to Emperium Forgeworks — your source for premium 3D
              printed collectibles, sci-fi miniatures, Voidbound Sentinels, and
              ancient terrors. Every item is made to order with high-quality
              resin and surgical precision.
            </p>
            <p>
              Latest activation: May 16, 2026. New sculpts from NSMiniatures
              have been added to the Dark Fantasy vault.
            </p>
          </div>
          <button
            type="button"
            className="mt-stack-lg flex items-center gap-2 font-label-md uppercase tracking-widest text-primary transition-transform duration-300 hover:translate-x-2"
          >
            Read Transmission
            <Icon name="trending_flat" />
          </button>
        </div>
        <div className="flex flex-col justify-center border border-secondary/10 bg-void-purple/20 p-stack-lg text-center iron-bevel backdrop-blur-sm">
          <Icon name="verified" className="mb-4 text-5xl text-secondary" />
          <h4 className="mb-2 font-headline-md text-secondary">
            High Fidelity Prints
          </h4>
          <p className="px-4 text-label-md text-on-surface-variant">
            &ldquo;unbelievably clean prints! Will definitely be ordering some
            more from this shop!&rdquo;
          </p>
          <div className="mt-4 font-label-sm uppercase tracking-widest text-primary">
            — Christian
          </div>
        </div>
      </section>
    </main>
  );
}
