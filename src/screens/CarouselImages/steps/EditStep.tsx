// ============================================================================
// EditStep — Full-screen 3-panel fabric.js Canvas Image Editor
// for Carousel Image feature. Renders inside CarouselWorkspace.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MousePointer2, Type, Square, Undo2, Redo2, Copy, Trash2,
  Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  SlidersHorizontal, Layers, Eye, EyeOff, Lock, Unlock, GripVertical,
  ArrowUpDown, Circle, Minus, ChevronDown, Upload, Palette,
} from 'lucide-react';
import { Canvas, FabricImage, FabricText, Rect, Circle as FabricCircle, Line, FabricObject, util } from 'fabric';
import { supabase } from '../../../lib/supabase';
import { useBrandingKit } from '../../../hooks/useBrandingKit';
import { preloadFonts } from '../../../hooks/useFontLoader';
import type { CarouselProject, CarouselSlide, CarouselSlideRow, CarouselSlideType } from '../../../types/carousel';
import { mapCarouselSlideRow, SLIDE_TYPE_CONFIG } from '../../../types/carousel';
import type { BrandingKit } from '../../../types/branding';
import { CURATED_FONTS } from '../../../types/branding';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const MAX_UNDO = 50;
const AUTOSAVE_DELAY = 3000;

type ToolMode = 'select' | 'text' | 'shape';
type RightPanelMode = 'properties' | 'filters' | 'layers';
type ShapeType = 'rect' | 'circle' | 'line';

// Filter presets: each applies brightness/contrast/saturation/hue offsets
interface FilterPreset {
  label: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

const FILTER_PRESETS: FilterPreset[] = [
  { label: 'Warm',           brightness: 0.05, contrast: 0.05, saturation: 0.15, hue: 15 },
  { label: 'Cool',           brightness: 0,    contrast: 0.05, saturation: 0.1,  hue: -20 },
  { label: 'Vintage',        brightness: -0.05, contrast: 0.1, saturation: -0.3, hue: 10 },
  { label: 'Dramatic',       brightness: -0.1, contrast: 0.3,  saturation: 0.1,  hue: 0 },
  { label: 'Moody',          brightness: -0.15, contrast: 0.15, saturation: -0.1, hue: -10 },
  { label: 'Vibrant',        brightness: 0.05, contrast: 0.1,  saturation: 0.4,  hue: 0 },
  { label: 'Cinematic',      brightness: -0.05, contrast: 0.2, saturation: -0.1, hue: -5 },
  { label: 'Matte',          brightness: 0.05, contrast: -0.15, saturation: -0.1, hue: 0 },
  { label: 'High Contrast',  brightness: 0,    contrast: 0.4,  saturation: 0.1,  hue: 0 },
  { label: 'Desaturated',    brightness: 0,    contrast: 0.05, saturation: -0.5, hue: 0 },
  { label: 'Sepia',          brightness: 0.05, contrast: 0.1,  saturation: -0.6, hue: 30 },
  { label: 'Kodak Portra',   brightness: 0.05, contrast: 0.05, saturation: 0.05, hue: 8 },
  { label: 'Fuji Superia',   brightness: 0,    contrast: 0.1,  saturation: 0.2,  hue: -5 },
  { label: 'CineStill 800T', brightness: -0.05, contrast: 0.15, saturation: 0.1, hue: -15 },
];

// Manual filter slider config
interface FilterSlider {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const FILTER_SLIDERS: FilterSlider[] = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.01, defaultValue: 0 },
  { key: 'contrast',   label: 'Contrast',   min: -1, max: 1, step: 0.01, defaultValue: 0 },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.01, defaultValue: 0 },
  { key: 'hue',        label: 'Hue',        min: -180, max: 180, step: 1, defaultValue: 0 },
  { key: 'blur',       label: 'Blur',       min: 0, max: 1, step: 0.01, defaultValue: 0 },
  { key: 'noise',      label: 'Sharpen',    min: 0, max: 1000, step: 10, defaultValue: 0 },
  { key: 'vignette',   label: 'Vignette',   min: 0, max: 1, step: 0.01, defaultValue: 0 },
];

const FONT_WEIGHTS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
];

const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;

// ============================================================================
// Props
// ============================================================================

interface EditStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditStep: React.FC<EditStepProps> = ({ project, onProjectUpdate }) => {
  // --- State ---
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [shapeType, setShapeType] = useState<ShapeType>('rect');
  const [rightPanel, setRightPanel] = useState<RightPanelMode>('properties');
  const [zoom, setZoom] = useState(1);
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null);
  const [selectedObjType, setSelectedObjType] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    FILTER_SLIDERS.forEach(s => { defaults[s.key] = s.defaultValue; });
    return defaults;
  });
  const [layerList, setLayerList] = useState<{ id: string; name: string; type: string; visible: boolean; locked: boolean }[]>([]);
  // Text properties
  const [textFont, setTextFont] = useState('Inter');
  const [textSize, setTextSize] = useState(48);
  const [textWeight, setTextWeight] = useState(700);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textLineHeight, setTextLineHeight] = useState(1.2);
  const [textLetterSpacing, setTextLetterSpacing] = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);
  const [textStrokeColor, setTextStrokeColor] = useState('#000000');
  const [textStrokeWidth, setTextStrokeWidth] = useState(0);
  // Shape properties
  const [shapeFill, setShapeFill] = useState('#10B981');
  const [shapeStroke, setShapeStroke] = useState('#FFFFFF');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);
  const [shapeOpacity, setShapeOpacity] = useState(1);
  const [shapeCornerRadius, setShapeCornerRadius] = useState(0);
  // Image properties
  const [imageOpacity, setImageOpacity] = useState(1);

  // --- Refs ---
  const canvasRef = useRef<Canvas | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingCanvasRef = useRef(false);
  const slidesRef = useRef<CarouselSlide[]>([]);
  slidesRef.current = slides;
  const activeSlideRef = useRef(0);
  activeSlideRef.current = activeSlideIndex;

  // --- Branding ---
  const { kit: brandingKit } = useBrandingKit();

  // --- Active slide ---
  const activeSlide = slides[activeSlideIndex] ?? null;

  // ============================================================================
  // Fetch slides
  // ============================================================================

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_slides')
      .select('*')
      .eq('project_id', project.id)
      .order('slide_index', { ascending: true });

    if (!error && data) {
      const mapped = (data as CarouselSlideRow[]).map(mapCarouselSlideRow);
      setSlides(mapped);
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Preload fonts
  useEffect(() => {
    preloadFonts(CURATED_FONTS);
  }, []);

  // ============================================================================
  // Canvas initialization
  // ============================================================================

  const initCanvas = useCallback(() => {
    if (!canvasElRef.current) return;

    // Dispose existing
    if (canvasRef.current) {
      canvasRef.current.dispose();
      canvasRef.current = null;
    }

    const c = new Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#000000',
      preserveObjectStacking: true,
      selection: true,
    });

    canvasRef.current = c;
    setCanvasReady(true);

    // Events
    c.on('selection:created', (e) => {
      const obj = e.selected?.[0] ?? null;
      handleObjectSelected(obj);
    });
    c.on('selection:updated', (e) => {
      const obj = e.selected?.[0] ?? null;
      handleObjectSelected(obj);
    });
    c.on('selection:cleared', () => {
      setSelectedObj(null);
      setSelectedObjType(null);
    });
    c.on('object:modified', () => {
      pushUndoState();
      scheduleAutosave();
      syncSelectedObjProps();
      refreshLayerList();
    });
    c.on('object:added', () => {
      refreshLayerList();
    });
    c.on('object:removed', () => {
      refreshLayerList();
    });

    fitCanvasToViewport();
    return c;
  }, []);

  useEffect(() => {
    const c = initCanvas();
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (c) c.dispose();
    };
  }, []);

  // ============================================================================
  // Load slide into canvas
  // ============================================================================

  const loadSlideIntoCanvas = useCallback(async (slide: CarouselSlide) => {
    const c = canvasRef.current;
    if (!c) return;

    isLoadingCanvasRef.current = true;
    c.clear();
    c.backgroundColor = '#000000';
    undoStackRef.current = [];
    redoStackRef.current = [];

    try {
      // If editor_state exists, restore it
      if (slide.editorState && Object.keys(slide.editorState).length > 0) {
        await new Promise<void>((resolve) => {
          c.loadFromJSON(slide.editorState, () => {
            c.renderAll();
            resolve();
          });
        });
      } else {
        // Load base image
        if (slide.imageUrl) {
          try {
            const img = await FabricImage.fromURL(slide.imageUrl, { crossOrigin: 'anonymous' });
            const scaleX = CANVAS_WIDTH / (img.width || CANVAS_WIDTH);
            const scaleY = CANVAS_HEIGHT / (img.height || CANVAS_HEIGHT);
            const scale = Math.max(scaleX, scaleY);
            img.set({
              scaleX: scale,
              scaleY: scale,
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
              // @ts-expect-error custom property for identification
              _sparkRole: 'background',
            });
            c.add(img);
          } catch {
            // Failed to load image — leave blank background
          }
        }

        // Auto-apply branding layers
        applyBrandingLayers(c, slide, slides.length);
      }

      c.renderAll();
      pushUndoState();
      refreshLayerList();
    } finally {
      isLoadingCanvasRef.current = false;
    }
  }, [slides.length]);

  // Load when active slide changes
  useEffect(() => {
    if (canvasReady && activeSlide) {
      loadSlideIntoCanvas(activeSlide);
    }
  }, [canvasReady, activeSlideIndex, activeSlide?.id]);

  // ============================================================================
  // Branding layers
  // ============================================================================

  function applyBrandingLayers(c: Canvas, slide: CarouselSlide, totalSlides: number) {
    const kit = brandingKit;
    const fontFamily = kit?.fontFamily || 'Inter';
    const colors = kit?.colors;
    const presets = kit?.textPresets;

    // Pagination "[N]/[TOTAL]" top-left
    const paginationText = `${slide.slideIndex + 1}/${totalSlides}`;
    const pagination = new FabricText(paginationText, {
      left: 40,
      top: 30,
      fontSize: presets?.pagination?.fontSize || 14,
      fontWeight: presets?.pagination?.fontWeight || 400,
      fontFamily,
      fill: presets?.pagination?.color || '#A3A3A3',
      opacity: 0.8,
      // @ts-expect-error custom property
      _sparkRole: 'pagination',
      _sparkBranding: true,
    });
    c.add(pagination);

    // Logo watermark (center, 30% opacity)
    if (kit?.logoUrl) {
      FabricImage.fromURL(kit.logoUrl, { crossOrigin: 'anonymous' })
        .then((logoImg) => {
          const maxSize = 200;
          const logoScale = Math.min(maxSize / (logoImg.width || 200), maxSize / (logoImg.height || 200));
          logoImg.set({
            scaleX: logoScale,
            scaleY: logoScale,
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2 - 40,
            originX: 'center',
            originY: 'center',
            opacity: (kit.watermark?.opacity ?? 30) / 100,
            // @ts-expect-error custom property
            _sparkRole: 'logo',
            _sparkBranding: true,
          });
          c.add(logoImg);
          c.renderAll();
          refreshLayerList();
        })
        .catch(() => {});
    }

    // @handle text below logo area
    if (kit?.handleText) {
      const handleTextObj = new FabricText(kit.handleText, {
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2 + 30,
        originX: 'center',
        originY: 'center',
        fontSize: 20,
        fontWeight: 500,
        fontFamily,
        fill: colors?.muted || '#A3A3A3',
        opacity: 0.3,
        // @ts-expect-error custom property
        _sparkRole: 'handle',
        _sparkBranding: true,
      });
      c.add(handleTextObj);
    }

    // SWIPE CTA bottom-center (except CTA type slides)
    if (slide.slideType !== 'CTA') {
      const ctaPreset = presets?.cta;
      const ctaText = new FabricText('SWIPE \u2192', {
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT - 60,
        originX: 'center',
        originY: 'center',
        fontSize: ctaPreset?.fontSize || 28,
        fontWeight: ctaPreset?.fontWeight || 800,
        fontFamily,
        fill: ctaPreset?.textColor || ctaPreset?.color || '#000000',
        backgroundColor: ctaPreset?.bgColor || colors?.highlight || '#F5A623',
        // @ts-expect-error custom property
        _sparkRole: 'swipeCta',
        _sparkBranding: true,
      });
      c.add(ctaText);
    }
  }

  // ============================================================================
  // Undo / Redo
  // ============================================================================

  function pushUndoState() {
    const c = canvasRef.current;
    if (!c || isLoadingCanvasRef.current) return;
    const json = JSON.stringify(c.toJSON(['_sparkRole', '_sparkBranding']));
    undoStackRef.current.push(json);
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }

  function handleUndo() {
    const c = canvasRef.current;
    if (!c || undoStackRef.current.length <= 1) return;
    const current = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    if (prev) {
      isLoadingCanvasRef.current = true;
      c.loadFromJSON(JSON.parse(prev), () => {
        c.renderAll();
        isLoadingCanvasRef.current = false;
        refreshLayerList();
        scheduleAutosave();
      });
    }
  }

  function handleRedo() {
    const c = canvasRef.current;
    if (!c || redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(next);
    isLoadingCanvasRef.current = true;
    c.loadFromJSON(JSON.parse(next), () => {
      c.renderAll();
      isLoadingCanvasRef.current = false;
      refreshLayerList();
      scheduleAutosave();
    });
  }

  // ============================================================================
  // Auto-save
  // ============================================================================

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveEditorState();
    }, AUTOSAVE_DELAY);
  }

  async function saveEditorState() {
    const c = canvasRef.current;
    const slide = slidesRef.current[activeSlideRef.current];
    if (!c || !slide) return;

    setSaving(true);
    const json = c.toJSON(['_sparkRole', '_sparkBranding']);

    await supabase
      .from('carousel_slides')
      .update({ editor_state: json })
      .eq('id', slide.id);

    setSaving(false);
  }

  async function handleManualSave() {
    await saveEditorState();
  }

  // ============================================================================
  // Save & Continue — flatten to image, upload, update slide
  // ============================================================================

  async function handleSaveAndContinue() {
    const c = canvasRef.current;
    if (!c) return;
    setSaving(true);

    try {
      // Save editor state first
      await saveEditorState();

      // Flatten canvas to data URL
      const dataUrl = c.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Upload to Supabase Storage
      const fileName = `${project.projectId}/slide-${activeSlide?.slideIndex ?? 0}-edited-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(uploadData.path);

      // Update slide image_url
      if (activeSlide) {
        await supabase
          .from('carousel_slides')
          .update({ image_url: urlData.publicUrl })
          .eq('id', activeSlide.id);
      }

      // Move to next slide or signal completion
      if (activeSlideIndex < slides.length - 1) {
        setActiveSlideIndex(activeSlideIndex + 1);
      } else {
        // All slides edited — update project status
        await supabase
          .from('carousel_projects')
          .update({ status: 'edited' })
          .eq('id', project.id);
        onProjectUpdate();
      }
    } catch (err) {
      console.error('Save & Continue error:', err);
    } finally {
      setSaving(false);
    }
  }

  // ============================================================================
  // Selection handling
  // ============================================================================

  function handleObjectSelected(obj: FabricObject | null) {
    setSelectedObj(obj);
    if (!obj) {
      setSelectedObjType(null);
      return;
    }
    if (obj instanceof FabricText) {
      setSelectedObjType('text');
      syncTextProps(obj);
    } else if (obj instanceof Rect || obj instanceof FabricCircle || obj instanceof Line) {
      setSelectedObjType('shape');
      syncShapeProps(obj);
    } else if (obj instanceof FabricImage) {
      setSelectedObjType('image');
      setImageOpacity(obj.opacity ?? 1);
    } else {
      setSelectedObjType('unknown');
    }
  }

  function syncSelectedObjProps() {
    const c = canvasRef.current;
    if (!c) return;
    const obj = c.getActiveObject();
    if (obj) handleObjectSelected(obj);
  }

  function syncTextProps(obj: FabricText) {
    setTextFont(obj.fontFamily || 'Inter');
    setTextSize(obj.fontSize || 48);
    setTextWeight(typeof obj.fontWeight === 'number' ? obj.fontWeight : 700);
    setTextColor((obj.fill as string) || '#FFFFFF');
    setTextAlign((obj.textAlign as 'left' | 'center' | 'right') || 'center');
    setTextLineHeight(obj.lineHeight || 1.2);
    setTextLetterSpacing(obj.charSpacing || 0);
    setTextOpacity(obj.opacity ?? 1);
    setTextStrokeColor(obj.stroke || '#000000');
    setTextStrokeWidth(obj.strokeWidth || 0);
  }

  function syncShapeProps(obj: FabricObject) {
    setShapeFill((obj.fill as string) || '#10B981');
    setShapeStroke(obj.stroke || '#FFFFFF');
    setShapeStrokeWidth(obj.strokeWidth || 0);
    setShapeOpacity(obj.opacity ?? 1);
    if (obj instanceof Rect) {
      setShapeCornerRadius((obj as Rect).rx || 0);
    }
  }

  // ============================================================================
  // Tool actions
  // ============================================================================

  function addTextObject() {
    const c = canvasRef.current;
    if (!c) return;

    const text = new FabricText('Double-click to edit', {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 48,
      fontWeight: 700,
      fontFamily: brandingKit?.fontFamily || 'Inter',
      fill: '#FFFFFF',
      textAlign: 'center',
      editable: true,
    });
    c.add(text);
    c.setActiveObject(text);
    c.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  function addShapeObject(type: ShapeType) {
    const c = canvasRef.current;
    if (!c) return;

    let shape: FabricObject;

    switch (type) {
      case 'rect':
        shape = new Rect({
          left: CANVAS_WIDTH / 2 - 100,
          top: CANVAS_HEIGHT / 2 - 75,
          width: 200,
          height: 150,
          fill: '#10B981',
          rx: 0,
          ry: 0,
          strokeWidth: 0,
          stroke: '#FFFFFF',
        });
        break;
      case 'circle':
        shape = new FabricCircle({
          left: CANVAS_WIDTH / 2 - 75,
          top: CANVAS_HEIGHT / 2 - 75,
          radius: 75,
          fill: '#10B981',
          strokeWidth: 0,
          stroke: '#FFFFFF',
        });
        break;
      case 'line':
        shape = new Line([CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2 + 100, CANVAS_HEIGHT / 2], {
          stroke: '#FFFFFF',
          strokeWidth: 3,
        });
        break;
      default:
        return;
    }

    c.add(shape);
    c.setActiveObject(shape);
    c.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  function handleDuplicate() {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;

    obj.clone().then((cloned: FabricObject) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
      c.add(cloned);
      c.setActiveObject(cloned);
      c.renderAll();
      pushUndoState();
      scheduleAutosave();
    });
  }

  function handleDelete() {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;

    c.remove(obj);
    c.discardActiveObject();
    c.renderAll();
    setSelectedObj(null);
    setSelectedObjType(null);
    pushUndoState();
    scheduleAutosave();
  }

  // ============================================================================
  // Zoom
  // ============================================================================

  function fitCanvasToViewport() {
    const container = containerRef.current;
    if (!container) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const padding = 40;
    const scaleX = (cw - padding * 2) / CANVAS_WIDTH;
    const scaleY = (ch - padding * 2) / CANVAS_HEIGHT;
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(newZoom);
    applyZoom(newZoom);
  }

  function applyZoom(z: number) {
    const c = canvasRef.current;
    if (!c) return;
    c.setZoom(z);
    c.setDimensions({
      width: CANVAS_WIDTH * z,
      height: CANVAS_HEIGHT * z,
    });
  }

  function handleZoomIn() {
    const newZoom = Math.min(zoom + 0.1, 3);
    setZoom(newZoom);
    applyZoom(newZoom);
  }

  function handleZoomOut() {
    const newZoom = Math.max(zoom - 0.1, 0.1);
    setZoom(newZoom);
    applyZoom(newZoom);
  }

  function handleFitView() {
    fitCanvasToViewport();
  }

  // Ctrl+wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
      setZoom(newZoom);
      applyZoom(newZoom);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoom]);

  // Resize observer for fit
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canvasReady) return;

    const ro = new ResizeObserver(() => fitCanvasToViewport());
    ro.observe(container);
    return () => ro.disconnect();
  }, [canvasReady]);

  // ============================================================================
  // Slide navigation
  // ============================================================================

  function goToPrevSlide() {
    if (activeSlideIndex > 0) {
      saveEditorState();
      setActiveSlideIndex(activeSlideIndex - 1);
    }
  }

  function goToNextSlide() {
    if (activeSlideIndex < slides.length - 1) {
      saveEditorState();
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  }

  // ============================================================================
  // Update text properties on selected object
  // ============================================================================

  function updateTextProp(prop: string, value: unknown) {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj || !(obj instanceof FabricText)) return;
    obj.set(prop as keyof FabricText, value as never);
    c.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  function updateShapeProp(prop: string, value: unknown) {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    if (prop === 'rx' && obj instanceof Rect) {
      obj.set({ rx: value as number, ry: value as number });
    } else {
      obj.set(prop as keyof FabricObject, value as never);
    }
    c.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  function updateImageProp(prop: string, value: unknown) {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj || !(obj instanceof FabricImage)) return;
    obj.set(prop as keyof FabricImage, value as never);
    c.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  // ============================================================================
  // Filters (applied to background image)
  // ============================================================================

  function getBackgroundImage(): FabricImage | null {
    const c = canvasRef.current;
    if (!c) return null;
    const objects = c.getObjects();
    for (const obj of objects) {
      // @ts-expect-error custom property
      if (obj._sparkRole === 'background' && obj instanceof FabricImage) {
        return obj;
      }
    }
    // Fallback: first image object
    for (const obj of objects) {
      if (obj instanceof FabricImage) return obj;
    }
    return null;
  }

  function applyFilters(values: Record<string, number>) {
    const img = getBackgroundImage();
    if (!img) return;

    // Clear existing filters
    img.filters = [];

    // fabric.js v6 filters
    const { Brightness, Contrast, Saturation, HueRotation, Blur, Noise, Convolute } = (
      // @ts-expect-error fabric filters namespace
      FabricImage.filters || {}
    );

    // We'll use try/catch in case some filter classes aren't available
    try {
      if (values.brightness && values.brightness !== 0 && Brightness) {
        img.filters.push(new Brightness({ brightness: values.brightness }));
      }
      if (values.contrast && values.contrast !== 0 && Contrast) {
        img.filters.push(new Contrast({ contrast: values.contrast }));
      }
      if (values.saturation && values.saturation !== 0 && Saturation) {
        img.filters.push(new Saturation({ saturation: values.saturation }));
      }
      if (values.hue && values.hue !== 0 && HueRotation) {
        img.filters.push(new HueRotation({ rotation: values.hue / 360 }));
      }
      if (values.blur && values.blur > 0 && Blur) {
        img.filters.push(new Blur({ blur: values.blur }));
      }
      if (values.noise && values.noise > 0 && Noise) {
        img.filters.push(new Noise({ noise: values.noise }));
      }
    } catch {
      // Filter class not available in this fabric version
    }

    img.applyFilters();
    canvasRef.current?.renderAll();
    pushUndoState();
    scheduleAutosave();
  }

  function handlePresetClick(preset: FilterPreset) {
    setActivePreset(preset.label);
    const newValues: Record<string, number> = {
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      hue: preset.hue,
      blur: 0,
      noise: 0,
      vignette: 0,
    };
    setFilterValues(newValues);
    applyFilters(newValues);
  }

  function handleFilterSliderChange(key: string, value: number) {
    setActivePreset(null);
    const newValues = { ...filterValues, [key]: value };
    setFilterValues(newValues);
    applyFilters(newValues);
  }

  function handleResetFilters() {
    setActivePreset(null);
    const defaults: Record<string, number> = {};
    FILTER_SLIDERS.forEach(s => { defaults[s.key] = s.defaultValue; });
    setFilterValues(defaults);
    applyFilters(defaults);
  }

  // ============================================================================
  // Layer list
  // ============================================================================

  function refreshLayerList() {
    const c = canvasRef.current;
    if (!c) return;
    const objects = c.getObjects();
    const list = objects.map((obj, i) => {
      // @ts-expect-error custom property
      const role = obj._sparkRole as string | undefined;
      let name = role || `Object ${i + 1}`;
      let type = 'unknown';

      if (obj instanceof FabricText) {
        type = 'text';
        const textVal = obj.text || '';
        name = role || (textVal.length > 20 ? textVal.slice(0, 20) + '...' : textVal) || 'Text';
      } else if (obj instanceof FabricImage) {
        type = 'image';
        name = role === 'background' ? 'Background' : role === 'logo' ? 'Logo' : `Image ${i + 1}`;
      } else if (obj instanceof Rect) {
        type = 'shape';
        name = `Rectangle ${i + 1}`;
      } else if (obj instanceof FabricCircle) {
        type = 'shape';
        name = `Circle ${i + 1}`;
      } else if (obj instanceof Line) {
        type = 'shape';
        name = `Line ${i + 1}`;
      }

      return {
        id: String(i),
        name,
        type,
        visible: obj.visible !== false,
        locked: !obj.selectable,
      };
    }).reverse(); // Top layer first

    setLayerList(list);
  }

  function toggleLayerVisibility(layerIndex: string) {
    const c = canvasRef.current;
    if (!c) return;
    const realIdx = c.getObjects().length - 1 - parseInt(layerIndex);
    const obj = c.getObjects()[realIdx];
    if (!obj) return;
    obj.visible = !obj.visible;
    c.renderAll();
    refreshLayerList();
    pushUndoState();
    scheduleAutosave();
  }

  function toggleLayerLock(layerIndex: string) {
    const c = canvasRef.current;
    if (!c) return;
    const realIdx = c.getObjects().length - 1 - parseInt(layerIndex);
    const obj = c.getObjects()[realIdx];
    if (!obj) return;
    obj.selectable = !obj.selectable;
    obj.evented = obj.selectable;
    c.renderAll();
    refreshLayerList();
  }

  function selectLayer(layerIndex: string) {
    const c = canvasRef.current;
    if (!c) return;
    const realIdx = c.getObjects().length - 1 - parseInt(layerIndex);
    const obj = c.getObjects()[realIdx];
    if (!obj || !obj.selectable) return;
    c.setActiveObject(obj);
    c.renderAll();
  }

  // ============================================================================
  // Keyboard shortcuts
  // ============================================================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'v' && !ctrl) { e.preventDefault(); setToolMode('select'); }
      if (e.key === 't' && !ctrl) { e.preventDefault(); setToolMode('text'); addTextObject(); }
      if (e.key === 's' && !ctrl) { e.preventDefault(); setToolMode('shape'); }
      if (e.key === 'z' && ctrl && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.key === 'z' && ctrl && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (e.key === 'Z' && ctrl) { e.preventDefault(); handleRedo(); }
      if (e.key === 'd' && ctrl) { e.preventDefault(); handleDuplicate(); }
      if (e.key === 's' && ctrl) { e.preventDefault(); handleManualSave(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObj) { e.preventDefault(); handleDelete(); }
      }
      if (e.key === 'ArrowLeft' && !ctrl) { goToPrevSlide(); }
      if (e.key === 'ArrowRight' && !ctrl) { goToNextSlide(); }
      if (e.key === 'Escape') {
        canvasRef.current?.discardActiveObject();
        canvasRef.current?.renderAll();
        setSelectedObj(null);
        setSelectedObjType(null);
      }
      if (e.key === 'f' && !ctrl) { e.preventDefault(); setRightPanel(p => p === 'filters' ? 'properties' : 'filters'); }
      if (e.key === 'l' && !ctrl) { e.preventDefault(); setRightPanel(p => p === 'layers' ? 'properties' : 'layers'); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedObj, activeSlideIndex, slides.length, zoom]);

  // ============================================================================
  // Canvas click for tool actions
  // ============================================================================

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !canvasReady) return;

    const onMouseDown = (opt: { e: MouseEvent }) => {
      if (toolMode === 'text') {
        addTextObject();
        setToolMode('select');
      } else if (toolMode === 'shape') {
        addShapeObject(shapeType);
        setToolMode('select');
      }
    };

    // Only bind for non-select tools
    if (toolMode !== 'select') {
      c.on('mouse:down', onMouseDown);
    }

    return () => {
      c.off('mouse:down', onMouseDown);
    };
  }, [toolMode, shapeType, canvasReady]);

  // ============================================================================
  // Loading state
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0B0E14]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0B0E14] gap-3">
        <p className="text-neutral-400 text-sm">No slides to edit. Generate images first.</p>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-full bg-[#0B0E14] overflow-hidden">
      {/* ================================================================ */}
      {/* LEFT PANEL — Slide Navigator */}
      {/* ================================================================ */}
      <div className="w-[180px] flex-shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="px-3 py-2 border-b border-neutral-800/50">
          <span className="text-xs font-medium text-neutral-400">Slides</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, idx) => {
            const isActive = idx === activeSlideIndex;
            const config = SLIDE_TYPE_CONFIG[slide.slideType];
            return (
              <button
                key={slide.id}
                onClick={() => {
                  if (idx !== activeSlideIndex) {
                    saveEditorState();
                    setActiveSlideIndex(idx);
                  }
                }}
                className={`
                  w-full rounded-lg overflow-hidden transition-all relative group
                  ${isActive
                    ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-[#0B0E14]'
                    : 'ring-1 ring-neutral-700 hover:ring-neutral-600'
                  }
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-[4/5] bg-neutral-800 relative">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={`Slide ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-neutral-600 text-xs">No image</span>
                    </div>
                  )}
                  {/* Slide number */}
                  <div className="absolute top-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 font-medium">
                    {idx + 1}
                  </div>
                  {/* Type badge */}
                  <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${config.badgeBg} ${config.badgeText} border ${config.badgeBorder}`}>
                    {config.label}
                  </div>
                  {/* Editor state indicator */}
                  {slide.editorState && Object.keys(slide.editorState).length > 0 && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" title="Has editor state" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* CENTER — Canvas Viewport */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
          {/* Tool buttons */}
          <ToolButton
            icon={<MousePointer2 className="w-4 h-4" />}
            label="Select (V)"
            active={toolMode === 'select'}
            onClick={() => setToolMode('select')}
          />
          <ToolButton
            icon={<Type className="w-4 h-4" />}
            label="Text (T)"
            active={toolMode === 'text'}
            onClick={() => {
              setToolMode('text');
              addTextObject();
              setToolMode('select');
            }}
          />

          {/* Shape dropdown */}
          <div className="relative">
            <ToolButton
              icon={<Square className="w-4 h-4" />}
              label="Shape (S)"
              active={toolMode === 'shape'}
              onClick={() => setShapeMenuOpen(!shapeMenuOpen)}
              extra={<ChevronDown className="w-3 h-3 ml-0.5" />}
            />
            {shapeMenuOpen && (
              <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 transition-colors"
                  onClick={() => { addShapeObject('rect'); setShapeMenuOpen(false); }}
                >
                  <Square className="w-3.5 h-3.5" /> Rectangle
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 transition-colors"
                  onClick={() => { addShapeObject('circle'); setShapeMenuOpen(false); }}
                >
                  <Circle className="w-3.5 h-3.5" /> Circle
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 transition-colors"
                  onClick={() => { addShapeObject('line'); setShapeMenuOpen(false); }}
                >
                  <Minus className="w-3.5 h-3.5" /> Line
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Undo / Redo */}
          <ToolButton icon={<Undo2 className="w-4 h-4" />} label="Undo (Ctrl+Z)" onClick={handleUndo} />
          <ToolButton icon={<Redo2 className="w-4 h-4" />} label="Redo (Ctrl+Shift+Z)" onClick={handleRedo} />

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Duplicate / Delete */}
          <ToolButton icon={<Copy className="w-4 h-4" />} label="Duplicate (Ctrl+D)" onClick={handleDuplicate} disabled={!selectedObj} />
          <ToolButton icon={<Trash2 className="w-4 h-4" />} label="Delete (Del)" onClick={handleDelete} disabled={!selectedObj} />

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Filter / Layers toggles */}
          <ToolButton
            icon={<SlidersHorizontal className="w-4 h-4" />}
            label="Filters (F)"
            active={rightPanel === 'filters'}
            onClick={() => setRightPanel(p => p === 'filters' ? 'properties' : 'filters')}
          />
          <ToolButton
            icon={<Layers className="w-4 h-4" />}
            label="Layers (L)"
            active={rightPanel === 'layers'}
            onClick={() => setRightPanel(p => p === 'layers' ? 'properties' : 'layers')}
          />

          <div className="flex-1" />

          {/* Slide navigation */}
          <ToolButton icon={<ChevronLeft className="w-4 h-4" />} label="Prev slide" onClick={goToPrevSlide} disabled={activeSlideIndex === 0} />
          <span className="text-xs text-neutral-400 mx-1 tabular-nums">
            {activeSlideIndex + 1} / {slides.length}
          </span>
          <ToolButton icon={<ChevronRight className="w-4 h-4" />} label="Next slide" onClick={goToNextSlide} disabled={activeSlideIndex >= slides.length - 1} />

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Zoom */}
          <ToolButton icon={<ZoomOut className="w-4 h-4" />} label="Zoom out" onClick={handleZoomOut} />
          <span className="text-xs text-neutral-400 mx-1 tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton icon={<ZoomIn className="w-4 h-4" />} label="Zoom in" onClick={handleZoomIn} />
          <ToolButton icon={<Maximize2 className="w-4 h-4" />} label="Fit to view" onClick={handleFitView} />

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          {/* Save */}
          <ToolButton
            icon={<Save className="w-4 h-4" />}
            label="Save (Ctrl+S)"
            onClick={handleManualSave}
          />
          {saving && (
            <span className="text-[10px] text-emerald-400 ml-1">Saving...</span>
          )}
        </div>

        {/* Canvas viewport */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0a] relative"
        >
          {/* Checkerboard pattern behind canvas */}
          <div className="relative" style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>
            <canvas ref={canvasElRef} />
          </div>

          {/* Tool mode cursor indicator */}
          {toolMode === 'text' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-800/90 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-300 pointer-events-none">
              Click on canvas to add text
            </div>
          )}
          {toolMode === 'shape' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-800/90 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-300 pointer-events-none">
              Click on canvas to add shape
            </div>
          )}
        </div>

        {/* Bottom bar: Save & Continue */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-2">
            {activeSlide && (
              <>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SLIDE_TYPE_CONFIG[activeSlide.slideType].badgeBg} ${SLIDE_TYPE_CONFIG[activeSlide.slideType].badgeText}`}>
                  {SLIDE_TYPE_CONFIG[activeSlide.slideType].label}
                </span>
                <span className="text-xs text-neutral-500">
                  {CANVAS_WIDTH} x {CANVAS_HEIGHT}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSave}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={handleSaveAndContinue}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : activeSlideIndex < slides.length - 1 ? 'Save & Next Slide' : 'Save & Finish'}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RIGHT PANEL — Properties / Filters / Layers */}
      {/* ================================================================ */}
      <div className="w-[280px] flex-shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden">
        {/* Panel tab bar */}
        <div className="flex border-b border-neutral-800/50">
          {(['properties', 'filters', 'layers'] as RightPanelMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setRightPanel(mode)}
              className={`
                flex-1 py-2 text-xs font-medium capitalize transition-colors
                ${rightPanel === mode
                  ? 'text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-neutral-500 hover:text-neutral-300'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Properties Panel */}
          {rightPanel === 'properties' && (
            <div className="p-3 space-y-4">
              {!selectedObjType && (
                <SlideInfoCard slide={activeSlide} totalSlides={slides.length} />
              )}

              {selectedObjType === 'text' && (
                <TextPropertiesPanel
                  font={textFont}
                  size={textSize}
                  weight={textWeight}
                  color={textColor}
                  align={textAlign}
                  lineHeight={textLineHeight}
                  letterSpacing={textLetterSpacing}
                  opacity={textOpacity}
                  strokeColor={textStrokeColor}
                  strokeWidth={textStrokeWidth}
                  onFontChange={(v) => { setTextFont(v); updateTextProp('fontFamily', v); }}
                  onSizeChange={(v) => { setTextSize(v); updateTextProp('fontSize', v); }}
                  onWeightChange={(v) => { setTextWeight(v); updateTextProp('fontWeight', v); }}
                  onColorChange={(v) => { setTextColor(v); updateTextProp('fill', v); }}
                  onAlignChange={(v) => { setTextAlign(v); updateTextProp('textAlign', v); }}
                  onLineHeightChange={(v) => { setTextLineHeight(v); updateTextProp('lineHeight', v); }}
                  onLetterSpacingChange={(v) => { setTextLetterSpacing(v); updateTextProp('charSpacing', v); }}
                  onOpacityChange={(v) => { setTextOpacity(v); updateTextProp('opacity', v); }}
                  onStrokeColorChange={(v) => { setTextStrokeColor(v); updateTextProp('stroke', v); }}
                  onStrokeWidthChange={(v) => { setTextStrokeWidth(v); updateTextProp('strokeWidth', v); }}
                />
              )}

              {selectedObjType === 'shape' && (
                <ShapePropertiesPanel
                  fill={shapeFill}
                  stroke={shapeStroke}
                  strokeWidth={shapeStrokeWidth}
                  opacity={shapeOpacity}
                  cornerRadius={shapeCornerRadius}
                  onFillChange={(v) => { setShapeFill(v); updateShapeProp('fill', v); }}
                  onStrokeChange={(v) => { setShapeStroke(v); updateShapeProp('stroke', v); }}
                  onStrokeWidthChange={(v) => { setShapeStrokeWidth(v); updateShapeProp('strokeWidth', v); }}
                  onOpacityChange={(v) => { setShapeOpacity(v); updateShapeProp('opacity', v); }}
                  onCornerRadiusChange={(v) => { setShapeCornerRadius(v); updateShapeProp('rx', v); }}
                />
              )}

              {selectedObjType === 'image' && (
                <ImagePropertiesPanel
                  opacity={imageOpacity}
                  onOpacityChange={(v) => { setImageOpacity(v); updateImageProp('opacity', v); }}
                />
              )}
            </div>
          )}

          {/* Filters Panel */}
          {rightPanel === 'filters' && (
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300">Filter Presets</span>
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Reset All
                </button>
              </div>

              {/* Preset grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={`
                      px-2 py-1.5 rounded-md text-[10px] font-medium transition-all
                      ${activePreset === preset.label
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700 hover:text-neutral-200'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Manual sliders */}
              <div className="pt-2 border-t border-neutral-800/50 space-y-3">
                <span className="text-xs font-medium text-neutral-300">Manual Adjustments</span>
                {FILTER_SLIDERS.map((slider) => (
                  <div key={slider.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-neutral-400">{slider.label}</span>
                      <span className="text-[10px] text-neutral-500 tabular-nums w-10 text-right">
                        {typeof filterValues[slider.key] === 'number'
                          ? (Number.isInteger(filterValues[slider.key])
                              ? filterValues[slider.key]
                              : filterValues[slider.key].toFixed(2))
                          : slider.defaultValue}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={filterValues[slider.key] ?? slider.defaultValue}
                      onChange={(e) => handleFilterSliderChange(slider.key, parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layers Panel */}
          {rightPanel === 'layers' && (
            <div className="p-3 space-y-1">
              <span className="text-xs font-medium text-neutral-300 mb-2 block">Layers ({layerList.length})</span>
              {layerList.length === 0 && (
                <p className="text-xs text-neutral-600 py-4 text-center">No layers</p>
              )}
              {layerList.map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => selectLayer(layer.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-800 cursor-pointer group transition-colors"
                >
                  <GripVertical className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-neutral-300 truncate block">{layer.name}</span>
                    <span className="text-[9px] text-neutral-600 capitalize">{layer.type}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                    className="p-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                    title={layer.visible ? 'Hide' : 'Show'}
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                    className="p-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                    title={layer.locked ? 'Unlock' : 'Lock'}
                  >
                    {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

// --- ToolButton ---
interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  extra?: React.ReactNode;
}

function ToolButton({ icon, label, active, disabled, onClick, extra }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        flex items-center gap-0.5 p-1.5 rounded-md text-xs transition-colors
        ${active
          ? 'bg-emerald-500/10 text-emerald-400'
          : disabled
            ? 'text-neutral-600 cursor-not-allowed'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
        }
      `}
    >
      {icon}
      {extra}
    </button>
  );
}

// --- SlideInfoCard ---
function SlideInfoCard({ slide, totalSlides }: { slide: CarouselSlide | null; totalSlides: number }) {
  if (!slide) return null;
  const config = SLIDE_TYPE_CONFIG[slide.slideType];
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-neutral-300">Slide Info</span>
      <div className="bg-neutral-800/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Slide</span>
          <span className="text-xs text-neutral-300">{slide.slideIndex + 1} of {totalSlides}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Type</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.badgeBg} ${config.badgeText}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Dimensions</span>
          <span className="text-xs text-neutral-300">{CANVAS_WIDTH} x {CANVAS_HEIGHT}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Method</span>
          <span className="text-xs text-neutral-300 capitalize">{slide.generationMethod}</span>
        </div>
      </div>
      <div>
        <span className="text-xs text-neutral-500 block mb-1.5">Tip</span>
        <p className="text-[10px] text-neutral-600 leading-relaxed">
          Select any element on the canvas to edit its properties. Branding elements (logo, handle, pagination, SWIPE CTA) are auto-applied and fully editable.
        </p>
      </div>
    </div>
  );
}

// --- TextPropertiesPanel ---
interface TextPropertiesPanelProps {
  font: string;
  size: number;
  weight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  onFontChange: (v: string) => void;
  onSizeChange: (v: number) => void;
  onWeightChange: (v: number) => void;
  onColorChange: (v: string) => void;
  onAlignChange: (v: 'left' | 'center' | 'right') => void;
  onLineHeightChange: (v: number) => void;
  onLetterSpacingChange: (v: number) => void;
  onOpacityChange: (v: number) => void;
  onStrokeColorChange: (v: string) => void;
  onStrokeWidthChange: (v: number) => void;
}

function TextPropertiesPanel(props: TextPropertiesPanelProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-neutral-300">Text Properties</span>

      {/* Font Family */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Font Family</label>
        <select
          value={props.font}
          onChange={(e) => props.onFontChange(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-emerald-500"
        >
          {CURATED_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Size + Weight row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-neutral-500 block mb-1">Size</label>
          <input
            type="number"
            value={props.size}
            onChange={(e) => props.onSizeChange(parseInt(e.target.value) || 12)}
            min={8}
            max={200}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 block mb-1">Weight</label>
          <select
            value={props.weight}
            onChange={(e) => props.onWeightChange(parseInt(e.target.value))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-emerald-500"
          >
            {FONT_WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.color}
            onChange={(e) => props.onColorChange(e.target.value)}
            className="w-8 h-8 bg-transparent border border-neutral-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={props.color}
            onChange={(e) => props.onColorChange(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Alignment</label>
        <div className="flex gap-1">
          {TEXT_ALIGNMENTS.map((a) => (
            <button
              key={a}
              onClick={() => props.onAlignChange(a)}
              className={`
                flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                ${props.align === a
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                }
              `}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Line Height</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{props.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.8}
          max={3}
          step={0.1}
          value={props.lineHeight}
          onChange={(e) => props.onLineHeightChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Letter Spacing */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Letter Spacing</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{props.letterSpacing}</span>
        </div>
        <input
          type="range"
          min={-200}
          max={1000}
          step={10}
          value={props.letterSpacing}
          onChange={(e) => props.onLetterSpacingChange(parseInt(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Opacity</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{Math.round(props.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={props.opacity}
          onChange={(e) => props.onOpacityChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Stroke */}
      <div className="pt-2 border-t border-neutral-800/50">
        <label className="text-[10px] text-neutral-500 block mb-1">Stroke</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={props.strokeColor}
              onChange={(e) => props.onStrokeColorChange(e.target.value)}
              className="w-6 h-6 bg-transparent border border-neutral-700 rounded cursor-pointer"
            />
            <input
              type="text"
              value={props.strokeColor}
              onChange={(e) => props.onStrokeColorChange(e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-1 text-[10px] text-neutral-200 font-mono outline-none focus:border-emerald-500 min-w-0"
            />
          </div>
          <div>
            <input
              type="number"
              value={props.strokeWidth}
              onChange={(e) => props.onStrokeWidthChange(parseInt(e.target.value) || 0)}
              min={0}
              max={20}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500"
              placeholder="Width"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ShapePropertiesPanel ---
interface ShapePropertiesPanelProps {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  onFillChange: (v: string) => void;
  onStrokeChange: (v: string) => void;
  onStrokeWidthChange: (v: number) => void;
  onOpacityChange: (v: number) => void;
  onCornerRadiusChange: (v: number) => void;
}

function ShapePropertiesPanel(props: ShapePropertiesPanelProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-neutral-300">Shape Properties</span>

      {/* Fill */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.fill}
            onChange={(e) => props.onFillChange(e.target.value)}
            className="w-8 h-8 bg-transparent border border-neutral-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={props.fill}
            onChange={(e) => props.onFillChange(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Stroke */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Stroke Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.stroke}
            onChange={(e) => props.onStrokeChange(e.target.value)}
            className="w-8 h-8 bg-transparent border border-neutral-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={props.stroke}
            onChange={(e) => props.onStrokeChange(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Stroke Width</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{props.strokeWidth}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={props.strokeWidth}
          onChange={(e) => props.onStrokeWidthChange(parseInt(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Corner Radius */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Corner Radius</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{props.cornerRadius}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={props.cornerRadius}
          onChange={(e) => props.onCornerRadiusChange(parseInt(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Opacity</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{Math.round(props.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={props.opacity}
          onChange={(e) => props.onOpacityChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </div>
  );
}

// --- ImagePropertiesPanel ---
interface ImagePropertiesPanelProps {
  opacity: number;
  onOpacityChange: (v: number) => void;
}

function ImagePropertiesPanel(props: ImagePropertiesPanelProps) {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-neutral-300">Image Properties</span>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-500">Opacity</label>
          <span className="text-[10px] text-neutral-500 tabular-nums">{Math.round(props.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={props.opacity}
          onChange={(e) => props.onOpacityChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      <p className="text-[10px] text-neutral-600">
        Select the background image to adjust its opacity. Use the Filters tab for color adjustments.
      </p>
    </div>
  );
}
