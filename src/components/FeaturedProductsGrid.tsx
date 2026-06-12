import { Link } from "react-router-dom";
import type { Product } from "@/data/seedProducts";
import { ProductImage } from "@/components/ProductImage";
import { productPrimaryImage } from "@/lib/productImageUrls";

type FeaturedProductsGridProps = {
  products: Product[];
};

export function FeaturedProductsGrid({ products }: FeaturedProductsGridProps) {
  if (products.length === 0) return null;

  return (
    <div
      className={`grid grid-cols-1 gap-gutter sm:grid-cols-2 ${
        products.length >= 3 ? "lg:grid-cols-4" : "lg:grid-cols-2"
      }`}
    >
      {products.map((product) => {
        const productPath = `/shop/${product.slug}`;
        const imageSrc = productPrimaryImage(product);

        return (
          <Link
            key={product.id}
            to={productPath}
            className="group relative flex flex-col overflow-hidden bg-surface-container-low iron-bevel transition-all duration-300 hover:bg-surface-container-high"
          >
            <ProductImage
              src={imageSrc}
              alt={product.title}
              className="aspect-[1.26]"
              imageClassName="grayscale brightness-75 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="border-t border-outline-variant/10 p-4">
              <span className="font-label-sm uppercase tracking-widest text-secondary">
                {product.category}
              </span>
              <h3 className="mt-1 line-clamp-2 font-headline-md text-on-surface transition-colors group-hover:text-primary">
                {product.title}
              </h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
