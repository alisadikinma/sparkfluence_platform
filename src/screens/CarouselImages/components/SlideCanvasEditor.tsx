// ============================================================================
// SlideCanvasEditor — Photopea-powered image editor for carousel slides
// Opens in new browser tab. Embeds Photopea via iframe + postMessage API.
// Full Photoshop-like editing: brush, eraser, layers, text, filters, etc.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Save, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrandingKit } from '../../../hooks/useBrandingKit';
import type { CarouselSlideRow } from '../../../types/carousel';
import { mapCarouselSlideRow } from '../../../types/carousel';

export const SlideCanvasEditor: React.FC = () => {
  const { projectId, slideId } = useParams<{ projectId: string; slideId: string }>();
  const { user } = useAuth();
  const { kit: brandingKit } = useBrandingKit();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const brandingAddedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slideType, setSlideType] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load slide data from DB
  useEffect(() => {
    if (!slideId || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('id', slideId)
        .single();

      if (!error && data) {
        const slide = mapCarouselSlideRow(data as CarouselSlideRow);
        setSlideType(slide.slideType);
        setImageUrl(slide.imageUrl);
      }
      setLoading(false);
    })();
  }, [slideId, user]);

  // Build Photopea config URL
  // Photopea accepts config as URL hash: https://www.photopea.com#CONFIG_JSON
  const photopeaUrl = React.useMemo(() => {
    const config = {
      files: [], // We'll load the image via postMessage after iframe loads
      environment: {
        theme: 0, // 0 = dark theme
        vmode: 0, // 0 = single view
      },
    };
    return `https://www.photopea.com#${encodeURIComponent(JSON.stringify(config))}`;
  }, []);

  // Listen for messages from Photopea iframe
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      // Photopea sends ArrayBuffer when user saves (File > Export As > PNG)
      if (e.origin !== 'https://www.photopea.com') return;

      // "done" string means a command completed
      if (e.data === 'done') {
        if (!imageLoaded && imageUrl) {
          // Photopea is ready — load the image
          setImageLoaded(true);
          loadImageIntoPhotopea();
        }
        return;
      }

      // ArrayBuffer = exported image data
      if (e.data instanceof ArrayBuffer) {
        await saveEditedImage(e.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [imageUrl, imageLoaded]);

  // Load the slide image into Photopea via postMessage
  const loadImageIntoPhotopea = useCallback(async () => {
    if (!imageUrl || !iframeRef.current?.contentWindow) return;
    const pw = iframeRef.current.contentWindow;

    try {
      // 1. Load main image
      const resp = await fetch(imageUrl);
      const buffer = await resp.arrayBuffer();
      pw.postMessage(buffer, 'https://www.photopea.com');

      // 2. Add branding layers (logo + handle) after a short delay for main image to load
      if (!brandingAddedRef.current && brandingKit) {
        brandingAddedRef.current = true;
        setTimeout(async () => {
          try {
            // Add brand logo as a new layer
            if (brandingKit.logoUrl) {
              const logoResp = await fetch(brandingKit.logoUrl);
              const logoBuffer = await logoResp.arrayBuffer();
              // Open as new layer in existing document
              pw.postMessage(logoBuffer, 'https://www.photopea.com');
              // Wait for it to load, then resize + position via script
              setTimeout(() => {
                const script = `
                  var doc = app.activeDocument;
                  var logoLayer = doc.activeLayer;
                  logoLayer.name = "${brandingKit.handleText || '@brand'} logo";
                  // Resize logo to ~15% of canvas width
                  var targetW = doc.width * 0.15;
                  var scale = (targetW / logoLayer.bounds[2]) * 100;
                  if (scale < 100) logoLayer.resize(scale, scale);
                  // Move to top-left corner
                  var dx = 30 - logoLayer.bounds[0];
                  var dy = 30 - logoLayer.bounds[1];
                  logoLayer.translate(dx, dy);
                  // Set opacity to 70%
                  logoLayer.opacity = 70;
                `;
                pw.postMessage(script, 'https://www.photopea.com');
              }, 1500);
            }

            // Add brand handle as text layer
            if (brandingKit.handleText) {
              setTimeout(() => {
                const handleText = brandingKit.handleText!.replace(/"/g, '\\"');
                const script = `
                  var doc = app.activeDocument;
                  var textLayer = doc.artLayers.add();
                  textLayer.kind = LayerKind.TEXT;
                  textLayer.name = "${handleText}";
                  textLayer.textItem.contents = "${handleText}";
                  textLayer.textItem.size = 36;
                  textLayer.textItem.color = new SolidColor();
                  textLayer.textItem.color.rgb.red = 255;
                  textLayer.textItem.color.rgb.green = 255;
                  textLayer.textItem.color.rgb.blue = 255;
                  textLayer.textItem.font = "ArialMT";
                  textLayer.opacity = 70;
                  // Position below logo
                  textLayer.translate(30, ${brandingKit.logoUrl ? 'doc.width * 0.15 + 50' : '30'});
                `;
                pw.postMessage(script, 'https://www.photopea.com');
              }, brandingKit.logoUrl ? 3000 : 1500);
            }
          } catch (err) {
            console.error('[SlideCanvasEditor] Failed to add branding layers:', err);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('[SlideCanvasEditor] Failed to load image into Photopea:', err);
    }
  }, [imageUrl, brandingKit]);

  // Save the edited image from Photopea's exported ArrayBuffer
  const saveEditedImage = useCallback(async (buffer: ArrayBuffer) => {
    if (!slideId || !projectId || saving) return;

    setSaving(true);
    try {
      const blob = new Blob([buffer], { type: 'image/png' });
      const fileName = `${projectId}/slide-${slideId}-edited-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

      // Update DB
      await supabase.from('carousel_slides')
        .update({ image_url: urlData.publicUrl })
        .eq('id', slideId);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[SlideCanvasEditor] Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [slideId, projectId, saving]);

  // Trigger Photopea to export current document as PNG
  const handleSave = () => {
    if (!iframeRef.current?.contentWindow) return;
    // This command tells Photopea to export the active document as PNG
    // The result comes back via postMessage as ArrayBuffer
    iframeRef.current.contentWindow.postMessage(
      'app.activeDocument.saveToOE("png")',
      'https://www.photopea.com',
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <p className="text-neutral-400">Slide not found or no image to edit</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0B0E14]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-xl flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-neutral-200">
            Edit Slide — {slideType}
          </h1>
          <span className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
            {projectId}
          </span>
          {!imageLoaded && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading image into editor...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save button — triggers Photopea export */}
          <button
            onClick={handleSave}
            disabled={saving || !imageLoaded}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved to Sparkfluence!' : 'Save to Sparkfluence'}
          </button>

          {/* Close */}
          <button
            onClick={() => window.close()}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
            title="Close tab"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Photopea iframe — takes full remaining height */}
      <iframe
        ref={iframeRef}
        src={photopeaUrl}
        className="flex-1 w-full border-0"
        allow="cross-origin-isolated"
        title="Photopea Editor"
      />
    </div>
  );
};
