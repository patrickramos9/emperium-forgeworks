# Design system — Obsidian Forge

The storefront visual language is **Obsidian Forge**: grimdark sci-fi / dark fantasy, industrial, high-contrast, resin-forge aesthetic.

**Canonical reference:** [`legacy/stitch_export/obsidian_forge/DESIGN.md`](../../legacy/stitch_export/obsidian_forge/DESIGN.md)

**HTML mocks (reference only):** `legacy/stitch_export/`

---

## Typography

| Role | Font | Tailwind |
|------|------|----------|
| Display / headlines | Display face (theme) | `font-display-lg`, `text-display-lg`, `text-headline-lg` |
| Section titles | | `font-headline-md` |
| Body | Inter | `font-body-md`, `font-body-lg` |
| Labels / UI chrome | | `font-label-sm`, `font-label-md`, `uppercase`, `tracking-widest` |
| Technical metadata | JetBrains Mono (where used) | monospace utilities |

---

## Color tokens (Tailwind)

Defined in `tailwind.config.ts` — use semantic names, not raw hex in components:

| Token | Usage |
|-------|--------|
| `primary` / `on-primary` | CTAs, brand accent (molten orange) |
| `secondary` / `plasma-glow` | Accents, stars, highlights |
| `background` / `on-surface` | Page background and text |
| `surface-container-*` | Cards, panels |
| `outline-variant` | Borders at low opacity (`/10`, `/20`, `/30`) |
| `void-purple` | Badges, chips |
| `iron-gray` | Image placeholders |
| `error` | Form and alert errors |

---

## Layout

| Token | Typical value |
|-------|----------------|
| `max-w-container-max` | Page max width |
| `px-margin-mobile` / `px-margin-desktop` | Horizontal padding |
| `py-section-gap` / `pb-section-gap` | Section spacing |
| `gap-gutter` | Grid gaps |

**Header offset:** `AnnouncementContext` provides `mainTopPadding` when a system banner is active.

---

## Components patterns

| Pattern | Classes / notes |
|---------|-----------------|
| Card | `bg-surface-container-low`, `border border-outline-variant/10`, `iron-bevel` |
| Hero panel | Full-bleed image + `grayscale` + gradient overlay |
| Primary button | `bg-primary`, `font-label-md uppercase`, `molten-glow` on key CTAs |
| Secondary button | `border border-on-surface/30`, hover `border-primary` |
| Section title | `border-b-2 border-primary pb-2`, uppercase display |
| Verified badge | `bg-secondary-container/30`, `text-secondary`, small caps |

---

## Imagery

- Product photos: often **grayscale** on cards, color on hover (`group-hover:grayscale-0`, `scale-105`).  
- About/process: ritual fabrication grid on `AboutPage`.  
- Home hero: wide brand banner (`public/images` or legacy CDN).

---

## Accessibility

- Form inputs: visible labels (`font-label-sm uppercase`).  
- Icon-only controls: `aria-label` where used (e.g. star rating).  
- Focus: `focus:border-primary focus:ring-1 focus:ring-primary` on inputs.

---

## Admin UI

Shares the same Tailwind theme but uses a **sidebar layout** (`AdminLayout`):

- Narrow nav (`w-56`), `border-l-2` active indicator  
- Mobile: horizontal scroll nav in header  
- Same surface/border tokens as storefront  

No separate admin design file—keep admin visually consistent with the forge brand.
