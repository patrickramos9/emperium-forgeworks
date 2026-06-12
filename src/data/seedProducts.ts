export type ProductCategory =
  | "Horror"
  | "Dark Fantasy"
  | "Sci-Fi"
  | "Terrain"
  | "SF & Fantasy";

export interface ProductVariant {
  id: string;
  label: string;
  priceDeltaCents: number;
}

export type { ProductOptionGroup, ProductVariantOption, VariationKind } from "@/lib/productVariants";

export interface ProductSpecs {
  material?: string;
  sculptor?: string;
  status?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  /** PDP hero image when different from catalog thumbnail */
  detailImage?: string;
  subtitle?: string;
  description?: string;
  lore?: string;
  category: ProductCategory;
  priceCents: number;
  badges: string[];
  images: string[];
  /** Storage paths parallel to resolved `images` (for variant photo matching). */
  imageRefs?: string[];
  variantGroups: import("@/lib/productVariants").ProductOptionGroup[];
  variants: ProductVariant[];
  specs?: ProductSpecs;
  inStock: boolean;
  featured: boolean;
  sortOrder: number;
  /** Hidden Vault exclusive — hidden from public /shop when true. */
  vaultOnly?: boolean;
  /** M15 — assigned shipping profile; omit → store default at checkout. */
  shippingProfileId?: string;
  /** Weight in ounces for weight-tier shipping profiles. */
  weightOz?: number;
  /** Cached shipping copy for PDP (from admin save). */
  shippingDisplay?: unknown;
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "ghatanothoa-miniature-set",
    title: "Ghatanothoa Miniature Set – Cthulhu Mythos",
    category: "Horror",
    priceCents: 499,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida/ADBb0uiCu0fMeqDDbDMabvO4dEa0cFx6tdmXn1S85jqegmhASVH100rAYf_jWCNA84fXEnLoHp_jc6DvE0evg8xqy-Nk4nO2ryLDZFNSldHlD89_smlmdXQp4a62NhB-6cGiKaoK2hYJjtjrjETRFWy6aOZuUsWLj-kMGA0Dm7w06aJDcZT2LCNuEbGjGn3DtcZSpJmXVstC84gqXj-ub6U2iCNNwrzT0mhNjtkK1tuxRmaigEJZGWSAiN1m4Q",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 1,
  },
  {
    id: "2",
    slug: "female-samurai-miniature",
    title: "Female Samurai Miniature | Dual Katana Warrior",
    category: "SF & Fantasy",
    priceCents: 1199,
    badges: ["Popular"],
    images: [
      "https://lh3.googleusercontent.com/aida/ADBb0uhR61_EUExl9TKHrBTryQPzNu_kqgdGjCsRjyYwtNXwmLEgPPAM3qPhdT9bxzVCfPcl-xpQgz28hKdEszLpnkqiTThxJab_bXgoUouur8DO8mulXayU4kv-RVIwkA5LSTZjR8LuVo_aa5Hve6v8TihieqBNL1JS0D93PlDed7qahMhOkYmAvVJ-wKsskXTTmStjyDGJRlHYJO8-WAAmGC5yLe7WujGCVot-KsLzLvI2yD8KwoWdL8JoYo4",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: true,
    sortOrder: 2,
  },
  {
    id: "3",
    slug: "32mm-urban-rubble-bases",
    title: "32mm Wargame Bases | Urban Rubble Terrain",
    category: "Terrain",
    priceCents: 800,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida/ADBb0uhZDjuh1FPho1TT504QYC-PNXrdILBAF3DYjs-xEwTPZA-SOzVLc3eCXztAaP2wKqlnXQ9pBy9z1ydmDybMY9KL25xUyawy9eNKLvsDThOTSBsAtosKt3T5DRejMLfoD8WRJEPnbCe7CnsBzmsmMm4-WRb8pdGi-1h4klaNZER-7Bjgd2ihQ4CqWKoscSYJDRsqElLicd6uXRpzmuPMmRbCXWtafyKCY3W_9ZVqJQzcGivrz8OIiKHIdPo",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 3,
  },
  {
    id: "4",
    slug: "armored-skeletal-spearman",
    title: "Armored Skeletal Spearman | Undead Guard",
    category: "Dark Fantasy",
    priceCents: 900,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA6nmIf895QEH6SBkAicEKuTFL--TU-7rDyNCPnLwj8OktATx0wySsaa_k8wwWrmpkRRLQGEDZrXNgLSSAIlJavbMlGt-ErzLb2VLooYDtDdKNPHYJGkN38dSEg0rAb0m9RGWhpZG2XYHrKL6bVgqArZK-SH5C-cSjL-IxYs-AI50SxxR_cPKYPfkNbrA53ngvEoVxv6klVn5m_duldWfkMIraq_ETVRkGJYNrp4AroudeZ7qjMyHfUOm48IfmulHJsT5XpyzKLjDE",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 4,
  },
  {
    id: "5",
    slug: "40mm-urban-rubble-pack",
    title: "40mm Wargame Bases | Urban Rubble Pack",
    category: "Terrain",
    priceCents: 1000,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYtEOm5p2H_u11SgFYnMfcJavHQVG_Yy1mEggqoaL6wrlUrw5M1y6PpzrqkniU3bwHWoIvx5IP_OIO3kkutZ7xyEpMr5Whib0rSiySt6gumqHEFg-eqxDSrJlid5R2eZrTNtTuyPpMZXQilUpID5op03WA1A1EPltUB0-zNLEmBlei_nyPTIKIO7akDhbjSkCauXlI9Ol3y68L2torBIwXd-WBdxo4HFoCTo5vMUZXwVhtX0WCXvTqYVNaNJ4LdWSJlZ05gq7Ikko",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 5,
  },
  {
    id: "6",
    slug: "eldritch-dragon",
    title: "Eldritch Dragon – Tentacled Horror Model",
    detailImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDDVVAebJUHPOptpmr_bVAXmMeu-_gZFwCX0MoPzC-eIyP_oX2j-45jTIqMzrhNZ6AGg6HPpsjIP67N1M6sZ3ueC5CuBH0GZTMV_HUT-dyo94mezA9CZlNrDv8qC_RmMu0DMA0fU4zCHFrvl726DBDb6vDzmdCTvma_nfhpkJMlhDNpeAJlPl7YmWw9Qbi-vzCdO6mnQ67y84N-tfbbZ-ooILSY9bVWXaXhWk2R1jKz1j6ZppX_8Z9qIL_WG77sfDIL_d3LkIKfRDY",
    subtitle:
      "Tentacled Horror Miniature, Cthulhu-Style Winged Abomination",
    description:
      "A massive resin printed miniature of an Eldritch Dragon with numerous tentacles and multiple eyes.",
    lore: "Born from the void between stars, this tentacled leviathan embodies the terror of the deep cosmos. Each eye watches a different timeline; each tentacle grasps at mortal sanity.",
    category: "Horror",
    priceCents: 4299,
    badges: ["75mm Scale"],
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC-8dI-AG-TQwJIsqrSwTP1vYfWE90n7xZAOWCh3g-dlqxHDm5Fgnubp0tlwtjThW7FUSO9A2YMINmV5GT4bb_vXwfN2C0jInSYzDakWAiBllhsgoaORyGnTct9UTaDIlC7WZX4upzatwAqOsLLtN2bZOwdhZ7PiWXT6UFarIU2_YHthI2kuIXrA297u5CWArIqIvQthX9x-gCS5LH9gmcFHrn_Sx1U8xn8yIqPv1vIal04juiaxT_GAxYJ2ItJIE--7MopyzcYRGk",
    ],
    variantGroups: [
      {
        id: "size",
        kind: "size",
        name: "Size",
        options: [
          { id: "75mm", label: "75MM", priceDeltaCents: 0 },
          { id: "110mm", label: "110MM", priceDeltaCents: 1500 },
        ],
      },
    ],
    variants: [
      { id: "75mm", label: "75MM", priceDeltaCents: 0 },
      { id: "110mm", label: "110MM", priceDeltaCents: 1500 },
    ],
    specs: {
      material: "High-Grade Resin",
      sculptor: "NSMiniatures",
      status: "In Stock",
    },
    inStock: true,
    featured: true,
    sortOrder: 6,
  },
  {
    id: "7",
    slug: "executioner-exterminator",
    title: "Executioner | Elite Exterminator Armored Warrior",
    category: "Sci-Fi",
    priceCents: 1099,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADvuGKG5u8vNdzeRaiWgIhC3w_ES4XwhVneHox2Z2yhgkMR7s2ZOrIfTxFzUOvKBb_S9WRfd7pURWkA8cqBqcm_F1Msu5vrfEiPIsOZEVetJzMRmy4y9kKWORVEXZ9h7DIeKkYLrEUxnbRZlRAijHQnoD3FXespjmTJnfY3oyuF6Qbjm95KwVTFgY0_4JVuuavkYZyOvtzvAdI1WnByDtUI8jAV1ZhnbKYBuHMhOkrpksVJTaBTQLYthdxxkfKy2uA1K83BOEeg0Y",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 7,
  },
  {
    id: "8",
    slug: "voidbound-knight-paladins",
    title: "Voidbound Knight Paladins Set | 7-Pack Resin",
    category: "Sci-Fi",
    priceCents: 499,
    badges: [],
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuChXL5DYyhoZsHBbyadOI0XeV6HjPQKwY_qByi9YrYO57X6M4DGrqGeDSlT_csv9v7M9yydMDZK-Ed6tYIHZd4tF8eqGvHapqWYykIhbfI-DRpW2vFHDYnlioaqs6QfVkZIMw2htRj6XxaMniDX1Wm1BMNKS8u8-a1OswttTazK6-5R3BVxxK7koLVRy52Q1lkIYrSmkSqDm-BVMvtojsQxsS3dpi1nLXJeGaf-rCf0pLWB_1lsMFRaLeISjDZTGyNh0Hb-kaEIDc4",
    ],
    variantGroups: [],
    variants: [],
    inStock: true,
    featured: false,
    sortOrder: 8,
  },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getProductBySlug(slug: string): Product | undefined {
  return SEED_PRODUCTS.find((p) => p.slug === slug);
}

/** Seed/default categories — live filters come from CatalogSettings. */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Horror",
  "Dark Fantasy",
  "Sci-Fi",
  "Terrain",
  "SF & Fantasy",
];

export {
  ALL_CATEGORY_FILTER,
  buildShopCategoryFilters,
  DEFAULT_PRODUCT_CATEGORY_FILTERS,
  isCategoryFilter,
  productMatchesCategoryFilter,
} from "@/lib/productCategories";
