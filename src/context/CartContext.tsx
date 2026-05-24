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
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  MAX_LINE_QTY,
} from "@/lib/cartConstants";

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
}

interface CartContextValue {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
  maxLineQty: number;
  addItem: (
    product: Product,
    options?: { variant?: ProductVariant; quantity?: number },
  ) => boolean;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
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
        quantity: clampQuantity(item.quantity),
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

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key
              ? { ...i, quantity: clampQuantity(i.quantity + quantity) }
              : i,
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            slug: product.slug,
            title: product.title,
            priceCents,
            quantity,
            imageUrl: product.images[0],
            variantId: variant?.id,
            variantLabel: variant?.label,
          },
        ];
      });
      return true;
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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
      maxLineQty: MAX_LINE_QTY,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart]);

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
