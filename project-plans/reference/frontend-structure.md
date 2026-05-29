# Frontend structure

## Directory map

```text
src/
├── main.tsx                 # React root, Amplify configure
├── App.tsx                  # Routes
├── components/              # Shared UI
│   ├── admin/               # Admin-only editors + AdminLayout
│   ├── Header.tsx, Footer.tsx, Layout.tsx
│   ├── ProductCard.tsx, VariantPicker.tsx, ReviewCard.tsx
│   └── ...
├── context/
│   ├── CartContext.tsx      # Cart state + localStorage
│   └── AnnouncementContext.tsx  # System banner + layout padding
├── hooks/
│   ├── useAnnouncements.ts
│   ├── useVaultGate.ts
│   └── useVaultNavAccess.ts
├── pages/
│   ├── HomePage.tsx, ShopPage.tsx, ProductDetailPage.tsx
│   ├── VaultPage.tsx, VaultProductDetailPage.tsx
│   ├── ReviewsPage.tsx
│   ├── account/             # Customer auth + account pages
│   └── admin/               # Admin portal pages
├── services/                # Data orchestration (GraphQL)
│   ├── orderService.ts
│   ├── checkoutService.ts
│   ├── notificationService.ts
│   ├── reviewService.ts
│   └── adminAnalyticsService.ts
└── lib/                     # Utilities, Amplify clients, domain helpers
    ├── amplify.ts
    ├── amplifyDataClient.ts
    ├── adminAuth.ts, customerAuth.ts
    ├── dataModels.ts        # Model availability guards
    ├── storefrontStorage.ts # Public S3 image URLs
    ├── announcements.ts
    └── ...
```

---

## State management

| Concern | Approach |
|---------|----------|
| Cart | React Context + `localStorage` |
| Announcements (system banner) | Context provider loads active system announcement |
| Server data | Local `useState` + `useEffect`; no React Query |
| Auth session | Amplify Auth (`getCurrentUser`, `fetchAuthSession`) |

---

## Data loading patterns

1. **Configure Amplify** once per flow (`configureAmplify()`).
2. Obtain the correct client (`getGuestDataClient`, etc.).
3. Check model deployed (`hasReviewModel`, `hasAnnouncementModel`, …).
4. Call service module or `client.models.*` directly in pages.
5. Surface errors as page-level `error` state strings.

**Fallback:** `useProducts` and seed data in `src/data/seedProducts.ts` when Amplify is not configured (local preview without backend).

---

## Key pages by domain

| Domain | Entry pages | Services / libs |
|--------|-------------|-----------------|
| Catalog | `ShopPage`, `ProductDetailPage` | `useProducts`, `listAllProducts`, `catalogFilter` |
| Vault | `VaultPage` | `useVaultGate`, `vaultAccess` |
| Checkout | `CartPage`, `CheckoutSuccessPage` | `checkoutService`, `validateCart` |
| Account | `AccountOrdersPage`, `AccountNotificationsPage` | `orderService`, `notificationService` |
| Reviews | `AccountReviewPage`, `ReviewsPage`, `HomePage` | `reviewService` |
| Admin | `Admin*Page` | `requireAdminSession`, various `listAll*` libs |

---

## Admin product editor

`AdminProductEditPage` + subcomponents:

- `AdminProductGalleryEditor` — multi-image upload to S3, reorder  
- `AdminProductVariantsEditor` — JSON variation groups + linked images  

Product payloads normalized in `productPayload.ts` / `productVariants.ts` (variants/specs as JSON strings for DynamoDB).

---

## Styling conventions

- Tailwind utility classes; theme tokens in `tailwind.config.ts`  
- Display headings: `font-display-lg`, `text-headline-lg`, `uppercase`  
- Labels: `font-label-sm uppercase tracking-widest`  
- Cards: `iron-bevel`, `bg-surface-container-low`, `border-outline-variant/10`  
- Primary CTA: `bg-primary`, `molten-glow` on hero buttons  

See [design-system.md](./design-system.md).

---

## Icons and assets

- **Material Symbols** via `Icon.tsx` (`name`, optional `filled` for stars).  
- Legacy marketing images: `src/data/legacyAssets.ts` (CDN URLs).  
- Local static: `public/images/` (e.g. brand banner).

---

## Analytics

`App.tsx` → `AnalyticsTracker` sends GA4 `page_view` on route change when `window.gtag` exists.

---

## Type generation

- Schema types: `import type { Schema } from "../../amplify/data/resource"`  
- Model records: `Schema["Product"]["type"]`, etc.  
- Run backend deploy after schema changes so client types stay aligned.
