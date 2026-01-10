/**
 * SLANG LOOKUP - Language-Specific Slang Validation & Scoring
 * ============================================================
 * 
 * Direct O(1) lookup for slang validation across Indonesian, Hindi, English.
 * Replaces RAG queries for slang knowledge.
 * 
 * Sources: 08/09/10-*-slang-2026.md
 * Last Updated: 2026-01-10
 */

// ============================================================================
// SLANG TERM DATABASES (with virality scores)
// ============================================================================

export interface SlangTerm {
  term: string;
  score: number; // 1-10 virality score
  meaning: string;
  example: string;
}

export const INDONESIAN_SLANG: SlangTerm[] = [
  { term: 'stecu', score: 10, meaning: 'Pretending not to care around crush', example: 'Gue stecu pas ketemu dia' },
  { term: 'rizz', score: 10, meaning: 'Charisma/flirting ability', example: 'Rizz-nya ada aja' },
  { term: 'delulu', score: 10, meaning: 'Self-aware delusional', example: 'Gue delulu mikir dia bakal chat duluan 😭' },
  { term: 'slay', score: 10, meaning: 'Perfect execution', example: 'Lo slay banget pake blazer itu!' },
  { term: 'red flag', score: 9, meaning: 'Warning sign in relationships', example: 'Kalau dia gaslighting, itu red flag sih' },
  { term: 'cringe', score: 9, meaning: 'Embarrassing to witness', example: 'Cringe banget ngeliat video dia' },
  { term: 'healing', score: 9, meaning: 'Self-care retreat', example: 'Weekend ini gue ke Puncak buat healing' },
  { term: 'burnout', score: 9, meaning: 'Mental exhaustion', example: 'Deadline mulu, gue udah burnout nih' },
  { term: 'fomo', score: 9, meaning: 'Fear of missing out', example: 'Gue ke event itu karena FOMO doang' },
  { term: 'toxic', score: 9, meaning: 'Unhealthy environment', example: 'Kerjaannya toxic banget' },
  { term: 'flex', score: 8, meaning: 'Showing off', example: 'Flexing di IG story mulu' },
  { term: 'glow up', score: 8, meaning: 'Positive transformation', example: 'Glow up-nya insane' },
  { term: 'ghosting', score: 8, meaning: 'Disappearing without explanation', example: 'Dia ghosting gue habis date' },
  { term: 'spill', score: 8, meaning: 'Reveal gossip/secrets', example: 'Spill dong ceritanya!' },
  { term: 'vibes', score: 8, meaning: 'Atmosphere/energy', example: 'Vibes-nya cozy banget' },
  { term: 'bucin', score: 8, meaning: 'Overly devoted to partner', example: 'Gue bucin parah sama dia' },
  { term: 'no cap', score: 8, meaning: 'No lie', example: 'Best coffee ever, no cap' },
  { term: "it's giving", score: 8, meaning: 'Resembles/evokes', example: "It's giving main character energy" },
  { term: 'sus', score: 7, meaning: 'Suspicious', example: 'Ceritanya sus banget dah' },
  { term: 'brain rot', score: 7, meaning: 'Content consumption overload', example: 'TikTok brainrot activated' },
];

export const HINDI_SLANG: SlangTerm[] = [
  { term: 'bohot hard', score: 9, meaning: 'Extremely impressive', example: 'Yeh gaana bohot hard hai bhai!' },
  { term: 'jugaad', score: 9, meaning: 'Creative hack/solution', example: 'Kuch jugaad laga ke aa ja!' },
  { term: 'scene', score: 9, meaning: 'Plans/situation', example: 'Aaj raat ka kya scene hai?' },
  { term: 'jhakaas', score: 8, meaning: 'Fantastic/amazing', example: 'Teri jacket toh jhakaas hai!' },
  { term: 'mast', score: 8, meaning: 'Great/enjoyable', example: 'Kal ka party mast tha!' },
  { term: 'fadu', score: 8, meaning: 'Mind-blowing', example: 'Yeh movie toh fadu thi!' },
  { term: 'bindaas', score: 8, meaning: 'Carefree/confident', example: 'Woh bindaas ladka hai' },
  { term: 'chill maar', score: 8, meaning: 'Relax/take it easy', example: 'Exams hain, fir bhi chill maar!' },
  { term: 'bakwas', score: 8, meaning: 'Nonsense/rubbish', example: 'Ye movie bilkul bakwas hai!' },
  { term: 'ghanta', score: 8, meaning: '"Yeah right!" (disbelief)', example: 'Usne bola 10 cars hai. Ghanta!' },
  { term: 'kaand', score: 8, meaning: 'Mess/scandal', example: 'Pura kaand ho gaya kal!' },
  { term: 'kya baat hai', score: 8, meaning: 'Wow! Impressive!', example: 'First prize jeeta? Kya baat hai!' },
  { term: 'solid', score: 7, meaning: 'Strong/impressive', example: 'Performance solid tha' },
  { term: 'kadak', score: 7, meaning: 'Crisp/excellent', example: 'Chai kadak hai' },
  { term: 'pataka', score: 7, meaning: 'Firecracker/fierce', example: 'Woh ladki pataka hai' },
  { term: 'scene tight hai', score: 7, meaning: 'Situation under control', example: 'Fikar mat kar, scene tight hai' },
  { term: 'fattu', score: 7, meaning: 'Coward/wimp', example: 'Woh fattu hai, nahi aayega' },
  { term: 'faaltu', score: 7, meaning: 'Useless/silly', example: 'Faaltu time waste mat kar' },
  { term: 'waat lag gayi', score: 7, meaning: "We're screwed", example: 'Arre yaar, waat lag gayi' },
  { term: 'gyaan dena', score: 7, meaning: 'Giving unsolicited advice', example: 'Bas gyaan dena band kar' },
];

export const ENGLISH_SLANG: SlangTerm[] = [
  { term: 'slay', score: 10, meaning: 'Doing exceptionally well', example: 'She absolutely slayed that presentation' },
  { term: 'rizz', score: 10, meaning: 'Charisma (especially flirting)', example: "He's got major rizz" },
  { term: 'fire', score: 9, meaning: 'Amazing/excellent', example: 'This beat is absolutely fire' },
  { term: 'ate', score: 9, meaning: 'Executed flawlessly', example: 'She ate at Fashion Week' },
  { term: 'w', score: 9, meaning: 'Win', example: 'That outfit? Massive W' },
  { term: 'l', score: 9, meaning: 'Loss', example: "That's an L for sure" },
  { term: 'lock in', score: 9, meaning: 'Deep focus/dedication', example: 'Finals next week—time to lock in 📚' },
  { term: 'delulu', score: 9, meaning: 'Playfully delusional', example: "I'm delulu if I think he noticed me 👀" },
  { term: 'hits different', score: 8, meaning: 'Stronger emotional impact', example: 'Coffee at 3am hits different' },
  { term: 'cooked', score: 8, meaning: 'Totally defeated', example: "We're cooked if this fails" },
  { term: 'let them cook', score: 8, meaning: 'Let them continue', example: "Just let him cook, he's onto something" },
  { term: 'mid', score: 8, meaning: 'Mediocre/average', example: 'That movie was mid honestly' },
  { term: 'sus', score: 8, meaning: 'Suspicious', example: 'That sounds sus to me' },
  { term: 'bet', score: 8, meaning: '"Okay" / agreement', example: 'Meet at 8? Bet.' },
  { term: 'vibe check', score: 7, meaning: 'Assessing mood/energy', example: "Vibe check: how's everyone feeling?" },
  { term: 'npc', score: 7, meaning: 'Acting robotic/boring', example: "He's such an NPC" },
  { term: 'ick', score: 7, meaning: 'Sudden disgust', example: 'That gave me the ick' },
  { term: 'touch grass', score: 7, meaning: 'Go outside (too online)', example: 'Bro needs to touch grass' },
  { term: "it's giving", score: 6, meaning: 'Resembles/evokes', example: "It's giving main character energy" },
  { term: 'periodt', score: 6, meaning: 'End of discussion', example: "That's the truth, periodt" },
];

// ============================================================================
// OUTDATED TERMS (instant cringe - AVOID)
// ============================================================================

export const OUTDATED_SLANG: Record<string, string[]> = {
  indonesian: ['alay', 'lebay', 'woles', 'kids jaman now', 'lol', 'ciyus', 'miapah', 'kamseupay'],
  hindi: ['swag', 'fully tight', 'tension not', 'tapori style'],
  english: ['on fleek', 'yolo', 'yeet', 'lit', 'squad goals', 'bae', 'gucci', 'i cant even', 'snatched'],
};

// ============================================================================
// ESSENTIAL PARTICLES/FILLERS
// ============================================================================

export const PARTICLES: Record<string, string[]> = {
  indonesian: ['sih', 'tuh', 'gitu', 'dong', 'deh', 'nih', 'kan', 'banget', 'parah', 'bet', 'literally'],
  hindi: ['yaar', 'na', 'hai na', 'matlab', 'achcha', 'arre', 'toh', 'bas', 'bhai', 'bilkul'],
  english: ['like', 'literally', 'basically', 'honestly', 'actually', 'so', 'i mean'],
};

// ============================================================================
// PRONOUN RULES
// ============================================================================

export const PRONOUN_RULES: Record<string, { use: string[]; avoid: string[]; reason: string }> = {
  indonesian: {
    use: ['gue', 'lo', 'gw', 'lu'],
    avoid: ['saya', 'kamu', 'anda'],
    reason: 'Formal pronouns = instant corporate cringe for Gen-Z',
  },
  hindi: {
    use: ['tum', 'tu'],
    avoid: ['aap'],
    reason: 'Excessive aap sounds too formal for youth content',
  },
  english: {
    use: [],
    avoid: [],
    reason: 'English pronouns are neutral',
  },
};

// ============================================================================
// EMOJI MEANINGS (Gen-Z interpretation)
// ============================================================================

export const EMOJI_MEANINGS: Record<string, { meaning: string; notMeaning: string }> = {
  '😭': { meaning: 'Laughing hard', notMeaning: 'Crying' },
  '💀': { meaning: 'Dead from laughter', notMeaning: 'Death' },
  '👍': { meaning: 'Passive-aggressive', notMeaning: 'Approval' },
  '🙂': { meaning: 'Masking discomfort', notMeaning: 'Friendly' },
  '🤡': { meaning: 'Self-deprecating', notMeaning: 'Clown' },
  '✨': { meaning: 'Sarcasm/special', notMeaning: 'Sparkle' },
  '💅': { meaning: 'Unbothered sass', notMeaning: 'Nails' },
  '😂': { meaning: 'OUTDATED - seen as boomer', notMeaning: 'Use 💀 or 😭 instead' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export type Language = 'indonesian' | 'hindi' | 'english' | 'id' | 'hi' | 'en';

/**
 * Normalize language code
 */
function normalizeLanguage(lang: Language): 'indonesian' | 'hindi' | 'english' {
  const map: Record<string, 'indonesian' | 'hindi' | 'english'> = {
    id: 'indonesian',
    indonesian: 'indonesian',
    hi: 'hindi',
    hindi: 'hindi',
    en: 'english',
    english: 'english',
  };
  return map[lang.toLowerCase()] || 'english';
}

/**
 * Get slang database for language
 */
export function getSlangDatabase(lang: Language): SlangTerm[] {
  const normalized = normalizeLanguage(lang);
  const databases: Record<string, SlangTerm[]> = {
    indonesian: INDONESIAN_SLANG,
    hindi: HINDI_SLANG,
    english: ENGLISH_SLANG,
  };
  return databases[normalized] || ENGLISH_SLANG;
}

/**
 * Get high-virality slang terms (score >= minScore)
 */
export function getHighViralitySlang(lang: Language, minScore: number = 8): SlangTerm[] {
  return getSlangDatabase(lang).filter(s => s.score >= minScore);
}

/**
 * Check if term is current slang
 */
export function isCurrentSlang(term: string, lang: Language): boolean {
  const db = getSlangDatabase(lang);
  return db.some(s => s.term.toLowerCase() === term.toLowerCase());
}

/**
 * Check if term is outdated
 */
export function isOutdatedSlang(term: string, lang: Language): boolean {
  const normalized = normalizeLanguage(lang);
  const outdated = OUTDATED_SLANG[normalized] || [];
  return outdated.some(o => term.toLowerCase().includes(o.toLowerCase()));
}

/**
 * Get slang score for a term
 */
export function getSlangScore(term: string, lang: Language): number {
  const db = getSlangDatabase(lang);
  const found = db.find(s => s.term.toLowerCase() === term.toLowerCase());
  return found?.score || 0;
}

/**
 * Extract current slang from text
 */
export function extractCurrentSlang(text: string, lang: Language): string[] {
  const db = getSlangDatabase(lang);
  const textLower = text.toLowerCase();
  return db
    .filter(s => textLower.includes(s.term.toLowerCase()))
    .map(s => s.term);
}

/**
 * Extract outdated slang from text
 */
export function extractOutdatedSlang(text: string, lang: Language): string[] {
  const normalized = normalizeLanguage(lang);
  const outdated = OUTDATED_SLANG[normalized] || [];
  const textLower = text.toLowerCase();
  return outdated.filter(term => textLower.includes(term.toLowerCase()));
}

/**
 * Extract particles from text
 */
export function extractParticles(text: string, lang: Language): string[] {
  const normalized = normalizeLanguage(lang);
  const particles = PARTICLES[normalized] || [];
  const textLower = text.toLowerCase();
  return particles.filter(p => new RegExp(`\\b${p}\\b`, 'i').test(textLower));
}

/**
 * Check pronoun usage
 */
export function checkPronouns(text: string, lang: Language): {
  correctPronouns: string[];
  incorrectPronouns: string[];
  hasIssue: boolean;
} {
  const normalized = normalizeLanguage(lang);
  const rules = PRONOUN_RULES[normalized];
  if (!rules) return { correctPronouns: [], incorrectPronouns: [], hasIssue: false };
  
  const textLower = text.toLowerCase();
  const correctPronouns = rules.use.filter(p => new RegExp(`\\b${p}\\b`, 'i').test(textLower));
  const incorrectPronouns = rules.avoid.filter(p => new RegExp(`\\b${p}\\b`, 'i').test(textLower));
  
  return {
    correctPronouns,
    incorrectPronouns,
    hasIssue: incorrectPronouns.length > 0,
  };
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

export interface SlangValidationResult {
  score: number; // 0-100
  currentSlang: string[];
  outdatedSlang: string[];
  particles: string[];
  pronounCheck: {
    correct: string[];
    incorrect: string[];
    hasIssue: boolean;
  };
  warnings: string[];
  suggestions: string[];
}

/**
 * Comprehensive slang validation
 */
export function validateSlang(text: string, lang: Language): SlangValidationResult {
  const normalized = normalizeLanguage(lang);
  
  const currentSlang = extractCurrentSlang(text, lang);
  const outdatedSlang = extractOutdatedSlang(text, lang);
  const particles = extractParticles(text, lang);
  const pronounCheck = checkPronouns(text, lang);
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // 1. Current slang check (need ≥2)
  if (currentSlang.length < 2) {
    warnings.push(`Only ${currentSlang.length}/2 current slang terms`);
    suggestions.push('Add more 2026 trending slang from Top 20 list');
    score -= 20;
  } else {
    score += 10; // Bonus
  }
  
  // 2. Outdated slang check (should be 0)
  if (outdatedSlang.length > 0) {
    warnings.push(`Contains outdated terms: ${outdatedSlang.join(', ')}`);
    suggestions.push('Replace with current 2026 alternatives');
    score -= outdatedSlang.length * 25; // Heavy penalty
  }
  
  // 3. Pronoun check
  if (pronounCheck.hasIssue) {
    warnings.push(`Using formal pronouns: ${pronounCheck.incorrect.join(', ')}`);
    suggestions.push(`Use casual pronouns: ${PRONOUN_RULES[normalized]?.use.join('/') || 'casual forms'}`);
    score -= 15;
  }
  
  // 4. Particle check (language-specific)
  if (normalized === 'indonesian' && particles.length < 2) {
    warnings.push(`Only ${particles.length}/2 Indonesian particles`);
    suggestions.push('Add particles: sih, tuh, gitu, dong');
    score -= 10;
  }
  
  if (normalized === 'hindi' && particles.length < 2) {
    warnings.push(`Only ${particles.length}/2 Hindi fillers`);
    suggestions.push('Add fillers: yaar, na, matlab, arre');
    score -= 10;
  }
  
  // 5. Outdated emoji check
  if (/😂/.test(text)) {
    warnings.push('Using 😂 emoji (seen as outdated by Gen-Z)');
    suggestions.push('Use 💀 or 😭 instead for laughing');
    score -= 5;
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    currentSlang,
    outdatedSlang,
    particles,
    pronounCheck: {
      correct: pronounCheck.correctPronouns,
      incorrect: pronounCheck.incorrectPronouns,
      hasIssue: pronounCheck.hasIssue,
    },
    warnings,
    suggestions,
  };
}

/**
 * Quick score only (0-100)
 */
export function getQuickSlangScore(text: string, lang: Language): number {
  return validateSlang(text, lang).score;
}

// ============================================================================
// HOOK/CTA TEMPLATES
// ============================================================================

export const HOOK_TEMPLATES: Record<string, Array<{ type: string; template: string; example: string }>> = {
  indonesian: [
    { type: 'Statistical', template: '[X]% orang gak tau [fact]', example: '90% orang gak tau ini!' },
    { type: 'Warning', template: 'Jangan [action] sebelum nonton!', example: 'Jangan skip kalau lo [audience]' },
    { type: 'POV', template: 'POV: Kamu [situation]', example: 'POV: Lo baru tau [revelation]' },
    { type: 'Curiosity', template: 'Gue baru tau kenapa [X]...', example: 'Ternyata selama ini kita salah' },
    { type: 'Controversy', template: 'Unpopular opinion: [take]', example: 'Hot take: [bold statement]' },
  ],
  hindi: [
    { type: 'Statistical', template: '[X]% log ye galti karte hain', example: '10 mein se 9 log ye nahi jaante' },
    { type: 'Warning', template: 'Agar tum [action] karte ho, ruko!', example: 'Ye video last tak dekho warna...' },
    { type: 'POV', template: 'POV: [Relatable situation]', example: "POV: Mummy ne bola 'bus 5 minute'" },
    { type: 'Shocking', template: '[Claim]. Haan, sach mein.', example: 'Chai peena galat hai. Haan, sach mein.' },
    { type: 'Story', template: 'Ek baar [setup]... aur fir...', example: 'Ek baar maine try kiya...' },
  ],
  english: [
    { type: 'Curiosity Gap', template: 'Nobody talks about [topic]...', example: 'Why is no one talking about this?' },
    { type: 'POV', template: 'POV: You just discovered [X]', example: "POV: You're the only one who..." },
    { type: 'Pattern Interrupt', template: 'Stop scrolling if you [audience]', example: 'Wait—before you scroll...' },
    { type: 'Controversy', template: 'Unpopular opinion: [take]', example: 'This might be controversial but...' },
    { type: 'Transformation', template: 'How I went from [before] to [after]', example: 'I tried [thing] for [time]...' },
  ],
};

export const CTA_TEMPLATES: Record<string, Array<{ goal: string; pattern: string }>> = {
  indonesian: [
    { goal: 'Engagement', pattern: 'Tonton sampai habis biar gak salah paham!' },
    { goal: 'Save', pattern: 'Save dulu buat nanti!' },
    { goal: 'Comment', pattern: 'Setuju gak? Drop emoji di comment!' },
    { goal: 'Follow', pattern: 'Follow buat Part 2!' },
    { goal: 'Share', pattern: 'Share ke temen yang [characteristic]!' },
  ],
  hindi: [
    { goal: 'Comment', pattern: 'Comment mein batao [question]' },
    { goal: 'Agreement', pattern: 'Kaun agree karta hai? 🙋' },
    { goal: 'Share', pattern: 'Agar relatable laga toh share karo' },
    { goal: 'Like', pattern: 'Like karo agar tumhare saath bhi hua' },
    { goal: 'Follow', pattern: 'Aur aise content ke liye follow karo' },
  ],
  english: [
    { goal: 'Comment', pattern: 'Drop a 👀 if this happened to you' },
    { goal: 'Part 2', pattern: 'Comment [word] if you want part 2' },
    { goal: 'Opinion', pattern: 'Which one was your favorite? 👇' },
    { goal: 'Relate', pattern: 'Am I the only one? Drop [emoji] if you relate' },
    { goal: 'Follow', pattern: 'Follow for more [content type]' },
  ],
};

/**
 * Get hook templates for language
 */
export function getHookTemplates(lang: Language) {
  const normalized = normalizeLanguage(lang);
  return HOOK_TEMPLATES[normalized] || HOOK_TEMPLATES.english;
}

/**
 * Get CTA templates for language
 */
export function getCTATemplates(lang: Language) {
  const normalized = normalizeLanguage(lang);
  return CTA_TEMPLATES[normalized] || CTA_TEMPLATES.english;
}
