import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import { highlightSearchMatches } from "@/lib/productSearch";
import { productPrimaryImage } from "@/lib/productImageUrls";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductImage";

type ForgeSearchFieldProps = {
  id?: string;
  query: string;
  suggestions: Product[];
  resultCount: number;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSubmitQuery: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onFocusChange?: (focused: boolean) => void;
  inputClassName: string;
  panelClassName?: string;
  ariaLabel?: string;
};

export function ForgeSearchField({
  id,
  query,
  suggestions,
  resultCount,
  loading,
  onQueryChange,
  onSubmitQuery,
  onSelectProduct,
  onFocusChange,
  inputClassName,
  panelClassName = "left-0 w-[min(24rem,calc(100vw-2.5rem))]",
  ariaLabel,
}: ForgeSearchFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const open = focused && !dismissed && query.trim().length > 0;
  const activeId =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(
    () => () => {
      if (!focusedRef.current) return;
      focusedRef.current = false;
      onFocusChangeRef.current?.(false);
    },
    [],
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${listId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDismissed(true);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDismissed(true);
    onSubmitQuery(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
      setActiveIndex(-1);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      const product = suggestions[activeIndex];
      if (!product) return;
      event.preventDefault();
      setDismissed(true);
      onSelectProduct(product);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <input
            id={id}
            type="search"
            value={query}
            role="combobox"
            aria-label={ariaLabel}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeId}
            autoComplete="off"
            placeholder="Search the forge..."
            onChange={(event) => {
              setDismissed(false);
              onQueryChange(event.target.value);
            }}
            onFocus={() => {
              focusedRef.current = true;
              setFocused(true);
              setDismissed(false);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              focusedRef.current = false;
              setFocused(false);
              onFocusChange?.(false);
            }}
            onKeyDown={handleKeyDown}
            className={inputClassName}
          />
          <Icon
            name="search"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
          />
        </div>
      </form>

      {open && (
        <div
          className={`absolute top-full z-50 mt-1 overflow-hidden border border-outline-variant/30 bg-surface-container-low iron-bevel shadow-lg ${panelClassName}`}
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label="Close matches"
            className="max-h-80 overflow-y-auto"
          >
            {loading && suggestions.length === 0 ? (
              <li className="px-3 py-3 text-body-sm text-on-surface-variant">
                Loading the lair...
              </li>
            ) : suggestions.length === 0 ? (
              <li className="px-3 py-3 text-body-sm text-on-surface-variant">
                No close matches.
              </li>
            ) : (
              suggestions.map((product, index) => {
                const active = index === activeIndex;
                return (
                  <li key={product.id} role="presentation">
                    <button
                      id={`${listId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        setDismissed(true);
                        onSelectProduct(product);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        active
                          ? "bg-surface-container-high text-primary"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <ProductImage
                        src={productPrimaryImage(product)}
                        alt=""
                        className="h-12 w-12 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-label-md">
                          {highlightSearchMatches(product.title, query).map(
                            (part, partIndex) =>
                              part.match ? (
                                <mark
                                  key={partIndex}
                                  className="bg-transparent font-bold text-primary"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={partIndex}>{part.text}</span>
                              ),
                          )}
                        </span>
                        <span className="mt-0.5 block truncate font-label-sm uppercase tracking-widest text-on-surface-variant">
                          {product.category}
                          {" · "}
                          {formatPrice(product.priceCents)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {resultCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                onSubmitQuery(query);
              }}
              className="w-full border-t border-outline-variant/20 px-3 py-2 text-left font-label-sm uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-high"
            >
              See all {resultCount} close{" "}
              {resultCount === 1 ? "match" : "matches"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
