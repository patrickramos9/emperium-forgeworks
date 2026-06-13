import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type Product, getProductBySlug } from "@/data/seedProducts";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { DEFAULT_PRODUCT_CATEGORY_FILTERS } from "@/lib/productCategories";
import { AdminProductGalleryEditor } from "@/components/admin/AdminProductGalleryEditor";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { LoadProductDescriptionTemplate } from "@/components/admin/LoadProductDescriptionTemplate";
import { AdminProductVariantsEditor } from "@/components/admin/AdminProductVariantsEditor";
import {
  normalizeRichTextForSave,
  RichTextEditor,
} from "@/components/RichTextEditor";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { mapAmplifyProduct } from "@/lib/mapAmplifyProduct";
import {
  galleryToProductImages,
  productToGalleryImages,
} from "@/lib/productGallery";
import { buildProductMutationPayload } from "@/lib/productPayload";
import type { ProductOptionGroup } from "@/lib/productVariants";
import { hasShippingProfileModel } from "@/lib/dataModels";
import {
  listAllShippingProfiles,
  firstShippingProfileId,
  type ShippingProfileRecord,
} from "@/services/shippingProfileService";
import { buildShippingDisplaySnapshot } from "@/services/productShippingService";
import {
  stripInvalidVariantImageRefs,
  validateVariantGroups,
} from "@/lib/productVariants";
import { nextProductSortOrder } from "@/services/productSortService";
import { countFeaturedProducts } from "@/services/featuredProductService";
import { MAX_FEATURED_PRODUCTS } from "@/lib/featuredProducts";
import {
  formatCentsForInput,
  parseDollarInputToCents,
} from "@/lib/priceUtils";
import {
  normalizeProductSlug,
  productSlugFromTitle,
  validateProductSlug,
} from "@/lib/productSlug";

function parseJsonField<T>(raw: string, label: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
}

function newProductDefaults(): Pick<Product, "title" | "slug" | "category"> {
  return {
    slug: "",
    title: "",
    category: DEFAULT_PRODUCT_CATEGORY_FILTERS[0],
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
  const [priceDollars, setPriceDollars] = useState("");
  const { categoryFilters } = useCategoryFilters();
  const [category, setCategory] = useState<string>(
    DEFAULT_PRODUCT_CATEGORY_FILTERS[0],
  );
  const categoryOptions = useMemo(() => {
    if (category && !categoryFilters.includes(category)) {
      return [category, ...categoryFilters];
    }
    return categoryFilters;
  }, [category, categoryFilters]);
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [wasFeaturedOnLoad, setWasFeaturedOnLoad] = useState(false);
  const [vaultOnly, setVaultOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [lore, setLore] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [badgesText, setBadgesText] = useState("");
  const [displayRating, setDisplayRating] = useState("");
  const [variantGroups, setVariantGroups] = useState<ProductOptionGroup[]>([]);
  const [specsJson, setSpecsJson] = useState("");
  const [shippingProfileId, setShippingProfileId] = useState("");
  const [weightOz, setWeightOz] = useState("");
  const [shippingProfiles, setShippingProfiles] = useState<
    ShippingProfileRecord[]
  >([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  function applyProduct(p: Product) {
    setRecordId(p.id);
    setTitle(p.title);
    setProductSlug(p.slug);
    setSubtitle(p.subtitle ?? "");
    setDescription(p.description ?? "");
    setPriceDollars(formatCentsForInput(p.priceCents));
    setCategory(p.category);
    setInStock(p.inStock);
    setFeatured(p.featured);
    setWasFeaturedOnLoad(p.featured);
    setVaultOnly(p.vaultOnly ?? false);
    setSortOrder(p.sortOrder);
    setLore(p.lore ?? "");
    setGalleryImages(productToGalleryImages(p));
    setBadgesText(p.badges.join(", "));
    setDisplayRating(
      p.displayRating != null && p.displayRating >= 1 && p.displayRating <= 5
        ? String(p.displayRating)
        : "",
    );
    setVariantGroups(p.variantGroups ?? []);
    setSpecsJson(p.specs ? JSON.stringify(p.specs, null, 2) : "");
  }

  useEffect(() => {
    async function load() {
      const configured = await configureAmplify();
      if (configured) {
        const client = await requireAdminSession(navigate);
        if (client && hasShippingProfileModel(client)) {
          try {
            setShippingProfiles(await listAllShippingProfiles(client));
          } catch {
            /* optional until backend deploy */
          }
        }
      }

      if (isNew) {
        const blank = newProductDefaults();
        setTitle(blank.title);
        setProductSlug(blank.slug);
        setCategory(blank.category);
        setLoading(false);
        return;
      }

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
          setShippingProfileId(row.shippingProfileId ?? "");
          setWeightOz(row.weightOz != null ? String(row.weightOz) : "");
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

  useEffect(() => {
    if (!shippingProfiles.length || shippingProfileId) return;
    setShippingProfileId(firstShippingProfileId(shippingProfiles));
  }, [shippingProfiles, shippingProfileId]);

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
      const variantError = validateVariantGroups(variantGroups);
      if (variantError) {
        throw new Error(variantError);
      }

      const slugValidation = validateProductSlug(productSlug);
      if (slugValidation) {
        throw new Error(slugValidation);
      }

      if (featured && !wasFeaturedOnLoad) {
        const featuredCount = await countFeaturedProducts(
          client,
          recordId ?? undefined,
        );
        if (featuredCount >= MAX_FEATURED_PRODUCTS) {
          throw new Error(
            `Only ${MAX_FEATURED_PRODUCTS} products can be featured on the home page. Unfeature another product first.`,
          );
        }
      }

      const priceCents = parseDollarInputToCents(priceDollars);
      const specs = specsJson.trim()
        ? parseJsonField<Product["specs"]>(specsJson, "specs")
        : undefined;

      const { images, detailImage } = galleryToProductImages(galleryImages);

      const weightOzParsed = weightOz.trim()
        ? Number.parseInt(weightOz, 10)
        : undefined;
      const shippingDisplay = await buildShippingDisplaySnapshot(client, {
        shippingProfileId: shippingProfileId || undefined,
        weightOz:
          weightOzParsed != null && Number.isFinite(weightOzParsed)
            ? weightOzParsed
            : undefined,
      });

      const effectiveSortOrder =
        isNew || !recordId ? await nextProductSortOrder(client) : sortOrder;

      const displayRatingParsed = displayRating.trim()
        ? Number.parseInt(displayRating, 10)
        : undefined;

      const payload = buildProductMutationPayload({
        slug: normalizeProductSlug(productSlug),
        title,
        subtitle: subtitle || undefined,
        description: normalizeRichTextForSave(description),
        lore: lore || undefined,
        category,
        priceCents,
        inStock,
        featured,
        vaultOnly,
        sortOrder: effectiveSortOrder,
        shippingProfileId: shippingProfileId || undefined,
        weightOz:
          weightOzParsed != null && Number.isFinite(weightOzParsed)
            ? weightOzParsed
            : undefined,
        shippingDisplay,
        detailImage,
        badges: badgesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        displayRating:
          displayRatingParsed != null && Number.isFinite(displayRatingParsed)
            ? displayRatingParsed
            : null,
        images,
        variantGroups: stripInvalidVariantImageRefs(variantGroups, galleryImages),
        specs: specs ?? null,
      });

      const result =
        isNew || !recordId
          ? await client.models.Product.create(payload)
          : await client.models.Product.update({ id: recordId, ...payload });

      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      if (!result.data) {
        throw new Error("Save failed — no data returned from API.");
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
    return <p className="text-on-surface-variant">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
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
            onChange={(e) => {
              const next = e.target.value;
              setTitle(next);
              if (isNew && !slugTouched) {
                setProductSlug(productSlugFromTitle(next));
              }
            }}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
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
            Slug
          </span>
          <input
            value={productSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setProductSlug(e.target.value);
            }}
            required
            disabled={!isNew && !!recordId}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-60"
          />
          {isNew && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Auto-generated from title until you edit this field. Required before
              photo upload.
            </p>
          )}
        </label>
        <AdminProductGalleryEditor
          images={galleryImages}
          onChange={(images) => {
            setGalleryImages(images);
            setVariantGroups((current) =>
              stripInvalidVariantImageRefs(current, images),
            );
          }}
          productSlug={productSlug}
          disabled={saving}
          onUploadingChange={setUploading}
          onError={setError}
        />
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Price (USD)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            required
            placeholder="0.00"
            autoComplete="off"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <AdminProductVariantsEditor
          groups={variantGroups}
          galleryImages={galleryImages}
          onChange={setVariantGroups}
          disabled={saving || uploading}
        />
        <div>
          <span className="font-label-sm uppercase text-on-surface-variant">
            Description
          </span>
          <div className="mt-1">
            <RichTextEditor
              value={description}
              onChange={setDescription}
            />
            <LoadProductDescriptionTemplate
              currentDescription={description}
              onLoad={setDescription}
            />
          </div>
        </div>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {categoryFilters.includes(c) ? c : `${c} (removed filter)`}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Shipping profile
          </span>
          <select
            value={shippingProfileId}
            onChange={(e) => setShippingProfileId(e.target.value)}
            disabled={!shippingProfiles.length}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-60"
          >
            {shippingProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {shippingProfiles.length
              ? "The first profile in Admin → Shipping is pre-selected for new products."
              : "Create a shipping profile under Admin → Shipping first."}
          </p>
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Weight (oz)
          </span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={weightOz}
            onChange={(e) => setWeightOz(e.target.value)}
            placeholder="Required for weight-tier profiles"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
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
          <p className="w-full text-body-sm text-on-surface-variant">
            Featured products appear on the home page (up to{" "}
            {MAX_FEATURED_PRODUCTS}).
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={vaultOnly}
              onChange={(e) => setVaultOnly(e.target.checked)}
            />
            <span className="font-label-sm uppercase">Vault only</span>
          </label>
        </div>
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
            placeholder="e.g. Elite Selection, Popular"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
          <p className="mt-1 text-label-sm text-on-surface-variant">
            First badge appears on the product page and shop card. Leave empty
            for no badge.
          </p>
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Star rating (1–5, optional)
          </span>
          <input
            type="number"
            min={1}
            max={5}
            step={1}
            value={displayRating}
            onChange={(e) => setDisplayRating(e.target.value)}
            placeholder="Leave empty to hide stars"
            className="mt-1 w-full max-w-[8rem] border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Shown when no approved reviews are linked to this product. Linked
            reviews override this value.
          </p>
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
            <ConfirmDeleteActions
              itemLabel={title || "product"}
              pending={deleteConfirming}
              busy={saving}
              onBegin={() => setDeleteConfirming(true)}
              onCancel={() => setDeleteConfirming(false)}
              onConfirm={() => void handleDelete()}
              className="px-2 py-3"
            />
          )}
        </div>
      </form>
    </div>
  );
}
