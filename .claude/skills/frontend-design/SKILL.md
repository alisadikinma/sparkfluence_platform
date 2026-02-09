---
name: frontend-design
description: Design and build React components following Sparkfluence design system
user-invocable: true
---

# Frontend Design — Sparkfluence Design System

Guide for designing and building UI components that follow the Sparkfluence design system.

## Usage

```
/frontend-design <component-description>
```

Invoke this skill when building new UI components, layouts, or visual features. Claude will follow the Sparkfluence design system rules below.

## Design System

### Color Palette
```
--bg-base:     #0B0E14   (warm charcoal — app background)
--bg-surface:  #161616   (card/panel backgrounds)
--bg-elevated: #1E1E1E   (popovers, dropdowns, modals)
--accent:      #10B981   (emerald — primary action, success, highlights)
--accent-dim:  #059669   (emerald darker — hover states)
--text-primary:   #F5F5F5
--text-secondary: #A3A3A3
--text-muted:     #737373
--border:      #262626
--border-focus: #10B981
--danger:      #EF4444
--warning:     #F59E0B
--info:        #3B82F6
```

**NEVER use AI purple (#7C3AED / violet). Sparkfluence uses emerald green.**

### Typography
- Font: System font stack (Inter if available)
- Headings: `text-lg font-semibold` to `text-2xl font-bold`
- Body: `text-sm` (14px default)
- Labels: `text-xs text-neutral-400`
- Monospace: `font-mono text-xs` (for technical data, code, timestamps)

### Component Patterns

#### Cards
```tsx
<div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
  {/* Card content */}
</div>
```

#### Buttons
```tsx
// Primary
<button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">

// Secondary / Ghost
<button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2 text-sm transition-colors">

// Danger
<button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm transition-colors">
```

#### Glassmorphism (ONLY for sticky headers, overlays, modals)
```tsx
<div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/50">
```
Do NOT use glassmorphism on regular cards or content areas.

#### Badges / Pills
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
```

#### Inputs
```tsx
<input className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors" />
```

### Layout Rules
- **Desktop-first**: Optimize for 1440px+, responsive down to 1024px
- **9:16 portrait ratio**: All media previews use phone-frame aspect ratio
- **3-column workspace**: Left wing (240px) | Center (flex-1) | Right wing (320px) at 1440px+
- **Spacing**: Use Tailwind spacing scale (`gap-2`, `p-4`, `space-y-3`)
- **Max widths**: Content areas max at `max-w-7xl` or `max-w-screen-2xl`

### Animation (framer-motion)
```tsx
import { motion } from 'framer-motion';

// Fade in
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>

// Slide up
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

// Scale (for modals/popovers)
<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}>
```
Keep animations subtle (200-300ms). No bounce, no spring physics on UI elements.

### Segment Card Retention Borders
```
HOOK / PEAK segments:  border-l-4 border-emerald-500
FORE / BODY segments:  border-l-4 border-amber-500
CTA segments:          border-l-4 border-blue-500
LOOP-END segments:     border-l-4 border-neutral-600
```

### Trending Source Badge Colors
```
google:      bg-blue-500/10    text-blue-400    border-blue-500/20
tiktok:      bg-pink-500/10    text-pink-400    border-pink-500/20
youtube:     bg-red-500/10     text-red-400     border-red-500/20
news:        bg-emerald-500/10 text-emerald-400 border-emerald-500/20
ai_creative: bg-amber-500/10   text-amber-400   border-amber-500/20
```

### Component Library
- **Shadcn UI**: Use for Dialog, Popover, Select, Tooltip, Tabs, etc.
- **lucide-react**: Icon library (import by name, e.g., `import { Play, Pause } from 'lucide-react'`)
- **Custom components**: `src/components/ui/` for project-specific Shadcn overrides

### Responsive Breakpoints
```
sm:  640px   (mobile landscape)
md:  768px   (tablet)
lg:  1024px  (laptop — minimum supported)
xl:  1280px  (desktop)
2xl: 1440px  (full workspace with 3 columns)
```

### Dark Mode
Sparkfluence is dark-only. No light mode toggle needed. All colors are designed for dark backgrounds.

## Workflow

When creating a new component:

1. **Check existing components**: Look in `src/components/` and `src/screens/` for similar patterns
2. **Use Shadcn primitives**: Before building custom, check if Shadcn has the component (`src/components/ui/`)
3. **Follow the color palette**: Use the tokens above, not arbitrary colors
4. **Add framer-motion**: For entrance animations on cards, modals, panels
5. **Test at 1440px+**: Primary viewport. Then check 1024px for graceful degradation
6. **No inline styles**: Use Tailwind classes exclusively
