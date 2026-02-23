# Frontend Design Reference

Detailed aesthetics guidance for distinctive interfaces.

## Typography Pairings

| Aesthetic | Display Font | Body Font |
|-----------|--------------|-----------|
| Editorial | Playfair Display, Clash Display | Source Serif Pro |
| Brutalist | Archivo Black, Bebas Neue | IBM Plex Mono |
| Luxury | Cormorant Garamond | Lora |
| Retro-futuristic | Orbitron, Rajdhani | Exo 2 |
| Organic | Fraunces | Literata |
| Minimal | Syne, Outfit | Geist, Satoshi |

Avoid: Inter, Roboto, Arial, system-ui, Space Grotesk (overused).

## Color Palette Patterns

- **Dominant + accent**: One dominant color (60–70%), one sharp accent (10–15%), neutrals for rest
- **Monochromatic depth**: Single hue with varying saturation/lightness
- **Complementary tension**: Two opposing hues for contrast
- **Muted + pop**: Desaturated base with one saturated accent

Use CSS variables for all palette tokens.

## Motion Patterns

- **Staggered reveals**: `animation-delay` on children (0.1s, 0.2s, 0.3s…)
- **Ease curves**: `cubic-bezier(0.16, 1, 0.3, 1)` for organic feel; `cubic-bezier(0.4, 0, 0.2, 1)` for snappy
- **Scroll-triggered**: Intersection Observer or CSS `scroll-timeline` for entrance animations
- **Hover**: Subtle scale, color shift, or shadow—not all at once

## Background Patterns

- **Noise**: `filter: url(#noise)` or subtle SVG overlay
- **Gradient mesh**: Multiple overlapping radial gradients
- **Geometric**: CSS `repeating-linear-gradient`, `conic-gradient`
- **Grain**: Semi-transparent PNG overlay with `mix-blend-mode`

---

Read this file when implementing complex typography, color systems, or motion patterns.
