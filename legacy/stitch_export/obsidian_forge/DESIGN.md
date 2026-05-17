---
name: Obsidian Forge
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb694'
  primary: '#ffb694'
  on-primary: '#571f00'
  primary-container: '#ff6a00'
  on-primary-container: '#571f00'
  inverse-primary: '#a14000'
  secondary: '#e2b6ff'
  on-secondary: '#471769'
  secondary-container: '#623384'
  on-secondary-container: '#d9a3fd'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#9a9898'
  on-tertiary-container: '#313131'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb694'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7b2f00'
  secondary-fixed: '#f3daff'
  secondary-fixed-dim: '#e2b6ff'
  on-secondary-fixed: '#2f004d'
  on-secondary-fixed-variant: '#603182'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  plasma-glow: '#ff9d00'
  void-purple: '#2d1341'
  iron-gray: '#333333'
  blood-red: '#7a0000'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style

This design system is built for the "Grimdark Sci-Fi & Dark Fantasy" aesthetic, specifically tailored for a premium 3D printing workshop. The brand personality is **intense, industrial, and high-fidelity**, moving away from standard e-commerce neutrality toward a fully immersive, narrative-driven experience.

The visual style is a blend of **High-Contrast Bold** and **Tactile Industrialism**. It utilizes deep atmospheric shadows and glowing focal points to mimic the environment of a forge. The goal is to evoke the feeling of uncovering a rare artifact in a dark cathedral or an ancient space station. Every UI element should feel heavy, permanent, and meticulously crafted, mirroring the resin quality of the miniatures themselves.

## Colors

The palette is rooted in the "Grimdark" philosophy—starting from absolute darkness and building light only where it matters. 

- **Primary (Glow):** An aggressive, glowing orange that represents molten resin, forge fire, and energy signatures. It is used exclusively for primary actions and critical highlights.
- **Secondary (Atmosphere):** A deep, bruised purple used for depth, overlays, and subtle branding hints. This provides the "Dark Fantasy" edge to the industrial blacks.
- **Neutral (The Void):** A range of rich blacks and iron grays. The background is never true black, but a textured "Near-Black" to allow for deep shadow depth.
- **Accents:** High-intensity "Plasma Glow" is reserved for interactive states (hover, focus) to simulate light blooming from within the UI.

## Typography

The typography system contrasts "Ancient" and "Technical" styles. 

**Headlines** use **Epilogue** for its geometric yet brutalist character. High weights (700-800) give titles an "engraved" feel. For product names and major headings, use tight letter spacing and sentence case to maintain a modern, cinematic look.

**Body Text** utilizes **Inter** for maximum legibility when describing intricate product details and print specifications. It stays out of the way, providing a clean counterpoint to the heavy visual style.

**Technical Metadata** (scale info, resin type, print time) uses **JetBrains Mono**. This monospaced font reinforces the "Forgeworks" industrial theme, suggesting precision engineering and data-readouts.

## Layout & Spacing

This design system employs a **Fixed Grid** on desktop to maintain a cinematic, controlled composition, and a **Fluid Grid** on mobile for accessibility.

- **Desktop (1440px):** 12-column grid with generous 64px outer margins. This creates a "letterboxed" feel that enhances the premium gallery aspect of the miniatures.
- **Rhythm:** A 4px baseline grid is used to maintain strict vertical rhythm. 
- **Density:** Spacing is intentionally "airy" for product showcases but tightens significantly for technical specs and cart UI to mimic a tactical HUD (Heads-Up Display).
- **Reflow:** On mobile, margins shrink to 16px, and multi-column product grids collapse to single or dual columns depending on image complexity.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glow Radiance** rather than traditional drop shadows.

- **Surfaces:** The base layer is the darkest. Elevated components (cards, menus) use a slightly lighter "Iron Gray" with a very subtle inner bevel (1px top highlight) to simulate metallic thickness.
- **Outer Glows:** Primary buttons and active states use a "Molten Glow"—an orange-tinted outer blur that simulates light being cast onto the dark surface behind it.
- **Backdrop Blurs:** Modals and navigation overlays use a deep purple blur (Glassmorphism style) to maintain context while creating a focused "void" for the user.
- **Borders:** Use low-opacity white or purple borders (0.1 opacity) to define edges without breaking the dark immersion.

## Shapes

The shape language is **Soft (0.25rem)**. While the brand is "Grimdark," true sharp edges (0px) feel too digital/retro. A subtle radius on buttons and cards mimics the "softened edges" of high-quality resin prints and cast metal.

- **Standard Elements:** 4px radius for a disciplined, industrial feel.
- **Large Components (Cards/Modals):** 8px radius to provide a structural frame for photography.
- **Interactive States:** Maintain the 4px radius; do not use pills or circles as they conflict with the gothic sci-fi aesthetic.

## Components

- **Buttons:** High-contrast blocks. Primary buttons feature the Molten Orange background with black text. Secondary buttons use an Iron Gray outline with a subtle purple hover glow.
- **Product Cards:** No borders. Use a subtle tonal lift on the background. The focus is entirely on the photography. Price and Title are displayed in JetBrains Mono and Epilogue respectively.
- **Chips/Badges:** Small, monospaced labels (e.g., "75MM", "IN STOCK") with a dark purple background and light purple text. They should look like stamped metal plates or digital readouts.
- **Input Fields:** Dark gray background with a 1px border. On focus, the border "ignites" into the Primary Orange, and a subtle glow is applied to the container.
- **Interactive Lists:** Used for "Miniature Parts" or "Options." Each item should have a hover state that slightly increases the purple tint of the row, mimicking a scanner's selection.
- **Glow Effects:** Use `drop-shadow` with the `plasma-glow` color for icons when active to create a "Neon Gothic" feel.