# Layout Selector Redesign — ImageGeneration Page

**Date:** 2026-02-05
**Status:** Approved

## Summary

Replace the `<select>` dropdown layout selector with a popover containing mini preview thumbnails. Only show when segment has a creator face. Add LOOP-END ON/OFF toggle.

## Decisions

| Decision | Choice |
|----------|--------|
| Visual style | Mini preview thumbnails (PNG, 60x90px) |
| UI pattern | Popover/dropdown triggered by button |
| Image source | Static PNGs in `/public/layout-previews/` |
| Visibility | Only when `hasCreatorFace` (CREATOR shot OR B-ROLL with includeCreatorFace) |
| LOOP-END toggle | ON/OFF switch per LOOP-END segment, default ON |

## Layout Selector

### Trigger Button
- Compact button in segment header (replaces `<select>`)
- Shows active layout label (e.g. "Full")
- Only renders when `hasCreatorFace = isCreatorShot || segment.includeCreatorFace`

### Popover Content
- Grid of 5 thumbnails (60x90px, 9:16 ratio)
- Selected thumbnail has purple border highlight
- Label below each thumbnail (10px)
- Click thumbnail → set layout → auto-close
- Click outside → close

### Layout Options
| Layout | File | Label |
|--------|------|-------|
| full | `/layout-previews/full.png` | Full |
| split-60-40 | `/layout-previews/split-60-40.png` | Split 60/40 |
| split-50-50 | `/layout-previews/split-50-50.png` | Split 50/50 |
| pip | `/layout-previews/pip.png` | PiP |
| creator-center | `/layout-previews/creator-center.png` | Center |

## LOOP-END Toggle

- Small switch toggle next to "LOOP-END" badge in segment header
- Only visible for `segment_type === 'LOOP-END'`
- Default: ON (segment exists from script generation)
- OFF: card grayed out (opacity 40%), generate button disabled, skipped in "Generate All"
- ON: segment functions normally
- Field: `loopEndEnabled: boolean` (default `true`) in Segment interface

## Files Changed

- `src/screens/ImageGeneration/ImageGeneration.tsx` — all changes in this single file
