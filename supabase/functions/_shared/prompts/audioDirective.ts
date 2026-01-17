/**
 * AUDIO & VOICE DIRECTIVE - Sora 2.0 Voice Consistency
 * 
 * Purpose: Ensure consistent voice characteristics across all video segments
 * when generating separately with Sora 2.0
 * 
 * Key Features:
 * 1. VOICE_ANCHOR - Same voice description for every segment
 * 2. FACE_ANCHOR - Reference image for creator face consistency
 * 3. Audio directives per segment type (CREATOR vs B-ROLL)
 * 4. EMOTION_SFX_MAP - Concrete sound design for each emotion (2026)
 * 5. Volume Priority - Audio layer hierarchy for professional mix (2026)
 * 
 * Best Practices (from Sora 2.0 research):
 * - Use precise acoustic vocabulary (crack, thud, whoosh) not abstract (loud noise)
 * - Specify volume relationships explicitly
 * - Emotion → Concrete SFX translation (not "tense" but "heartbeat 60BPM")
 * - Spatial cues for 3D audio (distant, close, off-screen)
 * 
 * Created: 2026-01-09
 * Updated: 2026-01-09 - Added EMOTION_SFX_MAP + Volume Priority
 */

// ============================================================================
// VOICE ANCHOR PROFILES
// ============================================================================

export interface VoiceProfile {
  gender: 'male' | 'female' | 'neutral';
  age_range: string;
  tone: string;
  tempo: string;
  style: string;
  language_specific: string;
}

const DEFAULT_VOICE_PROFILES: Record<string, VoiceProfile> = {
  indonesian_male: {
    gender: 'male',
    age_range: 'late 20s to early 40s',
    tone: 'warm friendly baritone, enthusiastic but calm',
    tempo: 'medium pace, 140-160 words per minute',
    style: 'casual conversational, Gen-Z energy, like explaining to a close friend',
    language_specific: 'natural Indonesian with English code-mixing, uses "gue/lo" pronouns',
  },
  indonesian_female: {
    gender: 'female',
    age_range: 'early 20s to mid 30s',
    tone: 'bright energetic alto, confident and approachable',
    tempo: 'medium-fast pace, 150-170 words per minute',
    style: 'casual conversational, Gen-Z energy, relatable and authentic',
    language_specific: 'natural Indonesian with English code-mixing, uses "gue/lo" pronouns',
  },
  hindi_male: {
    gender: 'male',
    age_range: 'mid 20s to late 30s',
    tone: 'warm engaging baritone, energetic and trustworthy',
    tempo: 'medium pace, 130-150 words per minute',
    style: 'casual Hinglish conversational, friendly yaar-style delivery',
    language_specific: 'natural Hindi with English mixing, uses "tum" pronouns, includes yaar/bhai',
  },
  hindi_female: {
    gender: 'female',
    age_range: 'early 20s to mid 30s',
    tone: 'bright confident alto, enthusiastic and relatable',
    tempo: 'medium pace, 140-160 words per minute',
    style: 'casual Hinglish conversational, modern urban delivery',
    language_specific: 'natural Hindi with English mixing, uses "tum" pronouns',
  },
  english_male: {
    gender: 'male',
    age_range: 'mid 20s to late 30s',
    tone: 'warm confident baritone, engaging and authentic',
    tempo: 'medium pace, 150-170 words per minute',
    style: 'casual conversational, modern creator energy, relatable',
    language_specific: 'neutral global English, no strong regional accent',
  },
  english_female: {
    gender: 'female',
    age_range: 'early 20s to mid 30s',
    tone: 'bright energetic alto, confident and approachable',
    tempo: 'medium-fast pace, 160-180 words per minute',
    style: 'casual conversational, modern creator energy, engaging',
    language_specific: 'neutral global English, no strong regional accent',
  },
};

// ============================================================================
// EMOTION → CONCRETE SFX MAP (2026 - Sora 2.0 Best Practice)
// ============================================================================
// Research: Abstract emotion labels produce inconsistent results.
// Solution: Translate emotions into CONCRETE acoustic elements.
// Reference: Sora 2.0 Audio Generation Guide

export interface EmotionSFX {
  // Core sound design elements
  undertone: string;        // Low-frequency foundation
  accent_sfx: string;       // Punctuation sounds
  ambient_texture: string;  // Background atmosphere
  spatial_cue: string;      // 3D audio positioning
  // For creator shots
  voice_quality: string;    // How voice should sound
  breath_pattern: string;   // Breathing style
}

export const EMOTION_SFX_MAP: Record<string, EmotionSFX> = {
  // High-energy emotions
  excitement: {
    undertone: 'subtle upbeat pulse, bright energy hum',
    accent_sfx: 'soft whoosh on gesture, crisp snap on emphasis',
    ambient_texture: 'airy bright atmosphere, clean acoustic space',
    spatial_cue: 'close proximity, slightly elevated presence',
    voice_quality: 'energetic, upward inflection, bright resonance',
    breath_pattern: 'quick energized breaths between phrases',
  },
  curiosity: {
    undertone: 'gentle mysterious hum, soft anticipation tone',
    accent_sfx: 'subtle chime on reveal, soft ping on question',
    ambient_texture: 'intriguing atmospheric depth, slight suspense',
    spatial_cue: 'intimate close distance, leaning-in quality',
    voice_quality: 'interested rising tone, engaged warmth',
    breath_pattern: 'thoughtful pause breaths, anticipatory inhale',
  },
  shock: {
    undertone: 'sudden silence then low rumble, impact bass',
    accent_sfx: 'sharp audio hit, brief silence beat, gasp sound',
    ambient_texture: 'stark contrast shift, momentary vacuum',
    spatial_cue: 'sudden close proximity, in-your-face presence',
    voice_quality: 'sharp intake, widened vocal, surprised pitch jump',
    breath_pattern: 'sharp gasp, held breath, slow exhale',
  },
  
  // Authority emotions
  authority: {
    undertone: 'confident low-frequency foundation, powerful stillness',
    accent_sfx: 'subtle bass punctuation on key points, grounded thud',
    ambient_texture: 'clean professional space, controlled acoustics',
    spatial_cue: 'centered commanding presence, stable position',
    voice_quality: 'measured confident delivery, resonant chest voice',
    breath_pattern: 'controlled steady breaths, no rushed breathing',
  },
  determination: {
    undertone: 'steady building pulse, resolute bass foundation',
    accent_sfx: 'firm thud on emphasis, solid impact sounds',
    ambient_texture: 'focused intensity, stripped-back clarity',
    spatial_cue: 'direct frontal presence, unwavering position',
    voice_quality: 'set jaw delivery, powerful controlled projection',
    breath_pattern: 'deep grounded breaths, purposeful exhale',
  },
  
  // Tension emotions  
  tension: {
    undertone: 'heartbeat rhythm 55-65 BPM, low ominous drone building',
    accent_sfx: 'subtle creak, distant rumble, tight string tension',
    ambient_texture: 'oppressive atmosphere, closing-in sensation',
    spatial_cue: 'uncomfortably close, pressing presence',
    voice_quality: 'tight controlled delivery, slight strain audible',
    breath_pattern: 'shallow tense breaths, held breath moments',
  },
  urgency: {
    undertone: 'accelerating pulse 80-100 BPM, rising pressure tone',
    accent_sfx: 'rapid ticks, sharp alerts, whoosh movements',
    ambient_texture: 'high-stakes atmosphere, time-pressure ambience',
    spatial_cue: 'close urgent proximity, forward-leaning presence',
    voice_quality: 'fast-paced delivery, clipped consonants, intense',
    breath_pattern: 'quick sharp breaths, minimal pauses',
  },
  
  // Warm emotions
  warmth: {
    undertone: 'gentle warm hum, comforting low frequencies',
    accent_sfx: 'soft pleasant chimes, gentle rustle sounds',
    ambient_texture: 'cozy inviting atmosphere, embracing acoustics',
    spatial_cue: 'friendly close distance, welcoming presence',
    voice_quality: 'soft warm delivery, genuine smile audible',
    breath_pattern: 'relaxed natural breaths, comfortable pace',
  },
  hope: {
    undertone: 'gentle rising tone, brightening frequency shift',
    accent_sfx: 'soft shimmer, uplifting chime, light sparkle',
    ambient_texture: 'opening expansive atmosphere, light breaking through',
    spatial_cue: 'upward-lifting presence, ascending quality',
    voice_quality: 'optimistic rising inflection, growing warmth',
    breath_pattern: 'deep hopeful inhale, relieved exhale',
  },
  
  // Reflective emotions
  contemplation: {
    undertone: 'thoughtful ambient pad, meditative low drone',
    accent_sfx: 'subtle room tone shifts, soft environmental sounds',
    ambient_texture: 'spacious thinking room, reflective acoustics',
    spatial_cue: 'slightly distant, internal-thought quality',
    voice_quality: 'measured thoughtful delivery, processing pauses',
    breath_pattern: 'slow contemplative breaths, thinking pauses',
  },
  
  // Neutral fallback
  neutral: {
    undertone: 'clean subtle room tone, balanced frequencies',
    accent_sfx: 'minimal natural sounds only, diegetic elements',
    ambient_texture: 'professional clean atmosphere, neutral space',
    spatial_cue: 'balanced centered presence, natural distance',
    voice_quality: 'clear natural delivery, conversational tone',
    breath_pattern: 'natural relaxed breathing pattern',
  },
};

// ============================================================================
// VOLUME PRIORITY SYSTEM (2026 - Professional Audio Mix)
// ============================================================================
// Research: Default settings produce competing audio layers.
// Solution: Explicit volume relationships for clean mix.

export interface VolumePriority {
  layer: string;
  level: string;      // Relative dB or description
  description: string;
}

// SIMPLIFIED: Removed verbose dB levels - video models don't need mix engineering details
export const VOLUME_PRIORITY_CREATOR: VolumePriority[] = [
  { layer: 'Dialogue', level: 'primary', description: 'Close-mic, crystal clear' },
  { layer: 'Room Tone', level: 'subtle', description: 'Non-distracting ambient' },
];

export const VOLUME_PRIORITY_BROLL: VolumePriority[] = [
  { layer: 'Ambient', level: 'primary', description: 'Environmental sound' },
  { layer: 'SFX', level: 'supportive', description: 'Action-synced sounds' },
];

export const VOLUME_PRIORITY_BROLL_WITH_VOICEOVER: VolumePriority[] = [
  { layer: 'Voiceover', level: 'primary', description: 'Narrator voice' },
  { layer: 'Ambient', level: 'ducked', description: 'Under voice' },
];

// REMOVED: formatVolumePriority function - no longer needed

// ============================================================================
// VOICE ANCHOR GENERATOR
// ============================================================================

/**
 * Generate VOICE_ANCHOR block for Sora 2.0 prompt
 * This ensures consistent voice characteristics across all segments
 */
export function generateVoiceAnchor(
  language: string,
  gender: 'male' | 'female' = 'male',
  customProfile?: Partial<VoiceProfile>
): string {
  const profileKey = `${language}_${gender}`;
  const baseProfile = DEFAULT_VOICE_PROFILES[profileKey] || DEFAULT_VOICE_PROFILES.english_male;
  
  // Merge with custom profile if provided
  const profile: VoiceProfile = customProfile 
    ? { ...baseProfile, ...customProfile }
    : baseProfile;

  return `
═══════════════════════════════════════════════════════════════
🎙️ VOICE ANCHOR (CRITICAL - Maintain across ALL segments)
═══════════════════════════════════════════════════════════════
Voice characteristics: ${profile.gender}, ${profile.age_range}
Tone: ${profile.tone}
Tempo: ${profile.tempo}
Delivery style: ${profile.style}
Language notes: ${profile.language_specific}
Audio quality: Dry voice, minimal reverb, close-mic recording quality
Room tone: Subtle quiet room ambience, no echo

⚠️ CRITICAL: Maintain EXACT same voice characteristics as described above.
This voice must be consistent with all other segments in this video.
`;
}

// ============================================================================
// FACE ANCHOR (Creator Visual Consistency)
// ============================================================================

export interface FaceAnchorConfig {
  hasProfileImage: boolean;
  profileImageUrl?: string;
  characterDescription?: string;
  ethnicity?: string;
  gender?: string;
  age?: string;
  distinguishingFeatures?: string;
}

/**
 * Generate FACE_ANCHOR block for visual consistency
 * Used when creator face needs to appear in HOOK, CTA, or any CREATOR shot
 */
export function generateFaceAnchor(config: FaceAnchorConfig): string {
  if (config.hasProfileImage && config.profileImageUrl) {
    // User has uploaded profile image - use as reference
    return `
═══════════════════════════════════════════════════════════════
👤 FACE ANCHOR (Use Reference Image)
═══════════════════════════════════════════════════════════════
Reference image: PROVIDED (use as first-frame anchor)
Instruction: The character's face MUST match the reference image exactly.
Maintain: Same facial features, skin tone, hair, glasses (if any)
Consistency: This exact appearance must persist across ALL creator shots.

⚠️ CRITICAL: Use the provided reference image to anchor the character.
Do NOT alter facial features, age, or distinguishing characteristics.
`;
  }

  // No profile image - use character description
  const description = config.characterDescription || generateDefaultCharacterDescription(config);
  
  return `
═══════════════════════════════════════════════════════════════
👤 FACE ANCHOR (Character Description)
═══════════════════════════════════════════════════════════════
${description}

⚠️ CRITICAL: This EXACT character description must be used for ALL creator shots.
Maintain consistent: facial features, skin tone, expression style, wardrobe.
Do NOT change appearance between segments.
`;
}

/**
 * Generate default character description based on language/region
 */
function generateDefaultCharacterDescription(config: FaceAnchorConfig): string {
  const ethnicity = config.ethnicity || 'Southeast Asian';
  const gender = config.gender || 'male';
  const age = config.age || 'early 30s';
  
  const descriptions: Record<string, string> = {
    'Southeast Asian_male': `
A ${age} Southeast Asian Indonesian ${gender} with warm brown skin tone.
Round face shape with friendly, approachable expression.
Dark brown eyes, natural eyebrows, clean-shaven or light stubble.
Modern casual style: solid color t-shirt or casual blazer.
Confident but warm demeanor, genuine smile.`,
    
    'Southeast Asian_female': `
A ${age} Southeast Asian Indonesian ${gender} with warm brown skin tone.
Oval face shape with bright, energetic expression.
Dark brown eyes, natural makeup, styled hair.
Modern casual style: blouse or casual professional top.
Confident and approachable demeanor, genuine smile.`,
    
    'South Asian_male': `
A ${age} South Asian Indian ${gender} with medium brown skin tone.
Oval face shape with engaging, trustworthy expression.
Dark brown eyes, well-groomed appearance.
Modern casual style: collared shirt or smart casual.
Warm and relatable demeanor, friendly expression.`,
    
    'South Asian_female': `
A ${age} South Asian Indian ${gender} with medium brown skin tone.
Oval face shape with bright, confident expression.
Dark brown eyes, elegant natural makeup.
Modern professional style: kurta or contemporary top.
Confident and approachable demeanor.`,
    
    'default_male': `
A ${age} ${gender} content creator with diverse/mixed ethnicity.
Friendly, approachable expression with warm demeanor.
Clean, modern casual style: solid color top.
Confident but relatable presence.`,
    
    'default_female': `
A ${age} ${gender} content creator with diverse/mixed ethnicity.
Bright, engaging expression with confident demeanor.
Clean, modern casual style: professional casual top.
Approachable and authentic presence.`,
  };

  const key = `${ethnicity}_${gender}`;
  return descriptions[key] || descriptions[`default_${gender}`] || descriptions.default_male;
}

// ============================================================================
// SEGMENT-SPECIFIC AUDIO DIRECTIVES (Enhanced 2026)
// ============================================================================

/**
 * Get emotion SFX profile with fallback
 */
function getEmotionSFX(emotion: string): EmotionSFX {
  const emotionLower = emotion.toLowerCase();
  return EMOTION_SFX_MAP[emotionLower] || EMOTION_SFX_MAP.neutral;
}

/**
 * Audio directive for CREATOR shots (HOOK, CTA, LOOP-END)
 * Creator speaks to camera with lip-sync
 * 
 * Enhanced 2026: Now includes emotion-based SFX + volume priority
 */
// ============================================================================
// SPEECH RATE CONFIG PER LANGUAGE (Words Per Minute)
// Must match generate-videos/index.ts values for consistency
// ============================================================================
const SPEECH_RATES: Record<string, number> = {
  indonesian: 130, // WPM - slower, multi-syllabic
  hindi: 125,      // WPM - complex sentences
  english: 150,    // WPM - baseline
  spanish: 145,    // WPM - moderate
};

export interface VoiceCharacterInfo {
  gender: 'male' | 'female';
  age: string;
  accent: string;
  tone: string;
  pace: string;
}

export function getCreatorAudioDirective(
  language: string,
  dialogueText: string,
  segmentType: string,
  emotion: string = 'authority',
  voiceCharacter?: VoiceCharacterInfo // NEW: Voice character for consistency
): string {
  const emotionBySegment: Record<string, string> = {
    'HOOK': 'curiosity',
    'CTA': 'warmth',
    'LOOP-END': 'warmth',
  };

  const effectiveEmotion = emotionBySegment[segmentType] || emotion;
  const sfx = getEmotionSFX(effectiveEmotion);
  const wordCount = dialogueText.split(/\s+/).filter(w => w.length > 0).length;

  // Build voice description from character info
  let voiceDesc = sfx.voice_quality;
  if (voiceCharacter) {
    voiceDesc = `${voiceCharacter.gender} voice, ${voiceCharacter.age}, ${voiceCharacter.accent}. ${voiceCharacter.tone}, ${voiceCharacter.pace}`;
  }

  // SIMPLIFIED: Compact audio directive with voice consistency
  return `
AUDIO:
Dialogue: "${dialogueText}"
Word count: ${wordCount} words | Lip-sync required
Voice: ${voiceDesc}
Delivery: ${sfx.voice_quality}
Ambient: Subtle room tone, close-mic quality
Exclude: no music, no subtitles, no audience sounds

⚠️ VOICE CONSISTENCY: Use SAME voice characteristics across ALL segments.
`;
}

/**
 * Audio directive for B-ROLL shots (FORE, BODY, PEAK, TWIST)
 * Can have voiceover narration OR ambient-only
 * 
 * Enhanced 2026: Now includes emotion-based SFX + volume priority
 */
export interface BRollVoiceCharacter {
  gender: string;
  age: string;
  accent: string;
  tone: string;
  pace: string;
  description?: string;
}

export function getBRollAudioDirective(
  category: string,
  emotion: string = 'neutral',
  hasVoiceover: boolean = false,
  voiceoverText: string = '',
  voiceCharacter?: BRollVoiceCharacter
): string {
  const ambientByCategory: Record<string, string> = {
    'tech': 'soft server hum, subtle electronic beeps',
    'food': 'gentle sizzle, soft utensil clinks',
    'nature': 'light breeze, distant bird calls',
    'office': 'soft HVAC hum, distant typing',
    'urban': 'city ambient, distant traffic',
    'product': 'clean studio silence',
    'data': 'soft electronic hum, digital processing',
    'default': 'subtle room tone',
  };

  const ambient = ambientByCategory[category] || ambientByCategory.default;

  // ============================================================================
  // FIX (2026-01-17): B-ROLL with voiceover must be OFF-SCREEN NARRATION
  // ============================================================================
  // Problem: VEO 3.1 was generating people appearing and lip-syncing in B-ROLL
  // because the prompt wasn't clear that the voice is OFF-SCREEN narration.
  //
  // Solution:
  // 1. Explicitly state voice is OFF-SCREEN NARRATOR (not visible in video)
  // 2. Add strong exclusions for on-screen speakers/lip-sync
  // 3. Keep voice character for consistency but clarify it's invisible narrator
  // ============================================================================

  if (hasVoiceover && voiceoverText) {
    // Build voice description from character info for consistency
    let voiceDesc = 'Natural narrator voice';
    if (voiceCharacter) {
      voiceDesc = `${voiceCharacter.gender} voice, ${voiceCharacter.age}, ${voiceCharacter.accent}`;
    }

    return `
AUDIO:
OFF-SCREEN NARRATION (voice NOT visible in video): "${voiceoverText}"

NARRATOR VOICE (invisible, off-camera):
${voiceCharacter ? voiceCharacter.description || voiceDesc : voiceDesc}
${voiceCharacter ? `Accent: ${voiceCharacter.accent} | Tone: ${voiceCharacter.tone} | Pace: ${voiceCharacter.pace}` : ''}
Voice quality: Close-mic, dry recording, no reverb
Ambient: ${ambient} (ducked under voice)

⚠️ CRITICAL EXCLUSIONS:
- NO lip-sync or mouths moving
- NO on-screen speakers or talking
- NO one speaking to camera
- The narrator voice is COMPLETELY OFF-SCREEN (like documentary narration)
- If people appear, they must NOT be talking or lip-syncing
`;
  }

  return `
AUDIO:
Ambient: ${ambient}
Exclude: no music, no subtitles, no talking, no lip-sync
`;
}

// ============================================================================
// COMBINED ANCHOR GENERATOR
// ============================================================================

export interface AnchorConfig {
  language: string;
  gender: 'male' | 'female';
  segmentType: string;
  shotType: 'CREATOR' | 'B-ROLL';
  dialogueText?: string;
  hasProfileImage: boolean;
  profileImageUrl?: string;
  characterDescription?: string;
  brollCategory?: string;
  emotion?: string;
  hasVoiceover?: boolean;
  voiceoverText?: string;
  customVoiceProfile?: Partial<VoiceProfile>;
}

/**
 * Generate complete anchor block for a segment
 * Combines VOICE_ANCHOR + FACE_ANCHOR + AUDIO_DIRECTIVE
 */
export function generateSegmentAnchors(config: AnchorConfig): string {
  const blocks: string[] = [];

  // 1. VOICE_ANCHOR (always included for consistency reference)
  blocks.push(generateVoiceAnchor(config.language, config.gender, config.customVoiceProfile));

  // 2. FACE_ANCHOR (for CREATOR shots only)
  if (config.shotType === 'CREATOR') {
    blocks.push(generateFaceAnchor({
      hasProfileImage: config.hasProfileImage,
      profileImageUrl: config.profileImageUrl,
      characterDescription: config.characterDescription,
      gender: config.gender,
    }));
  }

  // 3. AUDIO_DIRECTIVE (specific to segment type) - Enhanced 2026
  if (config.shotType === 'CREATOR' && config.dialogueText) {
    blocks.push(getCreatorAudioDirective(
      config.language,
      config.dialogueText,
      config.segmentType,
      config.emotion || 'authority'
    ));
  } else {
    blocks.push(getBRollAudioDirective(
      config.brollCategory || 'default',
      config.emotion || 'neutral',
      config.hasVoiceover || false,
      config.voiceoverText || ''
    ));
  }

  return blocks.join('\n');
}

// ============================================================================
// HELPER: Detect B-Roll Category from Visual Direction
// ============================================================================

export function detectBRollCategory(visualDirection: string): string {
  const text = visualDirection.toLowerCase();
  
  const categories: Record<string, string[]> = {
    tech: ['code', 'screen', 'computer', 'laptop', 'software', 'ai', 'robot', 'digital', 'algorithm', 'data', 'server', 'coding'],
    food: ['food', 'cook', 'kitchen', 'dish', 'recipe', 'eat', 'restaurant', 'chef', 'masakan', 'makan'],
    nature: ['nature', 'outdoor', 'forest', 'mountain', 'beach', 'sky', 'tree', 'landscape', 'alam', 'garden'],
    office: ['office', 'desk', 'meeting', 'business', 'corporate', 'kantor', 'workspace', 'boardroom'],
    urban: ['city', 'street', 'building', 'traffic', 'downtown', 'mall', 'urban', 'night', 'neon'],
    product: ['product', 'unbox', 'package', 'brand', 'item', 'gadget', 'device', 'showcase'],
    data: ['chart', 'graph', 'statistics', 'analytics', 'dashboard', 'percentage', 'metric', 'visualization'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'default';
}

// ============================================================================
// HELPER: Get Emotion from Segment Type (Default Mapping)
// ============================================================================

export function getDefaultEmotionForSegment(segmentType: string): string {
  const mapping: Record<string, string> = {
    'HOOK': 'curiosity',
    'FORE': 'curiosity',
    'FORESHADOW': 'tension',
    'BODY': 'authority',
    'BODY-1': 'authority',
    'BODY-2': 'excitement',
    'BODY-3': 'determination',
    'PEAK': 'shock',
    'CTA': 'warmth',
    'ENDING': 'warmth',
    'ENDING_CTA': 'warmth',
    'LOOP-END': 'curiosity',
  };
  
  return mapping[segmentType.toUpperCase()] || 'neutral';
}

// ============================================================================
// EXPORT: Apply Anchors to All Segments
// ============================================================================

export interface SegmentWithAnchors {
  segment: any;
  anchors: string;
}

/**
 * Apply VOICE_ANCHOR and FACE_ANCHOR to all segments in a script
 * Returns segments with anchor blocks ready for Sora 2.0 generation
 */
export function applyAnchorsToSegments(
  segments: any[],
  language: string,
  gender: 'male' | 'female',
  hasProfileImage: boolean,
  profileImageUrl?: string,
  characterDescription?: string
): SegmentWithAnchors[] {
  return segments.map(segment => {
    const shotType = segment.shot_type?.toUpperCase() as 'CREATOR' | 'B-ROLL';
    const segmentType = segment.type?.toUpperCase() || '';
    
    // Detect B-roll category from visual direction
    const brollCategory = shotType === 'B-ROLL' 
      ? detectBRollCategory(segment.visual_direction || '')
      : undefined;

    // Get emotion - use segment emotion or derive from segment type
    const emotion = segment.emotion?.toLowerCase() || getDefaultEmotionForSegment(segmentType);

    // Check if B-roll has voiceover (script_text on B-ROLL = voiceover)
    const hasVoiceover = shotType === 'B-ROLL' && !!segment.script_text;

    const anchors = generateSegmentAnchors({
      language,
      gender,
      segmentType,
      shotType: shotType || 'B-ROLL',
      dialogueText: shotType === 'CREATOR' ? segment.script_text : undefined,
      hasProfileImage,
      profileImageUrl,
      characterDescription,
      brollCategory,
      emotion,
      hasVoiceover,
      voiceoverText: hasVoiceover ? segment.script_text : undefined,
    });

    return {
      segment,
      anchors,
    };
  });
}
