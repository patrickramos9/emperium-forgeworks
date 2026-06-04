/**
 * Validates cart catalog issue messages (no browser/Amplify required).
 * Run: npm run validate:cart-catalog
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

type CartLine = {
  key: string;
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
  variantId?: string;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  inStock: boolean;
};

function findCatalogProduct(
  item: CartLine,
  products: Product[],
): Product | undefined {
  return (
    products.find((p) => p.id === item.productId) ??
    products.find((p) => p.slug === item.slug)
  );
}

function getCartLineIssues(
  items: CartLine[],
  products: Product[],
): { key: string; kind: string; message: string; blocksCheckout: boolean }[] {
  const issues: {
    key: string;
    kind: string;
    message: string;
    blocksCheckout: boolean;
  }[] = [];

  for (const item of items) {
    const product = findCatalogProduct(item, products);
    if (!product) {
      issues.push({
        key: item.key,
        kind: "removed",
        message: "This item was removed from the store.",
        blocksCheckout: true,
      });
    }
  }
  return issues;
}

function filterPurchasableCartLines(
  items: CartLine[],
  products: Product[],
): CartLine[] {
  const blocked = new Set(
    getCartLineIssues(items, products)
      .filter((i) => i.blocksCheckout)
      .map((i) => i.key),
  );
  return items.filter((item) => !blocked.has(item.key));
}

const product: Product = {
  id: "p1",
  slug: "keeper",
  title: "Keeper Mini",
  priceCents: 1000,
  inStock: true,
};

const line: CartLine = {
  key: "p1:default",
  productId: "p1",
  slug: "keeper",
  title: "Keeper Mini",
  priceCents: 1000,
  quantity: 1,
};

const ghostLine: CartLine = {
  key: "gone:default",
  productId: "deleted-id",
  slug: "gone",
  title: "Gone Mini",
  priceCents: 500,
  quantity: 1,
};

const issues = getCartLineIssues([ghostLine], [product]);
assert(issues.length === 1, "missing product yields one issue");
assert(issues[0]?.kind === "removed", "kind is removed");
assert(
  issues[0]?.message.includes("removed from the store"),
  "removed message",
);

const purchasable = filterPurchasableCartLines([line, ghostLine], [product]);
assert(purchasable.length === 1, "only valid line is purchasable");
assert(purchasable[0]?.productId === "p1", "purchasable id");

console.log("OK: cart catalog validation passed");
