# ImageGeneration Page Redesign — Options Modal + Structured VD

**Date:** 2026-02-05
**Status:** Approved

## Summary

Redesign the ImageGeneration page: separate options configuration from image generation, restructure Visual Direction display as parsed chips, and improve keyword extraction with topic context.

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Layout compositing | Metadata only — compositing in Studio/VPS |
| 2 | Modal purpose | Options picker only (no Generate button) |
| 3 | Modal trigger | [Set Options] button below Visual Preview |
| 4 | Visual Direction update | LLM rewrite incorporating user options on Apply |
| 5 | Visual Direction display | Structured chips (Scene, Camera, Lighting, Color, Atmosphere) |
| 6 | Keyword extraction | Pass topic/title as context to LLM |
| 7 | "Paste URL" position | Under Reference Image (right column), not left |
| 8 | CREATOR modal | Simplified — Additional Notes only |
| 9 | B-ROLL modal | Full: notes + reference image + creator face + layout |
| 10 | Generate All | Uses pre-configured options per segment |

## User Flow

```
1. Script generated → segments appear on /image-generation
2. User clicks [Set Options] on each segment → modal opens
3. User configures: reference image, creator face, layout, notes
4. User clicks [Apply Options] → modal closes
5. LLM rewrites visual_direction → structured chips update on card
6. Applied options visible on segment card (reference thumb, layout badge, etc.)
7. User clicks [Generate] per segment OR [Generate All] at top
8. Generation uses all pre-configured options per segment
```

## Modal Variants

### B-ROLL Modal

```
┌─────────────────────────────────────────────────┐
│  Configure BODY-1 (B-ROLL) Image          [X]   │
│  "Script text preview..."                        │
│                                                  │
│  ┌─── Left Column ───┐  ┌── Right Column ──────┐│
│  │                    │  │                      ││
│  │ Additional Notes   │  │ Reference Image      ││
│  │ [textarea]         │  │ [search box] [Search]││
│  │                    │  │ [keyword chips]      ││
│  │ ☐ Include Creator  │  │ [image grid 5x3]    ││
│  │   Face             │  │                      ││
│  │                    │  │ Or paste image URL...││
│  │ ┌ Layout (if ☑) ─┐│  │ [url input] [↑]     ││
│  │ │ [5 thumbnails] ││  │                      ││
│  │ └────────────────┘│  │                      ││
│  └────────────────────┘  └──────────────────────┘│
│                                                  │
│  [Cancel]                        [Apply Options] │
└──────────────────────────────────────────────────┘
```

- Additional Notes: textarea for environment, lighting, custom direction
- Include Creator Face: checkbox → shows avatar selector + Layout thumbnails
- Layout selector: 5 PNG thumbnails (full, split-60-40, split-50-50, pip, center)
  - Only visible when Include Creator Face is checked
- Reference Image: keyword search (Unsplash/Pexels) with topic-aware extraction
- Paste image URL: moved under Reference Image section (right column)
- Buttons: [Cancel] + [Apply Options]

### CREATOR Modal (Simplified)

```
┌─────────────────────────────────────────────────┐
│  Configure HOOK (CREATOR) Image           [X]   │
│  "Script text preview..."                        │
│                                                  │
│  Additional Notes                                │
│  [textarea - environment, lighting, custom...]   │
│                                                  │
│  [Cancel]                        [Apply Options] │
└──────────────────────────────────────────────────┘
```

- Additional Notes only (environment, lighting, custom creator context)
- No reference image search (uses avatar)
- No Include Creator Face checkbox (already CREATOR)
- Layout stays in segment card header popover (existing)

## Segment Card Layout

```
┌─ 2  FORE  8-16s  [8s ▼]  B-ROLL  Intrigue  Zoom-In ──────────────────┐
│                                                                         │
│  Script (VO)                                     [13/13 words]   AI    │
│  ┌──────────────────────────────────────────┐                           │
│  │ Gue bakal spill rahasia sukses...        │    Visual Preview         │
│  └──────────────────────────────────────────┘    ┌──────────────┐      │
│                                                   │              │      │
│  Visual Direction                                 │   [image]    │      │
│  ┌─────────────────────────────────────┐         │              │      │
│  │ Scene     │ Camera   │ Lighting     │         └──────────────┘      │
│  │ UMKM      │ MCU      │ Cool 5600K  │                                │
│  │ montage   │ 50mm     │ rim light   │         [Set Options]          │
│  │ Color     │ Atmosphere              │         [Generate]             │
│  │ Teal-blue │ Clean minimal           │                                │
│  └─────────────────────────────────────┘                                │
│                                                                         │
│  ┌─ Applied Options ───────────────────────────────────────────────┐   │
│  │ [ref thumb]  │ "dramatic lighting"  │ Creator Face │ Split 60/40│   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

- Visual Direction: parsed into 5 chips (Scene, Camera, Lighting, Color, Atmosphere)
- Click chip → expand full text for that category
- [Set Options]: opens modal (B-ROLL or CREATOR variant)
- [Generate]: generates image using applied options
- Applied Options bar: visible after Apply, shows reference thumbnail, notes, creator face, layout

## Visual Direction Rewrite (LLM)

On Apply, frontend calls edge function with:
- Original visual_direction
- Additional notes from user
- Reference image description (Unsplash metadata)
- Include creator face (boolean)
- Layout selection
- Script text + topic title (for context)

LLM returns structured JSON:
```json
{
  "visual_direction": "Full rewritten text...",
  "structured": {
    "scene": "UMKM montage with modern coworking space",
    "camera": "MCU to CU, 50mm f/2.8, slow dolly push-in",
    "lighting": "Dramatic high-contrast 5600K, rim light separation",
    "color": "Teal-blue grade, high contrast",
    "atmosphere": "Clean minimal, subtle lens flare"
  }
}
```

## Keyword Extraction Fix

Edge function `search-stock-images` updated:
- Accept `topic` parameter (script title from ScriptLab)
- LLM prompt: "This segment is part of a video about [topic]. Extract 1-3 stock photo search keywords that match the segment content within this topic context."
- Prevents generic keywords ("modern office") when topic is specific ("Claude CoWork")

## Files Changed

- `src/screens/ImageGeneration/ImageGeneration.tsx` — modal redesign, card layout, structured VD chips, Set Options button, Applied Options bar
- `supabase/functions/rewrite-visual-direction/index.ts` — NEW edge function for VD rewrite
- `supabase/functions/search-stock-images/index.ts` — add topic context to keyword extraction
