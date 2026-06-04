/**
 * Validates cart thumbnail ref selection (no browser/Amplify required).
 * Run: npm run validate:cart-image
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

function productPrimaryImageRef(product: {
  imageRefs?: string[];
  images: string[];
  detailImage?: string;
}): string | undefined {
  const ref = product.imageRefs?.[0];
  if (ref) return ref;
  const image = product.images[0];
  if (image) return image;
  return product.detailImage;
}

function cartLineImageRef(
  item: { imageUrl?: string },
  product?: {
    imageRefs?: string[];
    images: string[];
    detailImage?: string;
  },
): string | undefined {
  const stored = item.imageUrl?.trim();
  if (stored) return stored;
  if (product) return productPrimaryImageRef(product);
  return undefined;
}

const product = {
  imageRefs: ["products/test-mini/gallery/hero.jpg"],
  images: [] as string[],
  detailImage: undefined as string | undefined,
};

assert(
  productPrimaryImageRef(product) === "products/test-mini/gallery/hero.jpg",
  "productPrimaryImageRef uses imageRefs when images empty",
);

assert(
  cartLineImageRef({ imageUrl: undefined }, product) ===
    "products/test-mini/gallery/hero.jpg",
  "cartLineImageRef falls back to product refs",
);

assert(
  cartLineImageRef({ imageUrl: "/images/legacy.png" }, product) ===
    "/images/legacy.png",
  "cart line imageUrl wins over product",
);

console.log("OK: cart image ref validation passed");
