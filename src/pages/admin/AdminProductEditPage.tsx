import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductBySlug } from "@/data/seedProducts";
import { configureAmplify } from "@/lib/amplify";

export function AdminProductEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slug === "new";
  const seed = !isNew ? getProductBySlug(slug ?? "") : undefined;

  const [title, setTitle] = useState(seed?.title ?? "");
  const [productSlug, setProductSlug] = useState(seed?.slug ?? "");
  const [priceCents, setPriceCents] = useState(seed?.priceCents ?? 0);
  const [category, setCategory] = useState<string>(seed?.category ?? "Horror");
  const [inStock, setInStock] = useState(seed?.inStock ?? true);
  const [lore, setLore] = useState(seed?.lore ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && !seed) {
      navigate("/admin/products");
    }
  }, [isNew, seed, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const ok = await configureAmplify();
    if (!ok) {
      setError("Amplify not configured — run sandbox first.");
      setSaving(false);
      return;
    }

    try {
      const { generateClient } = await import("aws-amplify/data");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = generateClient<any>();
      const payload = {
        slug: productSlug,
        title,
        category,
        priceCents,
        inStock,
        lore,
        badges: seed?.badges ?? [],
        images: seed?.images ?? [],
        variants: seed?.variants ?? [],
        featured: seed?.featured ?? false,
        sortOrder: seed?.sortOrder ?? 99,
      };

      if (isNew) {
        await client.models.Product.create(payload);
      } else if (seed) {
        const { data: list } = await client.models.Product.list({
          filter: { slug: { eq: seed.slug } },
        });
        const row = list?.[0];
        if (row) {
          await client.models.Product.update({ id: row.id, ...payload });
        } else {
          await client.models.Product.create(payload);
        }
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-2xl">
      <Link to="/admin/products" className="text-primary hover:underline">
        ← Products
      </Link>
      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        {isNew ? "New Product" : "Edit Product"}
      </h1>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg space-y-4"
      >
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Slug
          </span>
          <input
            value={productSlug}
            onChange={(e) => setProductSlug(e.target.value)}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Price (cents)
          </span>
          <input
            type="number"
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value))}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Category
          </span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          <span className="font-label-sm uppercase">In stock</span>
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Lore
          </span>
          <textarea
            value={lore}
            onChange={(e) => setLore(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        {error && <p className="text-error">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="molten-glow bg-primary px-6 py-3 font-label-md uppercase text-on-primary"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </main>
  );
}
