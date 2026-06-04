import { Icon } from "@/components/Icon";

interface ProductImageProps {
  src?: string;
  alt: string;
  /** Wrapper sizing (aspect ratio, height, etc.) */
  className?: string;
  imageClassName?: string;
}

/** Scales product art to fit its frame without cropping. */
export function ProductImage({
  src,
  alt,
  className = "",
  imageClassName = "",
}: ProductImageProps) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-black ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`max-h-full max-w-full object-contain ${imageClassName}`.trim()}
        />
      ) : (
        <Icon name="image" className="text-4xl text-on-surface-variant opacity-40" />
      )}
    </div>
  );
}
