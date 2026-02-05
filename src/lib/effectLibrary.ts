// ============================================================================
// Sparkfluence Studio — Effect Library
// Defines visual effect presets and emotion→effect mapping.
// Effects render as CSS-based overlays in the Remotion composition.
// Phase 4 will add Lottie-based particle effects.
// ============================================================================

import { EffectDefinition, EffectPresetType } from '../types/studio';

// --- Effect Definitions ---

export const EFFECTS: EffectDefinition[] = [
  {
    id: 'alert-pulse',
    label: 'Alert Pulse',
    description: 'Red vignette pulse effect — draws attention',
    thumbnail: '/assets/effects/alert-pulse-thumb.png',
    defaultDurationFrames: 30, // 1 second
    emotions: ['shock', 'anger', 'danger'],
    keywords: ['bahaya', 'danger', 'warning', 'hati-hati', 'alert', 'penting', 'breaking'],
  },
  {
    id: 'camera-shake',
    label: 'Camera Shake',
    description: 'Trembling screen effect — shock or impact',
    thumbnail: '/assets/effects/camera-shake-thumb.png',
    defaultDurationFrames: 15, // 0.5 seconds
    emotions: ['shock', 'anger'],
    keywords: ['gempa', 'earthquake', 'impact', 'boom', 'crash', 'kaget'],
  },
  {
    id: 'confetti',
    label: 'Confetti',
    description: 'Celebratory confetti burst from top',
    thumbnail: '/assets/effects/confetti-thumb.png',
    defaultDurationFrames: 60, // 2 seconds
    emotions: ['excitement', 'celebration', 'joy'],
    keywords: ['selamat', 'congratulations', 'menang', 'win', 'juara', 'champion', 'party'],
  },
  {
    id: 'sparkles',
    label: 'Sparkles',
    description: 'Glittering sparkle particles across screen',
    thumbnail: '/assets/effects/sparkles-thumb.png',
    defaultDurationFrames: 45,
    emotions: ['excitement', 'wonder', 'magic'],
    keywords: ['wow', 'amazing', 'keren', 'magic', 'ajaib', 'cantik', 'beautiful', 'glow'],
  },
  {
    id: 'money-flying',
    label: 'Money Flying',
    description: 'Dollar bills / coins raining down',
    thumbnail: '/assets/effects/money-flying-thumb.png',
    defaultDurationFrames: 60,
    emotions: ['excitement', 'greed'],
    keywords: ['uang', 'money', 'cuan', 'dollar', 'kaya', 'rich', 'jackpot', 'gaji', 'bonus'],
  },
  {
    id: 'fire',
    label: 'Fire',
    description: 'Flames rising from bottom of screen',
    thumbnail: '/assets/effects/fire-thumb.png',
    defaultDurationFrames: 60,
    emotions: ['anger', 'intensity'],
    keywords: ['fire', 'hot', 'panas', 'api', 'viral', 'trending', 'lit', 'gokil'],
  },
  {
    id: 'rain',
    label: 'Rain',
    description: 'Gentle rain drops falling',
    thumbnail: '/assets/effects/rain-thumb.png',
    defaultDurationFrames: 90,
    emotions: ['sadness', 'melancholy', 'calm'],
    keywords: ['sedih', 'sad', 'hujan', 'rain', 'galau', 'mellow', 'nangis', 'cry'],
  },
  {
    id: 'snow',
    label: 'Snow',
    description: 'Soft snowflakes drifting down',
    thumbnail: '/assets/effects/snow-thumb.png',
    defaultDurationFrames: 90,
    emotions: ['calm', 'wonder'],
    keywords: ['snow', 'salju', 'winter', 'cold', 'dingin', 'christmas', 'natal'],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    description: 'Floating heart particles',
    thumbnail: '/assets/effects/hearts-thumb.png',
    defaultDurationFrames: 60,
    emotions: ['love', 'romance'],
    keywords: ['love', 'cinta', 'sayang', 'valentine', 'romantic', 'pacar', 'couple', 'nikah'],
  },
];

// --- Get All ---
export function getAllEffects(): EffectDefinition[] {
  return EFFECTS;
}

// --- Get by ID ---
export function getEffectById(id: EffectPresetType): EffectDefinition | undefined {
  return EFFECTS.find(e => e.id === id);
}

// --- Suggest Effects from Emotion ---
export function suggestEffectsForEmotion(emotion: string): EffectDefinition[] {
  const lower = emotion.toLowerCase();
  return EFFECTS.filter(e => e.emotions.some(em => lower.includes(em)));
}

// --- Suggest Effects from Keywords ---
export function suggestEffectsForText(text: string): EffectDefinition[] {
  const lower = text.toLowerCase();
  const matchedIds = new Set<string>();

  for (const effect of EFFECTS) {
    if (effect.keywords.some(kw => lower.includes(kw))) {
      matchedIds.add(effect.id);
    }
  }

  return EFFECTS.filter(e => matchedIds.has(e.id));
}

// --- Combined Suggestion (emotion + keywords) ---
export function suggestEffects(emotion: string, text: string): EffectDefinition[] {
  const fromEmotion = suggestEffectsForEmotion(emotion);
  const fromText = suggestEffectsForText(text);

  // Merge and deduplicate, emotion matches first
  const seen = new Set<string>();
  const result: EffectDefinition[] = [];

  for (const e of [...fromEmotion, ...fromText]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      result.push(e);
    }
  }

  return result;
}

// --- CSS for Effect Preview (used by Remotion composition) ---
// Returns inline CSS properties for a given effect preset.
// Full particle rendering is Phase 4; these are simplified CSS versions.

export function getEffectCSS(
  preset: EffectPresetType,
  progress: number, // 0-1 (animation progress within the effect duration)
): React.CSSProperties {
  switch (preset) {
    case 'alert-pulse': {
      const opacity = Math.sin(progress * Math.PI * 4) * 0.3 + 0.1;
      return {
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,${opacity}) 100%)`,
        pointerEvents: 'none',
      };
    }
    case 'camera-shake': {
      const x = Math.sin(progress * Math.PI * 8) * 4;
      const y = Math.cos(progress * Math.PI * 6) * 3;
      return {
        position: 'absolute',
        inset: 0,
        transform: `translate(${x}px, ${y}px)`,
        pointerEvents: 'none',
      };
    }
    case 'fire': {
      const opacity = 0.15 + progress * 0.1;
      return {
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(to top, rgba(255,100,0,${opacity}) 0%, transparent 50%)`,
        pointerEvents: 'none',
      };
    }
    case 'rain': {
      return {
        position: 'absolute',
        inset: 0,
        background: `rgba(100,150,255,${0.05 + Math.sin(progress * Math.PI * 2) * 0.03})`,
        pointerEvents: 'none',
      };
    }
    case 'money-flying':
    case 'confetti':
    case 'sparkles':
    case 'snow':
    case 'hearts':
      // These need canvas/particle rendering (Phase 4).
      // For now, show a subtle color tint as placeholder.
      return {
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
      };
    default:
      return { position: 'absolute', inset: 0, pointerEvents: 'none' };
  }
}
