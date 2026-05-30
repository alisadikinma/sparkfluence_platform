# Integration Guide: VisualPreviewGallery Component

## Overview
Replace the existing Visual Preview section with the new `VisualPreviewGallery` component that supports:
- **Multiple images per segment** (max 3)
- **Regenerate → adds new image** (tidak replace index 0)
- **Warning modal** saat max 3 tercapai
- **WOW Effect UI** dengan animations dan glass morphism

---

## Step 1: Add Import

Di bagian atas file `ImageGeneration.tsx`, tambahkan import:

```tsx
// Add this import near the top (after other imports)
import { VisualPreviewGallery } from './components/VisualPreviewGallery';
```

---

## Step 2: Add handleDeleteImage Function

Setelah `handleSelectImage` function (~line 765), tambahkan:

```tsx
const handleDeleteImage = useCallback(async (imageId: string, segmentNumber: number) => {
  if (!user || !sessionId) return;

  // Confirm deletion
  const confirmMsg = language === 'id' 
    ? 'Hapus gambar ini?' 
    : 'Delete this image?';
  
  if (!window.confirm(confirmMsg)) return;

  try {
    // Delete from database
    const { error } = await supabase
      .from('image_generation_jobs')
      .delete()
      .eq('id', imageId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Update local state - remove the image from segment
    setSegments(prev => prev.map((seg, idx) => {
      if (idx + 1 !== segmentNumber) return seg;

      const updatedImages = seg.images.filter(img => img.id !== imageId);
      
      // If we deleted the selected image, select the first remaining one
      const hadSelected = seg.images.find(img => img.id === imageId)?.isSelected;
      if (hadSelected && updatedImages.length > 0) {
        updatedImages[0].isSelected = true;
      }

      return {
        ...seg,
        images: updatedImages,
        imageUrl: updatedImages.find(img => img.isSelected)?.imageUrl || 
                  updatedImages[0]?.imageUrl || null
      };
    }));

  } catch (err) {
    console.error('Failed to delete image:', err);
    alert(language === 'id' ? 'Gagal menghapus gambar' : 'Failed to delete image');
  }
}, [user, sessionId, language]);
```

---

## Step 3: Update handleRegenerateWithNotes

Cari function `handleRegenerateWithNotes` dan update untuk:
1. Validasi max 3 images
2. Auto-select new image setelah generate

```tsx
const handleRegenerateWithNotes = useCallback(async (notes: string, referenceImageUrl?: string) => {
  if (!user || !sessionId || !regenerateModal.segment) return;

  const segment = regenerateModal.segment;
  const segmentNumber = parseInt(segment.id);

  // ✅ NEW: Max 3 images validation
  const currentImageCount = (segment.images || []).filter(
    img => img.status === JOB_STATUS.COMPLETED || img.status === JOB_STATUS.PROCESSING
  ).length;
  
  if (currentImageCount >= 3) {
    alert(language === 'id' 
      ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.'
      : 'Maximum 3 images per segment. Delete old images first.');
    return;
  }

  // Update segment to show processing
  setSegments(prev => prev.map(seg =>
    seg.id === segment.id
      ? { ...seg, isGeneratingImage: true }
      : seg
  ));

  try {
    // Get max generation number for this segment
    const maxGenNumber = Math.max(...(segment.images || []).map(img => img.generationNumber), 0);

    // Call Edge Function to create new regeneration job
    const { data, error } = await supabase.functions.invoke('generate-images', {
      body: {
        mode: 'regenerate_single',
        user_id: user.id,
        session_id: sessionId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: notes,
        reference_image_url: referenceImageUrl,
        visual_prompt: segment.visualDirection,
        script_text: segment.script,
        segment_type: segment.type,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: videoSettings?.aspectRatio || '9:16'
      }
    });

    if (error) throw error;

    console.log('Regeneration job created:', data);

    // Start background processing to poll for the new image
    startBackgroundProcessing(sessionId);

    // Close modal
    setRegenerateModal({ isOpen: false, segment: null });

  } catch (err) {
    console.error('Regenerate failed:', err);
    setSegments(prev => prev.map(seg =>
      seg.id === segment.id
        ? { ...seg, isGeneratingImage: false }
        : seg
    ));
    alert('Failed to regenerate image. Please try again.');
  }
}, [user, sessionId, regenerateModal.segment, videoSettings, startBackgroundProcessing, language]);
```

---

## Step 4: Replace Visual Preview Section

Cari section dengan comment `{/* Visual Preview */}` (sekitar line 1230-1320).

**REPLACE THIS ENTIRE BLOCK:**
```tsx
{/* Visual Preview */}
<div className="w-full sm:w-44 flex-shrink-0">
  <label className="text-text-secondary text-xs mb-1.5 block">
    {uiText.visualPreview}
    {isCreatorShot && (
      <span className="text-pink-600 dark:text-pink-400 ml-1">({uiText.creatorShot})</span>
    )}
  </label>
  <div className="w-full aspect-[9/16] sm:h-56 bg-surface border border-border-default rounded-lg overflow-hidden relative">
    {/* ... all the existing conditional rendering ... */}
  </div>

  {/* ... Add Reference Image Button section ... */}

  {/* Image Gallery - Multi-image support */}
  <ImageGallery
    images={segment.images || []}
    segmentNumber={parseInt(segment.id)}
    sessionId={sessionId}
    onSelectImage={(imageId) => handleSelectImage(imageId, parseInt(segment.id))}
    onRegenerateImage={() => setRegenerateModal({ isOpen: true, segment })}
    onDeleteImage={(imageId) => {
      console.log('Delete image:', imageId);
    }}
    disabled={isBackgroundMode}
  />
</div>
```

**WITH THIS NEW BLOCK:**
```tsx
{/* Visual Preview - NEW Gallery Component */}
<div className="w-full sm:w-48 flex-shrink-0">
  <label className="text-text-secondary text-xs mb-1.5 block">
    {uiText.visualPreview}
  </label>
  
  <VisualPreviewGallery
    images={segment.images || []}
    segmentId={segment.id}
    segmentType={segment.type}
    isCreatorShot={isCreatorShot}
    isGenerating={segment.isGeneratingImage}
    imageError={segment.imageError || null}
    selectedImageUrl={segment.imageUrl}
    onGenerate={() => handleGenerateImage(segment.id)}
    onRegenerate={() => setRegenerateModal({ isOpen: true, segment })}
    onSelectImage={(imageId) => handleSelectImage(imageId, parseInt(segment.id))}
    onDeleteImage={(imageId) => handleDeleteImage(imageId, parseInt(segment.id))}
    onPreview={(url) => setPreviewImage(url)}
    onDownload={(url) => handleDownloadImage(url, segment.type, segment.id)}
    disabled={isBackgroundMode}
    language={language}
  />

  {/* Add Reference Image Button - Only for B-ROLL segments */}
  {!isCreatorShot && (
    <div className="mt-2 space-y-2" style={{ overflow: 'visible' }}>
      {/* ... Keep existing Include Creator Face checkbox ... */}
      {/* ... Keep existing Reference Image section ... */}
    </div>
  )}
</div>
```

---

## Step 5: Remove Old ImageGallery Component

Hapus atau comment out `ImageGallery` component definition (sekitar line 269-360) karena sudah digantikan dengan `VisualPreviewGallery` yang lebih baik.

---

## Step 6: Optional - Increase Preview Width

Untuk tampilan lebih baik dengan gallery strip, update width dari `sm:w-44` ke `sm:w-48`:

```tsx
// Before:
<div className="w-full sm:w-44 flex-shrink-0">

// After:
<div className="w-full sm:w-48 flex-shrink-0">
```

---

## UI Features Included

### ✨ WOW Effects:
1. **Glassmorphism** - backdrop blur pada action buttons
2. **Gradient overlays** - smooth transitions
3. **Animated loading** - bouncing dots + pulse effects
4. **Hover scale** - thumbnails dan buttons membesar
5. **Ring effects** - glow pada selected items
6. **Smooth transitions** - 300ms duration pada semua animasi

### 🎯 Functionality:
1. **3 thumbnail slots** - always visible (empty = dashed border)
2. **Generation number badges** - #1, #2, #3
3. **Selected indicator** - green checkmark + ring glow
4. **Delete on hover** - trash icon pada non-selected thumbnails
5. **Max warning modal** - beautiful amber-themed popup
6. **Slots remaining** - text indicator di hover overlay

---

## Testing Checklist

- [ ] Generate pertama → image muncul di slot #1
- [ ] Regenerate → image baru di slot #2 (bukan replace #1)
- [ ] Max 3 images → warning modal muncul
- [ ] Click thumbnail → select image tersebut
- [ ] Hover non-selected → delete button muncul
- [ ] Delete image → slot kosong kembali
- [ ] Creator badge muncul untuk CREATOR shots
- [ ] Preview modal works
- [ ] Download works

---

## Files Modified

1. `src/screens/ImageGeneration/components/VisualPreviewGallery.tsx` - NEW
2. `src/screens/ImageGeneration/components/index.ts` - NEW
3. `src/screens/ImageGeneration/ImageGeneration.tsx` - MODIFIED (integration)

---

**Author:** Claude AI  
**Date:** January 14, 2026  
**Version:** 1.0
