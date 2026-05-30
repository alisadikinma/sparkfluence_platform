/**
 * VISUAL ENHANCER - P0 #3
 * Auto-adds cinematography specs to visual directions
 * 
 * Uses knowledge from 06-Cinematography-Lookup.md:
 * - Emotion → Expression → Lighting mapping
 * - Camera specs (lens, angle, movement)
 * - Color grading and atmosphere
 * 
 * Created: 2026-01-13
 */

// ============================================================================
// CINEMATOGRAPHY LOOKUP TABLES
// ============================================================================

// Emotion → Expression + Body Language + Lighting
const EMOTION_TO_CINEMATOGRAPHY: Record<string, {
  expression: string;
  body: string;
  lighting: string;
  camera: string;
  color: string;
  atmosphere: string;
}> = {
  'Curiosity': {
    expression: 'engaged bright eyes, raised brows, slight head tilt, open expression',
    body: 'subtle lean forward, attentive posture',
    lighting: 'Loop lighting 4:1 ratio, soft quality, 5600K neutral',
    camera: 'MCU (medium close-up), 50mm f/2.8, eye-level, slow dolly push-in',
    color: 'Vision3 500T film stock, warm natural grade',
    atmosphere: 'clean, subtle ambient haze',
  },
  'Shock': {
    expression: 'wide startled eyes, raised brows, slightly open mouth, frozen moment',
    body: 'rigid frozen posture, hands may be raised',
    lighting: 'Split lighting 8:1 ratio, harsh quality, high contrast',
    camera: 'CU (close-up), 85mm f/1.8, eye-level, static or quick zoom',
    color: 'Bleach bypass, desaturated with lifted blacks',
    atmosphere: 'dramatic, single hard light source',
  },
  'Intrigue': {
    expression: 'knowing smirk, one eyebrow raised, steady confident gaze',
    body: 'composed posture, slight lean, arms relaxed',
    lighting: 'Rembrandt lighting 4:1 ratio, triangle shadow on cheek, 3200K warm',
    camera: 'MCU, 85mm f/2, slight low angle (heroic), gentle track',
    color: 'Vision3 500T, teal-orange grade',
    atmosphere: 'light haze, depth, mysterious',
  },
  'Awe': {
    expression: 'bright wide eyes, genuine smile forming, relaxed amazed face',
    body: 'open shoulders, welcoming gesture, relaxed breathing',
    lighting: 'Butterfly lighting 2:1 ratio, soft glamorous, 3500K golden',
    camera: 'MCU, 50mm f/2.8, eye-level, gentle dolly in',
    color: 'Portra 400, warm golden hour grade',
    atmosphere: 'soft diffused light, warm glow',
  },
  'Tension': {
    expression: 'furrowed brow, intense fixed gaze, clenched jaw, focused',
    body: 'rigid shoulders, controlled breathing, minimal movement',
    lighting: 'Chiaroscuro 8:1+ ratio, dramatic shadows, 5600K cool',
    camera: 'CU, 35mm f/2.8, Dutch angle 15°, slow handheld',
    color: 'CineStill 800T, bleach bypass gritty',
    atmosphere: 'oppressive, deep shadows, tension',
  },
  'Resolution': {
    expression: 'relaxed confident smile, steady direct gaze, assured',
    body: 'squared shoulders, open palm gesture, stable stance',
    lighting: 'Loop lighting 2:1 ratio, balanced 3200-3500K warm',
    camera: 'MCU, 50mm f/2.8, eye-level, static or gentle pull back',
    color: 'Vision3 500T, natural balanced grade',
    atmosphere: 'clean, warm, resolved',
  },
  'Urgency': {
    expression: 'intense direct gaze, animated expression, forward energy',
    body: 'forward lean, animated hand gestures, quick energy',
    lighting: 'High-key 2:1 ratio, bright even, 5600K neutral',
    camera: 'MCU to CU, 50mm f/2.8, slight low angle, quick dolly in',
    color: 'High saturation, punchy contrast',
    atmosphere: 'bright, energetic, immediate',
  },
};

// B-Roll category specs
const BROLL_CINEMATOGRAPHY: Record<string, {
  camera: string;
  lighting: string;
  color: string;
  motion: string;
  atmosphere: string;
}> = {
  'tech': {
    camera: 'CU to MCU, 50-85mm macro, shallow DOF f/1.8-2.8',
    lighting: 'Cool 5600-6500K, rim light separation, screen glow practical',
    color: 'Teal-blue grade, high contrast, clean modern',
    motion: 'Slow orbit or tracking, smooth dolly, parallax shift',
    atmosphere: 'Clean minimal, subtle lens flare from screens',
  },
  'food': {
    camera: 'CU hero shot, 85-100mm macro, very shallow DOF',
    lighting: 'Warm 3200-3500K, soft diffused, window light style',
    color: 'Portra warm, enhanced saturation on reds/oranges',
    motion: 'Slow push in, gentle orbit, steam rising',
    atmosphere: 'Appetizing, steam particles, fresh ingredients',
  },
  'product': {
    camera: 'MCU to CU, 85mm, clean infinite background',
    lighting: 'Clean 2:1 ratio, rim light for separation, 5600K',
    color: 'High contrast, premium brand aesthetic',
    motion: 'Slow 360° orbit, gentle reveal, specular shifts',
    atmosphere: 'Premium, minimal, floating dust particles',
  },
  'nature': {
    camera: 'Wide to MCU, 24-50mm, deep DOF for landscapes',
    lighting: 'Golden hour 3200K or blue hour 6500K, natural',
    color: 'Enhanced greens/blues, cinematic grade',
    motion: 'Drone sweep, slow pan, parallax through foliage',
    atmosphere: 'Atmospheric haze, dust in sunbeams, epic scale',
  },
  'urban': {
    camera: 'Wide establishing to MCU detail, 35-50mm',
    lighting: 'Mixed practical, neon colors, night or golden hour',
    color: 'Teal-orange blockbuster, high contrast',
    motion: 'Tracking through streets, time-lapse, reflections',
    atmosphere: 'Neon reflections on wet pavement, urban energy',
  },
  'office': {
    camera: 'MS to MCU, 35-50mm, moderate DOF',
    lighting: 'Soft 5600K neutral, practical overhead + window',
    color: 'Clean neutral grade, professional',
    motion: 'Gentle dolly through space, focus pull',
    atmosphere: 'Professional, clean, subtle activity',
  },
  'data': {
    camera: 'CU on screens/charts, 50mm, shallow DOF',
    lighting: 'Screen glow as key, dark room, tech blue accent',
    color: 'High contrast, blue-green tech aesthetic',
    motion: 'Push through data visualizations, number animations',
    atmosphere: 'Matrix/tech feel, glowing elements',
  },
  'default': {
    camera: 'MCU, 50mm f/2.8, rule of thirds composition',
    lighting: 'Soft natural 5600K, 3:1 ratio',
    color: 'Vision3 500T, natural grade',
    motion: 'Gentle movement, parallax depth',
    atmosphere: 'Clean, professional, cinematic',
  },
};

// ============================================================================
// DETECTION HELPERS
// ============================================================================

/**
 * Detect B-Roll category from text content
 */
function detectBRollCategory(visualDirection: string, scriptText: string): string {
  const combined = `${visualDirection} ${scriptText}`.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    tech: ['code', 'coding', 'screen', 'ai', 'robot', 'tech', 'software', 'app', 'digital', 'computer', 'laptop', 'phone', 'algorithm'],
    food: ['food', 'cook', 'dish', 'recipe', 'masak', 'makanan', 'eat', 'restaurant', 'chef', 'kitchen', 'delicious', 'taste'],
    product: ['product', 'unbox', 'review', 'brand', 'item', 'package', 'box', 'gadget', 'device'],
    nature: ['nature', 'outdoor', 'landscape', 'mountain', 'beach', 'forest', 'tree', 'sky', 'sunset', 'sunrise', 'alam'],
    urban: ['city', 'street', 'urban', 'building', 'traffic', 'night', 'neon', 'downtown', 'jakarta', 'mall'],
    office: ['office', 'work', 'meeting', 'desk', 'business', 'corporate', 'kantor', 'professional'],
    data: ['data', 'chart', 'graph', 'statistics', 'number', 'analytics', 'dashboard', 'metric', 'percentage'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return category;
    }
  }
  
  return 'default';
}

/**
 * Check if visual direction already has cinematography specs
 */
function hascinematographySpecs(text: string): boolean {
  const specKeywords = [
    /\d+mm/i,           // Lens focal length
    /f\/?\d/i,          // Aperture
    /\d+:\d+\s*ratio/i, // Lighting ratio
    /\d+K/i,            // Color temperature
    /(rembrandt|butterfly|loop|split)\s*light/i, // Lighting patterns
    /(dolly|track|pan|orbit|static)/i, // Camera movement
  ];
  
  return specKeywords.filter(re => re.test(text)).length >= 2;
}

// ============================================================================
// MAIN ENHANCEMENT FUNCTION
// ============================================================================

export interface EnhancedSegment {
  original_visual: string;
  enhanced_visual: string;
  specs_added: string[];
  category?: string;
}

/**
 * Enhance a single segment's visual direction with cinematography specs
 */
export function enhanceVisualDirection(
  segment: any,
  language: string = 'indonesian'
): EnhancedSegment {
  const original = segment.visual_direction || '';
  const isCreator = segment.shot_type?.toUpperCase() === 'CREATOR';
  const emotion = segment.emotion || 'Curiosity';
  const scriptText = segment.script_text || '';
  
  const specsAdded: string[] = [];
  
  // Skip if already has specs
  if (hascinematographySpecs(original)) {
    return {
      original_visual: original,
      enhanced_visual: original,
      specs_added: [],
    };
  }
  
  let enhanced = original;
  
  if (isCreator) {
    // ========================================
    // CREATOR SHOT ENHANCEMENT
    // ========================================
    const specs = EMOTION_TO_CINEMATOGRAPHY[emotion] || EMOTION_TO_CINEMATOGRAPHY.Curiosity;
    
    // Build enhancement blocks
    const blocks: string[] = [];
    
    // Expression (if not already detailed)
    if (!original.toLowerCase().includes('expression') && !original.toLowerCase().includes('eyes')) {
      blocks.push(`Expression: ${specs.expression}.`);
      specsAdded.push('expression');
    }
    
    // Camera specs
    if (!original.match(/\d+mm/i)) {
      blocks.push(`Camera: ${specs.camera}.`);
      specsAdded.push('camera');
    }
    
    // Lighting
    if (!original.toLowerCase().includes('light')) {
      blocks.push(`Lighting: ${specs.lighting}.`);
      specsAdded.push('lighting');
    }
    
    // Color grade
    if (!original.toLowerCase().includes('grade') && !original.toLowerCase().includes('film')) {
      blocks.push(`Color: ${specs.color}.`);
      specsAdded.push('color');
    }
    
    // Atmosphere
    if (!original.toLowerCase().includes('atmosphere') && !original.toLowerCase().includes('haze')) {
      blocks.push(`Atmosphere: ${specs.atmosphere}.`);
      specsAdded.push('atmosphere');
    }
    
    enhanced = `${original} ${blocks.join(' ')}`.trim();
    
  } else {
    // ========================================
    // B-ROLL SHOT ENHANCEMENT
    // ========================================
    const category = detectBRollCategory(original, scriptText);
    const specs = BROLL_CINEMATOGRAPHY[category] || BROLL_CINEMATOGRAPHY.default;
    
    const blocks: string[] = [];
    
    // Camera specs
    if (!original.match(/\d+mm/i)) {
      blocks.push(`Camera: ${specs.camera}.`);
      specsAdded.push('camera');
    }
    
    // Lighting
    if (!original.toLowerCase().includes('light')) {
      blocks.push(`Lighting: ${specs.lighting}.`);
      specsAdded.push('lighting');
    }
    
    // Color grade
    if (!original.toLowerCase().includes('grade') && !original.toLowerCase().includes('color')) {
      blocks.push(`Color: ${specs.color}.`);
      specsAdded.push('color');
    }
    
    // Motion
    if (!original.toLowerCase().includes('motion') && !original.toLowerCase().includes('movement')) {
      blocks.push(`Motion: ${specs.motion}.`);
      specsAdded.push('motion');
    }
    
    // Atmosphere
    if (!original.toLowerCase().includes('atmosphere')) {
      blocks.push(`Atmosphere: ${specs.atmosphere}.`);
      specsAdded.push('atmosphere');
    }
    
    enhanced = `${original} ${blocks.join(' ')}`.trim();
    
    return {
      original_visual: original,
      enhanced_visual: enhanced,
      specs_added: specsAdded,
      category,
    };
  }
  
  return {
    original_visual: original,
    enhanced_visual: enhanced,
    specs_added: specsAdded,
  };
}

/**
 * Enhance all segments in a script
 */
export function enhanceAllVisuals(
  segments: any[],
  language: string = 'indonesian'
): {
  segments: any[];
  total_enhanced: number;
  specs_summary: Record<string, number>;
} {
  let totalEnhanced = 0;
  const specsSummary: Record<string, number> = {};
  
  const enhancedSegments = segments.map(segment => {
    const result = enhanceVisualDirection(segment, language);
    
    if (result.specs_added.length > 0) {
      totalEnhanced++;
      result.specs_added.forEach(spec => {
        specsSummary[spec] = (specsSummary[spec] || 0) + 1;
      });
    }
    
    return {
      ...segment,
      visual_direction: result.enhanced_visual,
      _enhancement: {
        original_length: result.original_visual.length,
        enhanced_length: result.enhanced_visual.length,
        specs_added: result.specs_added,
        category: result.category,
      },
    };
  });
  
  return {
    segments: enhancedSegments,
    total_enhanced: totalEnhanced,
    specs_summary: specsSummary,
  };
}

// ============================================================================
// FFMPEG TRANSITION SPECS (P1 #5 Preview)
// ============================================================================

export interface TransitionSpec {
  type: string;
  duration: string;
  ffmpeg_filter: string;
}

const TRANSITION_MAP: Record<string, TransitionSpec> = {
  'Cut': { type: 'cut', duration: '0s', ffmpeg_filter: '' },
  'Jump-Cut': { type: 'cut', duration: '0s', ffmpeg_filter: '' },
  'Fade': { type: 'fade', duration: '0.5s', ffmpeg_filter: 'xfade=transition=fade:duration=0.5' },
  'Zoom-In': { type: 'zoomin', duration: '0.3s', ffmpeg_filter: 'xfade=transition=zoomin:duration=0.3' },
  'Zoom-Out': { type: 'fadeblack', duration: '0.4s', ffmpeg_filter: 'xfade=transition=fadeblack:duration=0.4' },
  'Flash-Cut': { type: 'fadewhite', duration: '0.2s', ffmpeg_filter: 'xfade=transition=fadewhite:duration=0.2' },
  'Whip-Pan': { type: 'slideleft', duration: '0.3s', ffmpeg_filter: 'xfade=transition=slideleft:duration=0.3' },
  'Dissolve': { type: 'dissolve', duration: '0.5s', ffmpeg_filter: 'xfade=transition=dissolve:duration=0.5' },
  'Wipe': { type: 'wipeleft', duration: '0.4s', ffmpeg_filter: 'xfade=transition=wipeleft:duration=0.4' },
};

/**
 * Get FFmpeg transition spec for a segment
 */
export function getTransitionSpec(transition: string): TransitionSpec {
  return TRANSITION_MAP[transition] || TRANSITION_MAP['Cut'];
}

/**
 * Add FFmpeg specs to all segments (for P1 #5)
 */
export function addFFmpegSpecs(segments: any[]): any[] {
  return segments.map((segment, index) => {
    const transition = segment.transition || 'Cut';
    const transitionSpec = getTransitionSpec(transition);
    
    return {
      ...segment,
      ffmpeg_transition: transitionSpec,
      subtitle_style: {
        font: 'Montserrat Bold',
        size: 18,
        position: 'center',
        animation: 'word-by-word',
        effect: 'shadow',
      },
    };
  });
}
