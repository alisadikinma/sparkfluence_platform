import React from 'react';
import { VD_CATEGORIES, type VDCategory, type Segment } from '../types';

/**
 * Parse free-text visual_direction into 6 structured categories:
 * Scene | Camera | Lighting | Color | Mood | FX
 */
export function parseVisualDirection(vdText: string): Segment['structuredVD'] {
  if (!vdText || vdText.trim().length === 0) return undefined;

  const text = vdText.trim();
  const result = { scene: '', camera: '', lighting: '', color: '', mood: '', fx: '' };

  // Strategy 1: Try to find labeled sections (e.g. "Scene: ..., Camera: ...")
  const labelPattern = /\b(scene|camera|lighting|color|mood|atmosphere|fx|effects?)\s*[:–—-]\s*/gi;
  const matches = [...text.matchAll(labelPattern)];

  if (matches.length >= 3) {
    for (let i = 0; i < matches.length; i++) {
      let key = matches[i][1].toLowerCase();
      // Normalize aliases
      if (key === 'atmosphere') key = 'mood';
      if (key === 'effects' || key === 'effect') key = 'fx';
      if (key in result) {
        const start = matches[i].index! + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
        (result as Record<string, string>)[key] = text.slice(start, end).replace(/[,;|]\s*$/, '').trim();
      }
    }
    return result;
  }

  // Strategy 2: Heuristic extraction from free-text
  const sentences = text.split(/[.;|]+/).map(s => s.trim()).filter(Boolean);

  const cameraKeywords = /\b(MCU|CU|MS|WS|EWS|OTS|POV|dolly|pan|tilt|zoom|track|crane|handheld|steadicam|push-in|pull-out|f\/\d|mm\b|lens|angle|shot|frame|composition|shallow|depth|aperture|close-up|medium|wide|low[- ]?angle|high[- ]?angle|bird|worm|orbit|whip)/i;
  const lightingKeywords = /\b(light|lighting|rim|key[- ]?light|fill[- ]?light|backlight|high[- ]?key|low[- ]?key|shadow|softbox|daylight|golden[- ]?hour|sunset|sunrise|Rembrandt|butterfly|\d{4}K|kelvin|exposure|silhouette|three[- ]?point|chiaroscuro|ratio)/i;
  const colorKeywords = /\b(color|colour|grade|teal|orange|palette|monochrome|desaturated|saturated|vibrant|muted|pastel|hue|LUT|cinematic[- ]?grade|warm[- ]?tone|cool[- ]?tone|high[- ]?contrast|cross[- ]?process)/i;
  const moodKeywords = /\b(mood|vibe|energy|feel|clean|minimal|gritty|dreamy|ethereal|intense|calm|chaotic|eerie|nostalgic|futuristic|retro|vintage|modern|elegant|raw|polished|cinematic|epic|intimate|playful|dynamic|serene|urgent|suspense|authoritative|scroll[- ]?stopping)/i;
  const fxKeywords = /\b(lens[- ]?flare|bokeh|particle|smoke|haze|fog|dust|glow|neon|spark|overlay|text|BOLD[- ]?TEXT|motion[- ]?graphic|vfx|sfx|blur|grain|glitch|anamorphic|streak|orb|prism|light[- ]?leak|chromatic)/i;

  const used = new Set<number>();

  // Extract FX first (most specific keywords)
  sentences.forEach((s, i) => {
    if (fxKeywords.test(s) && !result.fx) { result.fx = s; used.add(i); }
  });
  sentences.forEach((s, i) => {
    if (used.has(i)) return;
    if (cameraKeywords.test(s) && !result.camera) { result.camera = s; used.add(i); }
  });
  sentences.forEach((s, i) => {
    if (used.has(i)) return;
    if (lightingKeywords.test(s) && !result.lighting) { result.lighting = s; used.add(i); }
  });
  sentences.forEach((s, i) => {
    if (used.has(i)) return;
    if (colorKeywords.test(s) && !result.color) { result.color = s; used.add(i); }
  });
  sentences.forEach((s, i) => {
    if (used.has(i)) return;
    if (moodKeywords.test(s) && !result.mood) { result.mood = s; used.add(i); }
  });

  // Remaining → scene
  const sceneparts = sentences.filter((_, i) => !used.has(i));
  result.scene = sceneparts.join('. ').trim();

  // Fallback: if nothing parsed, put everything in scene
  if (!result.scene && !result.camera && !result.lighting && !result.color && !result.mood && !result.fx) {
    result.scene = text;
  }

  return result;
}

/**
 * Structured VD Chips — vertical per-line layout, 6 categories with colored dots
 */
export const StructuredVDChips: React.FC<{
  structuredVD: NonNullable<Segment['structuredVD']>;
}> = ({ structuredVD }) => {
  const rows: { label: VDCategory; value: string; labelColor: string; dotColor: string }[] = [
    { label: 'Scene', value: structuredVD.scene, labelColor: 'text-blue-400', dotColor: 'bg-blue-400' },
    { label: 'Camera', value: structuredVD.camera, labelColor: 'text-purple-400', dotColor: 'bg-purple-400' },
    { label: 'Lighting', value: structuredVD.lighting, labelColor: 'text-amber-400', dotColor: 'bg-amber-400' },
    { label: 'Color', value: structuredVD.color, labelColor: 'text-teal-400', dotColor: 'bg-teal-400' },
    { label: 'Mood', value: structuredVD.mood, labelColor: 'text-pink-400', dotColor: 'bg-pink-400' },
    { label: 'FX', value: structuredVD.fx, labelColor: 'text-orange-400', dotColor: 'bg-orange-400' },
  ].filter(r => r.value.length > 0);

  return (
    <div className="bg-surface border border-border-default rounded-lg p-2.5 space-y-1">
      {rows.map(row => (
        <div key={row.label} className="flex items-start gap-2 text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[72px] pt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${row.dotColor} flex-shrink-0`} />
            <span className={`font-medium ${row.labelColor}`}>{row.label}</span>
          </div>
          <span className="text-text-secondary">{row.value}</span>
        </div>
      ))}
    </div>
  );
};
