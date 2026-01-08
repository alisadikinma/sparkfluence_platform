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
 * 
 * Created: 2026-01-13
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
// SEGMENT-SPECIFIC AUDIO DIRECTIVES
// ============================================================================

/**
 * Audio directive for CREATOR shots (HOOK, CTA, LOOP-END)
 * Creator speaks to camera with lip-sync
 */
export function getCreatorAudioDirective(
  language: string,
  dialogueText: string,
  segmentType: string
): string {
  const emotionBySegment: Record<string, string> = {
    'HOOK': 'attention-grabbing, slightly intense, creates curiosity',
    'CTA': 'warm, inviting, encouraging action',
    'LOOP-END': 'casual, conversational, natural closing',
  };

  const emotion = emotionBySegment[segmentType] || 'engaging, conversational';
  const wordCount = dialogueText.split(/\s+/).length;
  
  // Calculate approximate speaking duration (150 WPM average)
  const speakingDuration = Math.ceil((wordCount / 150) * 60);

  return `
AUDIO DIRECTIVE (Creator Speaking):
Dialogue: "${dialogueText}"
Word count: ${wordCount} words (~${speakingDuration}s speaking time)
Emotion: ${emotion}
Lip sync: Character's lip movements MUST match the dialogue timing exactly
Audio perspective: Close-mic, dry voice, minimal room reverb
Background: Subtle room tone only, no music during speech

⚠️ Maintain voice anchor characteristics throughout this segment.
`;
}

/**
 * Audio directive for B-ROLL shots (FORE, BODY, PEAK, TWIST)
 * No dialogue, ambient sound only
 */
export function getBRollAudioDirective(
  category: string,
  mood: string = 'neutral'
): string {
  const ambientByCategory: Record<string, string> = {
    'tech': 'soft server hum, subtle electronic ambient, quiet data center atmosphere',
    'food': 'gentle kitchen ambience, soft sizzling, subtle utensil sounds',
    'nature': 'light wind, distant birds, natural outdoor atmosphere',
    'office': 'quiet office tone, soft HVAC hum, distant keyboard typing',
    'urban': 'city ambient, distant traffic, urban atmosphere',
    'product': 'clean studio silence with subtle room tone',
    'data': 'soft electronic hum, subtle digital beeps, tech atmosphere',
    'default': 'subtle room tone, clean ambient, minimal background noise',
  };

  const moodModifiers: Record<string, string> = {
    'tense': 'Add subtle low-frequency undertone for tension',
    'exciting': 'Slightly elevated ambient energy',
    'calm': 'Peaceful, relaxed ambient tone',
    'mysterious': 'Add subtle atmospheric depth',
    'neutral': '',
  };

  const ambient = ambientByCategory[category] || ambientByCategory.default;
  const moodNote = moodModifiers[mood] || '';

  return `
AUDIO DIRECTIVE (B-Roll - No Speech):
Ambient sound: ${ambient}
${moodNote ? `Mood: ${moodNote}` : ''}
Speech: NONE - no dialogue, no voiceover, no narration
Music: NO background music
Sound effects: Natural/diegetic only (sounds from visible objects)

⚠️ This is a visual segment. Audio should support visuals without distraction.
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
  mood?: string;
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

  // 3. AUDIO_DIRECTIVE (specific to segment type)
  if (config.shotType === 'CREATOR' && config.dialogueText) {
    blocks.push(getCreatorAudioDirective(
      config.language,
      config.dialogueText,
      config.segmentType
    ));
  } else {
    blocks.push(getBRollAudioDirective(
      config.brollCategory || 'default',
      config.mood || 'neutral'
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
    tech: ['code', 'screen', 'computer', 'laptop', 'software', 'ai', 'robot', 'digital', 'algorithm', 'data'],
    food: ['food', 'cook', 'kitchen', 'dish', 'recipe', 'eat', 'restaurant', 'chef', 'masakan'],
    nature: ['nature', 'outdoor', 'forest', 'mountain', 'beach', 'sky', 'tree', 'landscape', 'alam'],
    office: ['office', 'desk', 'meeting', 'business', 'corporate', 'kantor', 'workspace'],
    urban: ['city', 'street', 'building', 'traffic', 'downtown', 'mall', 'urban', 'night'],
    product: ['product', 'unbox', 'package', 'brand', 'item', 'gadget', 'device'],
    data: ['chart', 'graph', 'statistics', 'analytics', 'dashboard', 'percentage', 'metric'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'default';
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

    // Detect mood from emotion
    const mood = segment.emotion?.toLowerCase() || 'neutral';

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
      mood,
    });

    return {
      segment,
      anchors,
    };
  });
}
