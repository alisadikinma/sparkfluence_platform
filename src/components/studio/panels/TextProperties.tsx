// ============================================================================
// Text Properties Panel — Full text editing: font, size, color, stroke,
// alignment, position, and animation controls for a text layer.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Move,
} from 'lucide-react';
import type { LayerItem, EnterAnimation, ExitAnimation, TextAlign } from '../../../types/studio';
import { STUDIO_FPS } from '../../../types/studio';
import { STUDIO_FONTS, useFontLoader, preloadFonts, type StudioFontFamily } from '../../../hooks/useFontLoader';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TextPropertiesProps {
  segmentId: string;
  layer: LayerItem;
  onUpdate: (changes: Partial<LayerItem>) => void;
  /** Apply current text style + position to all text layers across all segments */
  onApplyToAll?: (sourceLayerId: string, styleProps: Partial<NonNullable<LayerItem['text']>>, position?: { x: number; y: number }) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ENTER_ANIMATIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'pop-in', label: 'Pop In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'scale-up', label: 'Scale Up' },
];

const EXIT_ANIMATIONS: { value: ExitAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'slide-out', label: 'Slide Out' },
  { value: 'scale-down', label: 'Scale Down' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const TextProperties: React.FC<TextPropertiesProps> = ({
  segmentId,
  layer,
  onUpdate,
  onApplyToAll,
}) => {
  const text = layer.text;
  const animation = layer.animation;

  // Preload all studio fonts on first mount so dropdown previews render correctly
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (!preloadedRef.current) {
      preloadFonts(STUDIO_FONTS);
      preloadedRef.current = true;
    }
  }, []);

  // Load the currently selected font
  useFontLoader(text?.fontFamily ?? 'Inter');

  // Helpers
  const updateText = useCallback(
    (changes: Partial<NonNullable<LayerItem['text']>>) => {
      onUpdate({ text: { ...text!, ...changes } });
    },
    [text, onUpdate],
  );

  const updateAnimation = useCallback(
    (changes: Partial<NonNullable<LayerItem['animation']>>) => {
      const base = animation ?? {
        enter: 'none' as EnterAnimation,
        exit: 'none' as ExitAnimation,
        enterDurationFrames: 6,
        exitDurationFrames: 6,
      };
      onUpdate({ animation: { ...base, ...changes } });
    },
    [animation, onUpdate],
  );

  if (!text) return null;

  const enterAnim = animation?.enter ?? 'none';
  const exitAnim = animation?.exit ?? 'none';
  const animDurationSec =
    (animation?.enterDurationFrames ?? 6) / STUDIO_FPS;

  return (
    <div className="flex flex-col gap-0 text-neutral-200">
      {/* ---- Content ---- */}
      <Section label="Content">
        <textarea
          value={text.content}
          onChange={(e) => updateText({ content: e.target.value })}
          rows={3}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none resize-none transition-colors"
          placeholder="Enter text..."
        />
      </Section>

      {/* ---- Font Family ---- */}
      <Section label="Font Family">
        <FontDropdown
          value={text.fontFamily as StudioFontFamily}
          onChange={(f) => updateText({ fontFamily: f })}
        />
      </Section>

      {/* ---- Font Size ---- */}
      <Section label="Font Size">
        <SliderRow
          value={text.fontSize}
          min={12}
          max={200}
          step={1}
          display={`${text.fontSize}px`}
          onChange={(v) => updateText({ fontSize: v })}
        />
      </Section>

      {/* ---- Text Color ---- */}
      <Section label="Color">
        <ColorInput value={text.color} onChange={(c) => updateText({ color: c })} />
      </Section>

      {/* ---- Opacity ---- */}
      <Section label="Opacity">
        <SliderRow
          value={Math.round(layer.opacity * 100)}
          min={0}
          max={100}
          step={1}
          display={`${Math.round(layer.opacity * 100)}%`}
          onChange={(v) => onUpdate({ opacity: v / 100 })}
        />
      </Section>

      {/* ---- Stroke ---- */}
      <Section label="Stroke">
        <StrokeControl
          enabled={text.strokeWidth > 0}
          color={text.strokeColor}
          width={text.strokeWidth}
          onToggle={(on) =>
            updateText({
              strokeWidth: on ? 2 : 0,
              strokeColor: text.strokeColor || '#000000',
            })
          }
          onColorChange={(c) => updateText({ strokeColor: c })}
          onWidthChange={(w) => updateText({ strokeWidth: w })}
        />
      </Section>

      {/* ---- Text Align ---- */}
      <Section label="Align">
        <AlignToggle value={text.align} onChange={(a) => updateText({ align: a })} />
      </Section>

      {/* ---- Position ---- */}
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X"
            value={layer.position.x}
            onChange={(v) => onUpdate({ position: { ...layer.position, x: v } })}
          />
          <NumberField
            label="Y"
            value={layer.position.y}
            onChange={(v) => onUpdate({ position: { ...layer.position, y: v } })}
          />
        </div>
      </Section>

      {/* ---- Animations ---- */}
      <Section label="Enter Animation">
        <SelectField
          value={enterAnim}
          options={ENTER_ANIMATIONS}
          onChange={(v) => updateAnimation({ enter: v as EnterAnimation })}
        />
      </Section>

      <Section label="Exit Animation">
        <SelectField
          value={exitAnim}
          options={EXIT_ANIMATIONS}
          onChange={(v) => updateAnimation({ exit: v as ExitAnimation })}
        />
      </Section>

      <Section label="Animation Duration">
        <SliderRow
          value={Number(animDurationSec.toFixed(2))}
          min={0.1}
          max={1.0}
          step={0.05}
          display={`${animDurationSec.toFixed(2)}s`}
          onChange={(v) => {
            const frames = Math.round(v * STUDIO_FPS);
            updateAnimation({
              enterDurationFrames: frames,
              exitDurationFrames: frames,
            });
          }}
        />
      </Section>

      {/* Apply to All — copies style (font, size, color, stroke, align) to all text layers */}
      {onApplyToAll && (
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => {
              const { content, ...styleOnly } = text;
              onApplyToAll(layer.id, styleOnly, layer.position);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors border border-emerald-500/20"
          >
            Apply Style to All Text
          </button>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Sub-components
// ===========================================================================

/** Labeled section wrapper with divider */
const Section: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="px-3 py-2.5 border-b border-neutral-800">
    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Font Dropdown (with preview text in each font)
// ---------------------------------------------------------------------------
const FontDropdown: React.FC<{
  value: StudioFontFamily;
  onChange: (font: StudioFontFamily) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-200 hover:border-neutral-600 transition-colors"
      >
        <span style={{ fontFamily: value }}>{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {STUDIO_FONTS.map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => {
                onChange(font);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                font === value
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-neutral-300 hover:bg-neutral-700'
              }`}
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Slider Row (value + slider + display)
// ---------------------------------------------------------------------------
const SliderRow: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}> = ({ value, min, max, step, display, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-700"
          style={{
            background: `linear-gradient(to right, #10B981 0%, #10B981 ${pct}%, #404040 ${pct}%, #404040 100%)`,
          }}
        />
        <span className="ml-2 text-xs font-mono text-neutral-400 w-14 text-right">
          {display}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Color Input (swatch + hex)
// ---------------------------------------------------------------------------
const ColorInput: React.FC<{
  value: string;
  onChange: (color: string) => void;
}> = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-7 h-7 rounded border border-neutral-700 cursor-pointer bg-transparent p-0"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
      }}
      maxLength={7}
      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs font-mono text-neutral-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
    />
  </div>
);

// ---------------------------------------------------------------------------
// Stroke Control (toggle + color + width)
// ---------------------------------------------------------------------------
const StrokeControl: React.FC<{
  enabled: boolean;
  color: string;
  width: number;
  onToggle: (on: boolean) => void;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
}> = ({ enabled, color, width, onToggle, onColorChange, onWidthChange }) => (
  <div className="space-y-2">
    {/* Toggle */}
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`flex items-center gap-2 text-xs transition-colors ${
        enabled ? 'text-emerald-400' : 'text-neutral-500'
      }`}
    >
      <span
        className={`inline-block w-7 h-4 rounded-full relative transition-colors ${
          enabled ? 'bg-emerald-500' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      {enabled ? 'On' : 'Off'}
    </button>

    {enabled && (
      <>
        <ColorInput value={color} onChange={onColorChange} />
        <SliderRow
          value={width}
          min={0}
          max={5}
          step={0.5}
          display={`${width}px`}
          onChange={onWidthChange}
        />
      </>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Text Align Toggle Group
// ---------------------------------------------------------------------------
const AlignToggle: React.FC<{
  value: TextAlign;
  onChange: (align: TextAlign) => void;
}> = ({ value, onChange }) => {
  const options: { val: TextAlign; Icon: React.FC<{ className?: string }> }[] = [
    { val: 'left', Icon: AlignLeft },
    { val: 'center', Icon: AlignCenter },
    { val: 'right', Icon: AlignRight },
  ];

  return (
    <div className="flex gap-1">
      {options.map(({ val, Icon }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs transition-colors ${
            value === val
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:text-neutral-300'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Number Field
// ---------------------------------------------------------------------------
const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="text-[10px] text-neutral-500 block mb-0.5">{label}</label>
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
    />
  </div>
);

// ---------------------------------------------------------------------------
// Select Field
// ---------------------------------------------------------------------------
const SelectField: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors appearance-none cursor-pointer"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
