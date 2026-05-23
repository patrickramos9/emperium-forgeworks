import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  type Product,
  type ProductCategory,
  getProductBySlug,
} from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { mapAmplifyProduct } from "@/lib/mapAmplifyProduct";
import { uploadProductImage } from "@/lib/productImageUpload";

const CATEGORIES: ProductCategory[] = [
  "Horror",
  "Dark Fantasy",
  "Sci-Fi",
  "Terrain",
  "SF & Fantasy",
];

function imagesToText(images: string[]): string {
  return images.join("\n");
}

function textToImages(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseJsonField<T>(raw: string, label: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
}

function emptyForm(): Omit<Product, "id"> {
  return {
    slug: "",
    title: "",
    subtitle: "",
    description: "",
    lore: "",
    category: "Horror",
    priceCents: 0,
    badges: [],
    images: [],
    detailImage: "",
    variants: [],
    specs: undefined,
    inStock: true,
    featured: false,
    sortOrder: 99,
  };
}

export function AdminProductEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slug === "new";
  const seedFallback = !isNew ? getProductBySlug(slug ?? "") : undefined;

  const [recordId, setRecordId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [category, setCategory] = useState<ProductCategory>("Horror");
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(99);
  const [lore, setLore] = useState("");
  const [detailImage, setDetailImage] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [badgesText, setBadgesText] = useState("");
  const [variantsJson, setVariantsJson] = useState("[]");
  const [specsJson, setSpecsJson] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function applyProduct(p: Product) {
    setRecordId(p.id);
    setTitle(p.title);
    setProductSlug(p.slug);
    setSubtitle(p.subtitle ?? "");
    setDescription(p.description ?? "");
    setPriceCents(p.priceCents);
    setCategory(p.category);
    setInStock(p.inStock);
    setFeatured(p.featured);
    setSortOrder(p.sortOrder);
    setLore(p.lore ?? "");
    setDetailImage(p.detailImage ?? "");
    setImagesText(imagesToText(p.images));
    setBadgesText(p.badges.join(", "));
    setVariantsJson(JSON.stringify(p.variants ?? [], null, 2));
    setSpecsJson(p.specs ? JSON.stringify(p.specs, null, 2) : "");
  }

  useEffect(() => {
    async function load() {
      if (isNew) {
        const blank = emptyForm();
        setTitle(blank.title);
        setProductSlug(blank.slug);
        setCategory(blank.category);
        setLoading(false);
        return;
      }

      const configured = await configureAmplify();
      if (!configured) {
        if (seedFallback) {
          applyProduct(seedFallback);
        } else {
          navigate("/admin/products");
        }
        setLoading(false);
        return;
      }

      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        const { data } = await client.models.Product.list({
          filter: { slug: { eq: slug ?? "" } },
        });
        const row = data?.[0];
        if (row) {
          applyProduct(mapAmplifyProduct(row));
        } else if (seedFallback) {
          applyProduct({ ...seedFallback, id: seedFallback.id });
          setRecordId(null);
        } else {
          navigate("/admin/products");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      }
      setLoading(false);
    }
    void load();
  }, [isNew, slug, seedFallback, navigate]);

  async function handleImageUpload(
    file: File,
    target: "gallery" | "detail",
  ) {
    if (!productSlug.trim()) {
      setError("Set a slug before uploading images.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadProductImage(productSlug, file);
      if (target === "detail") {
        setDetailImage(url);
      } else {
        const current = textToImages(imagesText);
        setImagesText(imagesToText([...current, url]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      const variants = parseJsonField<Product["variants"]>(
        variantsJson,
        "variants",
      );
      const specs = specsJson.trim()
        ? parseJsonField<Product["specs"]>(specsJson, "specs")
        : undefined;

      const payload = {
        slug: productSlug,
        title,
        subtitle: subtitle || undefined,
        description: description || undefined,
        lore: lore || undefined,
        category,
        priceCents,
        inStock,
        featured,
        sortOrder,
        detailImage: detailImage || undefined,
        badges: badgesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        images: textToImages(imagesText),
        variants: variants ?? [],
        specs: specs ?? undefined,
      };

      if (isNew || !recordId) {
        await client.models.Product.create(payload);
      } else {
        await client.models.Product.update({ id: recordId, ...payload });
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!recordId || isNew) return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSaving(true);
    try {
      await client.models.Product.delete({ id: recordId });
      navigate("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-2xl">
        <p className="text-on-surface-variant">Loading...</p>
      </main>
    );
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
            disabled={!isNew && !!recordId}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Subtitle
          </span>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            <span className="font-label-sm uppercase">In stock</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            <span className="font-label-sm uppercase">Featured</span>
          </label>
        </div>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Sort order
          </span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
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
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Badges (comma-separated)
          </span>
          <input
            value={badgesText}
            onChange={(e) => setBadgesText(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Detail image URL (PDP hero)
          </span>
          <input
            value={detailImage}
            onChange={(e) => setDetailImage(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-body-sm"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageUpload(file, "detail");
              e.target.value = "";
            }}
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Gallery image URLs (one per line)
          </span>
          <textarea
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-body-sm"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-body-sm"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageUpload(file, "gallery");
              e.target.value = "";
            }}
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Variants (JSON array)
          </span>
          <textarea
            value={variantsJson}
            onChange={(e) => setVariantsJson(e.target.value)}
            rows={5}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-body-sm"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Specs (JSON object, optional)
          </span>
          <textarea
            value={specsJson}
            onChange={(e) => setSpecsJson(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-body-sm"
          />
        </label>
        {error && <p className="text-error">{error}</p>}
        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="molten-glow bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {!isNew && recordId && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="border border-error px-6 py-3 font-label-md uppercase text-error disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
