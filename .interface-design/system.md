# Design System: Earthy Spice

## Direction
Personality: Warm, Curated, Craft-oriented.
Foundation: Warm tinted (Saffron/Turmeric)
Depth: Subtle shadows for elevation, borders for structural definition.

## Tokens
### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64

### Colors
--turmeric: #E2B007
--beetroot: #8B0000
--cardamom: #8DA399
--background: #FFFDF9
--surface: #FFFFFF
--border-subtle: #E2E2E2
--text-main: #2D2D2D
--text-muted: #666666

### Radius
Scale: 8px (standard), 12px (cards), 16px (drawers)

### Typography
Font: Inter, Serif for headers
Scale: 12, 14 (base), 16, 18, 24, 32, 48

## Patterns
### Pairing Card
- Border: 1px solid var(--border-subtle)
- Padding: 12px
- Radius: 12px
- Transition: 150ms ease-out (border-color, shadow)

### Drawer (Pairing)
- Position: Right side fixed
- Width: 400px (desktop) / 100% (mobile)
- Background: var(--background)
- Shadow: -4px 0 24px rgba(0,0,0,0.05)

## Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Grounded Warmth | Align with South Indian culinary domain (tempering, spices) | 2026-01-29 |
| History-first recommendations | Minimize cognitive load during repeat planning | 2026-01-29 |
