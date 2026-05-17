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
  addItem: (
    product: Product,
    options?: { variant?: ProductVariant; quantity?: number },
  ) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "emperium-cart";

function lineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? "default"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (
      product: Product,
      options?: { variant?: ProductVariant; quantity?: number },
    ) => {
      const variant = options?.variant;
      const quantity = options?.quantity ?? 1;
      const key = lineKey(product.id, variant?.id);
      const priceCents = product.priceCents + (variant?.priceDeltaCents ?? 0);

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + quantity } : i,
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
      prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
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
