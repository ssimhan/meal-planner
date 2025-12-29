# Frontend UI - Reference Guide

Extended reference for creating aesthetically distinctive frontend interfaces.

## Extended Font Library

### Monospace Fonts

**For code, technical, or terminal aesthetics**:
- JetBrains Mono - Clean, developer-focused
- Fira Code - Programming ligatures
- IBM Plex Mono - Corporate tech feel
- Space Mono - Retro-futuristic
- Roboto Mono - Geometric and modern
- Source Code Pro - Adobe's code font
- Inconsolata - Compact and readable

### Display/Geometric Fonts

**For bold headings and modern aesthetics**:
- Clash Display - Sharp, geometric
- Epilogue - Versatile display font
- Syne - Unusual letterforms
- Outfit - Clean geometric
- Manrope - Rounded geometric
- General Sans - Modern neutral
- Satoshi - Contemporary sans

### Serif Fonts

**For elegance, editorial, or classic aesthetics**:
- Playfair Display - High contrast, elegant
- Crimson Pro - Book-style serif
- Libre Baskerville - Traditional
- Merriweather - Readable serif
- Lora - Balanced, brushed
- Spectral - Modern editorial
- Cormorant - Delicate display serif

### Font Pairing Matrix

| Heading | Body | Style | Use Case |
|---------|------|-------|----------|
| Clash Display | JetBrains Mono | Geometric + Mono | Tech products, dev tools |
| Playfair Display | Space Grotesk | Serif + Geometric | Editorial, portfolios |
| Syne | Fira Code | Unusual + Mono | Experimental, creative tech |
| Crimson Pro | Outfit | Serif + Sans | Professional, elegant |
| Space Mono | Space Mono | Mono + Mono | Terminal, retro-future |
| Clash Display | Manrope | Display + Rounded | Modern apps, SaaS |

## Theme Library

### Cyberpunk / Neo-Tokyo

```css
:root {
  --bg-primary: #0a0e27;
  --bg-secondary: #16213e;
  --bg-tertiary: #1a1a2e;
  --accent-neon-green: #00ff9f;
  --accent-pink: #ff006e;
  --accent-cyan: #00f5ff;
  --text-primary: #e0e0e0;
  --text-muted: #8892b0;
  --border: rgba(0, 255, 159, 0.3);
  --glow: 0 0 20px rgba(0, 255, 159, 0.5);
}
```

**Characteristics**: Dark backgrounds, neon accents, glowing effects, futuristic

### Terminal / Hacker

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --accent-green: #39ff14;
  --accent-amber: #ffb000;
  --text-primary: #c9d1d9;
  --text-muted: #8b949e;
  --scanline: rgba(0, 255, 20, 0.02);
}
```

**Characteristics**: Monospace fonts, green phosphor, scanlines, retro CRT

### Brutalist / Swiss

```css
:root {
  --bg-primary: #f5f5f0;
  --bg-secondary: #e8e8e0;
  --accent-red: #ff0000;
  --accent-black: #000000;
  --text-primary: #000000;
  --text-muted: #666666;
  --border: 2px solid #000000;
}
```

**Characteristics**: High contrast, bold typography, geometric shapes, asymmetry

### Solarpunk

```css
:root {
  --bg-primary: #fef9f3;
  --bg-secondary: #f0e6d2;
  --accent-green: #2d6a4f;
  --accent-gold: #d4a574;
  --accent-terracotta: #c1666b;
  --text-primary: #2b2d42;
  --text-muted: #6c757d;
}
```

**Characteristics**: Warm earth tones, organic shapes, optimistic, nature-inspired

### Vaporwave

```css
:root {
  --bg-primary: #1a0633;
  --bg-secondary: #2d1b4e;
  --accent-pink: #ff6ec7;
  --accent-cyan: #00e0ff;
  --accent-purple: #b967ff;
  --text-primary: #ffffff;
  --text-muted: #d4b5ff;
  --grid: rgba(255, 110, 199, 0.3);
}
```

**Characteristics**: Pink/cyan/purple, grids, retro 80s/90s, dreamy gradients

### Nord (Minimal)

```css
:root {
  --bg-primary: #2e3440;
  --bg-secondary: #3b4252;
  --bg-tertiary: #434c5e;
  --accent-frost-1: #8fbcbb;
  --accent-frost-2: #88c0d0;
  --accent-frost-3: #81a1c1;
  --accent-frost-4: #5e81ac;
  --text-primary: #eceff4;
  --text-muted: #d8dee9;
}
```

**Characteristics**: Cool tones, subtle accents, calm, Nordic minimal

## Animation Cookbook

### Staggered Fade In

```css
.stagger-item {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0.1s; }
.stagger-item:nth-child(2) { animation-delay: 0.2s; }
.stagger-item:nth-child(3) { animation-delay: 0.3s; }
.stagger-item:nth-child(4) { animation-delay: 0.4s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Typing Animation

```css
.typing-text {
  overflow: hidden;
  border-right: 2px solid;
  white-space: nowrap;
  animation: typing 3s steps(40) 1s forwards, blink 0.75s step-end infinite;
  width: 0;
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink {
  50% { border-color: transparent; }
}
```

### Glowing Pulse

```css
.glow-pulse {
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 255, 159, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 255, 159, 0.8);
  }
}
```

### Slide In from Edge

```css
.slide-in-left {
  animation: slideLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform: translateX(-100%);
}

@keyframes slideLeft {
  to {
    transform: translateX(0);
  }
}
```

### Rotate on Hover

```css
.rotate-hover {
  transition: transform 0.3s ease-out;
}

.rotate-hover:hover {
  transform: rotate(5deg) scale(1.05);
}
```

## Background Pattern Recipes

### Grid Pattern

```css
.grid-bg {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
}
```

### Dots Pattern

```css
.dots-bg {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.1) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
}
```

### Diagonal Stripes

```css
.stripes-bg {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.05) 10px,
    rgba(255, 255, 255, 0.05) 20px
  );
}
```

### Layered Gradients

```css
.gradient-layers {
  background:
    radial-gradient(
      circle at 20% 50%,
      rgba(120, 0, 255, 0.3) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 80%,
      rgba(0, 255, 200, 0.2) 0%,
      transparent 50%
    ),
    linear-gradient(135deg, #0a0e27 0%, #16213e 100%);
}
```

### Noise Texture

```css
.noise-bg {
  background-color: #f5f5f0;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.05"/></svg>');
}
```

### Scanlines (CRT Effect)

```css
.scanlines {
  position: relative;
}

.scanlines::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    transparent 1px,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 3px
  );
  pointer-events: none;
}
```

## Component Patterns

### Glassmorphism Card

```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

### Neon Border

```css
.neon-border {
  border: 2px solid var(--accent-neon);
  box-shadow:
    0 0 10px var(--accent-neon),
    inset 0 0 10px var(--accent-neon);
}

.neon-border:hover {
  box-shadow:
    0 0 20px var(--accent-neon),
    inset 0 0 20px var(--accent-neon);
}
```

### Brutal Button

```css
.brutal-button {
  background: #000;
  color: #fff;
  border: 3px solid #000;
  padding: 16px 32px;
  font-weight: 900;
  text-transform: uppercase;
  box-shadow: 6px 6px 0 var(--accent-red);
  transition: all 0.2s;
}

.brutal-button:hover {
  transform: translate(3px, 3px);
  box-shadow: 3px 3px 0 var(--accent-red);
}
```

### Terminal Prompt

```css
.terminal-prompt::before {
  content: '$ ';
  color: var(--accent-green);
  font-weight: bold;
}

.terminal-prompt {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-left: 3px solid var(--accent-green);
}
```

## Responsive Breakpoints

```css
/* Mobile-first approach */
/* Base styles: Mobile (< 640px) */

/* Tablet */
@media (min-width: 640px) { }

/* Laptop */
@media (min-width: 1024px) { }

/* Desktop */
@media (min-width: 1280px) { }

/* Large Desktop */
@media (min-width: 1536px) { }
```

## Typography Scale

### Extreme Contrast Scale
```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.25rem;    /* 20px */
  --text-xl: 1.5rem;     /* 24px */
  --text-2xl: 2rem;      /* 32px */
  --text-3xl: 3rem;      /* 48px */
  --text-4xl: 4rem;      /* 64px */
  --text-5xl: 6rem;      /* 96px */
  --text-6xl: 8rem;      /* 128px */
}
```

### Weight Variations
```css
:root {
  --weight-thin: 100;
  --weight-extralight: 200;
  --weight-light: 300;
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-extrabold: 800;
  --weight-black: 900;
}
```

## Accessibility Guidelines

### Minimum Contrast Ratios
- Normal text: 4.5:1
- Large text (18pt+): 3:1
- Interactive elements: 3:1

### Focus States
```css
*:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Performance Tips

### Efficient Animations
```css
/* Use transform and opacity - these don't trigger layout */
.efficient-animation {
  transform: translateX(0);
  opacity: 1;
  transition: transform 0.3s, opacity 0.3s;
}

/* Avoid animating these properties */
/* width, height, top, left, margin, padding */
```

### GPU Acceleration
```css
.gpu-accelerated {
  will-change: transform;
  transform: translateZ(0);
}
```

### Font Loading Strategy
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Font+Name:wght@100;900&display=swap" rel="stylesheet">
```

## Quick Reference Checklist

Creating a new UI? Use this checklist:

- [ ] **Typography**: Distinctive fonts (not Inter/Roboto/Arial)
- [ ] **Weight contrast**: Extreme variations (100-200 vs 800-900)
- [ ] **Size jumps**: 3x+ hierarchical differences
- [ ] **Color theme**: Cohesive aesthetic (not white + purple)
- [ ] **Dominant colors**: 2-3 mains, 1-2 sharp accents
- [ ] **CSS variables**: Used for theming consistency
- [ ] **Background**: Depth through gradients/patterns/effects
- [ ] **Motion**: Orchestrated page load, staggered reveals
- [ ] **Context match**: Aesthetic appropriate for purpose
- [ ] **Variety**: Different from previous projects
- [ ] **Responsive**: Mobile-first approach
- [ ] **Accessibility**: Contrast ratios, focus states, motion preferences
- [ ] **Performance**: Transform/opacity animations, GPU acceleration

## Additional Resources

- [Google Fonts](https://fonts.google.com/) - Font library
- [Coolors](https://coolors.co/) - Color palette generator
- [CSS Gradient](https://cssgradient.io/) - Gradient generator
- [Easing Functions](https://easings.net/) - Animation timing
- [Can I Use](https://caniuse.com/) - Browser compatibility

---

*Based on Anthropic's Frontend Aesthetics Research*
