# Image Generation UI Improvements - Implementation Plan

**Created:** 2026-01-14
**Status:** ✅ COMPLETED
**File:** `src/screens/ImageGeneration/ImageGeneration.tsx`
**Completed:** 2026-01-14

---

## Overview

Three UI improvements for `/image-generation` page:
1. **Model Selection Dropdown** - Choose AI model for A-ROLL vs B-ROLL ✅
2. **Reference Image for B-ROLL** - Add stock/uploaded reference images ✅
3. **Multi-Image Regeneration** - Max 3 images per segment validation ✅

---

## ✅ ALL TASKS COMPLETED

### 1. Enhanced Keyword Extraction ✅
- Updated from simple stopword filtering to regex + pattern matching
- Extracts proper nouns, product names, brands, quoted terms
- Fallback to "of" phrases and meaningful nouns

### 2. ReferenceImageModal Component ✅
- Added after RegenerateModal
- Auto-search when modal opens with extracted keywords
- Stock image search via `search-stock-images` edge function
- Manual URL paste option
- 4-column grid layout for results

### 3. Model Selection Dropdown ✅
- Added in header next to "Generate All Images" button
- A-ROLL options: Auto (Nano Banana), Nano Banana Edit, FLUX Kontext Pro
- B-ROLL options: Auto (Qwen Image), Qwen Image, Seedream v4
- Persists during session

### 4. Reference Image Button on B-ROLL Segments ✅
- "Add Reference 📷" button shows only for non-CREATOR shots
- Displays thumbnail when reference is added
- X button to remove reference
- Auto-extracts keywords from visualDirection/script

### 5. handleReferenceImageSelect Handler ✅
- Updates segment with referenceImageUrl and referenceImageSource
- Closes modal after selection

### 6. Max 3 Images Validation ✅
- Added check at start of handleRegenerateWithNotes
- Shows localized alert (ID/EN)

### 7. Edge Function Calls Updated ✅
- `handleGenerateAllBackground` - passes image_model and reference_image_url
- `handleRegenerateAll` - passes image_model and reference_image_url
- `handleGenerateImage` - passes image_model and reference_image_url
- Added imageModels to dependency arrays

---

## Testing Checklist

- [x] Model dropdown opens/closes correctly
- [x] Model selection persists during session
- [x] "Add Reference" button only shows on B-ROLL segments
- [x] Keyword extraction works (test with various visualDirection texts)
- [ ] Stock image search returns results (needs edge function test)
- [x] Manual URL paste works
- [x] Reference image displays on segment card
- [x] Reference image can be removed
- [x] Max 3 images validation triggers alert
- [x] Model selection passed to edge function

---

## Code Locations

| Feature | Line(s) |
|---------|---------|
| IMAGE_MODELS const | ~75-90 |
| extractKeywords (enhanced) | ~95-135 |
| ReferenceImageModal | ~520-670 |
| Model dropdown (JSX) | ~1650-1710 |
| Reference button (JSX) | ~1910-1955 |
| handleReferenceImageSelect | ~1460-1470 |
| Max 3 validation | ~1420-1430 |
| Edge function updates | ~1115, ~1220, ~1300 |

---

## Notes

- Edge function `generate-images` needs to handle `image_model` and `reference_image_url` parameters
- Stock image search relies on existing `search-stock-images` edge function
- Model selection only affects new generations (not existing images)
