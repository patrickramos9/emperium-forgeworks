import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductVariant } from "@/data/seedProducts";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  MAX_LINE_QTY,
} from "@/lib/cartConstants";
import { productPrimaryImageRef } from "@/lib/productImageUrls";
import { trackMetaAddToCart } from "@/lib/metaPixel";
import {
  isPrintServiceCartLine,
  printServiceLineKey,
  type PrintServiceLinePayload,
} from "@/lib/printService";
import { useCartSnapshotSync } from "@/hooks/useCartSnapshotSync";
import { fetchGuestCartSnapshot } from "@/services/cartSnapshotService";
import { ensureGuestSession } from "@/services/guestSessionService";

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  variantLabel?: string;
  vaultOnly?: boolean;
  printService?: PrintServiceLinePayload;
}

interface CartContextValue {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
  cartBadgeBumpToken: number;
  maxLineQty: number;
  addItem: (
    product: Product,
    options?: { variant?: ProductVariant; quantity?: number },
  ) => boolean;
  addPrintServiceLine: (input: {
    productId: string;
    slug: string;
    title: string;
    priceCents: number;
    printService: PrintServiceLinePayload;
    imageUrl?: string;
  }) => boolean;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  enrichFromCatalog: (products: Product[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface StoredCart {
  version: number;
  items: CartLine[];
}

function lineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? "default"}`;
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_LINE_QTY, Math.max(1, quantity));
}

function loadStoredItems(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredCart | CartLine[];
    const items = Array.isArray(parsed) ? parsed : parsed.items;

    if (!Array.isArray(items)) return [];

    return items
      .filter(
        (item) =>
          item &&
          typeof item.key === "string" &&
          typeof item.productId === "string" &&
          typeof item.quantity === "number",
      )
      .map((item) => ({
        ...item,
        quantity: isPrintServiceCartLine(item) ? 1 : clampQuantity(item.quantity),
        slug: item.slug?.trim() || item.productId,
      }));
  } catch {
    return [];
  }
}

function persistItems(items: CartLine[]) {
  const payload: StoredCart = {
    version: CART_STORAGE_VERSION,
    items,
  };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(loadStoredItems);
  const [cartBadgeBumpToken, setCartBadgeBumpToken] = useState(0);
  /** False until we finish guest server hydrate when local cart is empty. */
  const [snapshotHydrated, setSnapshotHydrated] = useState(
    () => loadStoredItems().length > 0,
  );

  useCartSnapshotSync(items, snapshotHydrated);

  useEffect(() => {
    let cancelled = false;

    async function hydrateGuestCartIfNeeded() {
      if (loadStoredItems().length > 0) {
        if (!cancelled) setSnapshotHydrated(true);
        return;
      }

      const signedIn = await hasCustomerSession();
      if (signedIn) {
        if (!cancelled) setSnapshotHydrated(true);
        return;
      }

      try {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client || cancelled) {
          if (!cancelled) setSnapshotHydrated(true);
          return;
        }

        const lines = await fetchGuestCartSnapshot(client);
        if (cancelled) return;

        if (lines.length > 0) {
          setItems(
            lines.map((line) => ({
              key: lineKey(line.productId),
              productId: line.productId,
              slug: line.slug?.trim() || line.productId,
              title: line.title?.trim() || line.slug || line.productId,
              priceCents: line.priceCents,
              quantity: clampQuantity(line.quantity),
            })),
          );
        }
      } catch (err) {
        console.warn("[CartProvider] guest cart hydrate failed:", err);
      } finally {
        if (!cancelled) setSnapshotHydrated(true);
      }
    }

    void hydrateGuestCartIfNeeded();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistItems(items);
  }, [items]);

  const addItem = useCallback(
    (
      product: Product,
      options?: { variant?: ProductVariant; quantity?: number },
    ) => {
      if (!product.inStock) return false;

      const variant = options?.variant;
      const quantity = clampQuantity(options?.quantity ?? 1);
      const key = lineKey(product.id, variant?.id);
      const priceCents = product.priceCents + (variant?.priceDeltaCents ?? 0);

      let added = false;
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        let next: CartLine[];
        if (existing) {
          const imageUrl =
            productPrimaryImageRef(product) ?? existing.imageUrl;
          next = prev.map((i) =>
            i.key === key
              ? {
                  ...i,
                  quantity: clampQuantity(i.quantity + quantity),
                  ...(imageUrl && !i.imageUrl ? { imageUrl } : {}),
                }
              : i,
          );
        } else {
          next = [
            ...prev,
            {
              key,
              productId: product.id,
              slug: product.slug,
              title: product.title,
              priceCents,
              quantity,
              imageUrl: productPrimaryImageRef(product),
              variantId: variant?.id,
              variantLabel: variant?.label,
              vaultOnly: product.vaultOnly,
            },
          ];
        }
        persistItems(next);
        added = true;
        return next;
      });
      setCartBadgeBumpToken((token) => token + 1);
      if (added) {
        trackMetaAddToCart(product, quantity, variant);
      }
      return added;
    },
    [],
  );

  const addPrintServiceLine = useCallback(
    (input: {
      productId: string;
      slug: string;
      title: string;
      priceCents: number;
      printService: PrintServiceLinePayload;
      imageUrl?: string;
    }) => {
      const key = printServiceLineKey(input.productId, input.printService.uploadId);
      setItems((prev) => {
        if (prev.some((line) => line.key === key)) {
          return prev;
        }
        const next: CartLine[] = [
          ...prev,
          {
            key,
            productId: input.productId,
            slug: input.slug,
            title: input.title,
            priceCents: input.priceCents,
            quantity: 1,
            printService: input.printService,
            variantLabel: undefined,
            imageUrl: input.imageUrl,
          },
        ];
        persistItems(next);
        return next;
      });
      setCartBadgeBumpToken((token) => token + 1);
      return true;
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.key !== key);
      persistItems(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => {
        const next = prev.filter((i) => i.key !== key);
        persistItems(next);
        return next;
      });
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i,
      );
      persistItems(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    persistItems([]);
    setItems([]);
  }, []);

  const enrichFromCatalog = useCallback((products: Product[]) => {
    if (!products.length) return;
    const byId = new Map(products.map((p) => [p.id, p]));
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (isPrintServiceCartLine(item)) return item;
        const product =
          byId.get(item.productId) ?? bySlug.get(item.slug);
        if (!product) return item;

        let updated = item;
        if (product.id !== item.productId || product.slug !== item.slug) {
          updated = {
            ...updated,
            productId: product.id,
            slug: product.slug,
            key: lineKey(product.id, item.variantId),
            vaultOnly: product.vaultOnly,
          };
          changed = true;
        } else if (product.vaultOnly !== item.vaultOnly) {
          updated = { ...updated, vaultOnly: product.vaultOnly };
          changed = true;
        }

        if (!updated.imageUrl?.trim()) {
          const imageUrl = productPrimaryImageRef(product);
          if (imageUrl && imageUrl !== updated.imageUrl) {
            updated = { ...updated, imageUrl };
            changed = true;
          }
        }

        return updated;
      });
      if (changed) {
        persistItems(next);
        return next;
      }
      return prev;
    });
  }, []);

  const value = useMemo(() => {
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);
    const subtotalCents = items.reduce(
      (n, i) => n + i.priceCents * i.quantity,
      0,
    );
    return {
      items,
      itemCount,
      subtotalCents,
      cartBadgeBumpToken,
      maxLineQty: MAX_LINE_QTY,
      addItem,
      addPrintServiceLine,
      removeItem,
      updateQuantity,
      clearCart,
      enrichFromCatalog,
    };
  }, [
    items,
    addItem,
    addPrintServiceLine,
    removeItem,
    updateQuantity,
    clearCart,
    enrichFromCatalog,
    cartBadgeBumpToken,
  ]);

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
