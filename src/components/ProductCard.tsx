import { Link } from "react-router-dom";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import { productPrimaryImage } from "@/lib/productImageUrls";
import { ProductImage } from "@/components/ProductImage";

export function ProductCard({
  product,
  shopBasePath = "/shop",
}: {
  product: Product;
  shopBasePath?: string;
}) {
  const productPath = `${shopBasePath}/${product.slug}`;
  const imageSrc = productPrimaryImage(product);

  return (
    <article className="group relative flex flex-col overflow-hidden bg-surface-container-low iron-bevel transition-all duration-300 hover:bg-surface-container-high">
      <Link to={productPath} className="relative block">
        {product.badges.map((badge) => (
          <span
            key={badge}
            className={`absolute left-2 top-2 z-10 px-2 py-1 text-label-sm uppercase tracking-widest ${
              badge === "Popular"
                ? "bg-blood-red text-white"
                : "bg-primary text-on-primary"
            }`}
          >
            {badge}
          </span>
        ))}
        {!product.inStock && (
          <span className="absolute right-2 top-2 z-10 bg-surface-container-highest px-2 py-1 text-label-sm uppercase text-on-surface-variant">
            Out of Stock
          </span>
        )}
        <ProductImage
          src={imageSrc}
          alt={product.title}
          className="aspect-[1.26]"
          imageClassName="grayscale brightness-90 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
        />
      </Link>
      <div className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="bg-secondary-container/20 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
            {product.category}
          </span>
          <span className="shrink-0 font-label-md font-bold text-primary">
            {formatPrice(product.priceCents)}
          </span>
        </div>
        <Link to={productPath} className="block flex-grow">
          <h3 className="mb-stack-md line-clamp-2 font-headline-md text-headline-md text-on-surface transition-colors group-hover:text-primary">
            {product.title}
          </h3>
        </Link>
        <Link
          to={productPath}
          className="mt-auto inline-block w-full border border-outline-variant/30 py-2 text-center font-label-md uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          View in the Vault
        </Link>
      </div>
    </article>
  );
}
