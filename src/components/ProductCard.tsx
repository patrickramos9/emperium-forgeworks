import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import { Icon } from "./Icon";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="group relative flex flex-col overflow-hidden bg-surface-container-low iron-bevel transition-all duration-300 hover:bg-surface-container-high">
      <Link
        to={`/shop/${product.slug}`}
        className="relative aspect-[1.26] overflow-hidden bg-black"
      >
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
        <img
          src={product.images[0]}
          alt={product.title}
          className="h-full w-full object-cover grayscale brightness-90 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
        />
      </Link>
      <div className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <span className="bg-secondary-container/20 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
            {product.category}
          </span>
          <span className="font-label-md font-bold text-primary">
            {formatPrice(product.priceCents)}
          </span>
        </div>
        <Link to={`/shop/${product.slug}`}>
          <h3 className="mb-stack-md line-clamp-2 font-headline-md text-headline-md text-on-surface">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto flex gap-stack-sm">
          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => addItem(product)}
            className="flex-grow bg-primary py-2 font-label-md uppercase tracking-widest text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
          >
            {product.inStock ? "Forge" : "Out of Stock"}
          </button>
          <button
            type="button"
            className="flex aspect-square items-center justify-center bg-surface-container-highest p-2 text-on-surface-variant transition-colors hover:text-plasma-glow"
            aria-label="Wishlist"
          >
            <Icon name="favorite" className="text-base" />
          </button>
        </div>
      </div>
    </article>
  );
}
