/**
 * SEEFLUENCER VIRAL FRAMEWORK — Smart Localization Engine
 *
 * Core logic:
 * 1. HOOK BANK imported from knowledge/11-hook-library-2026.ts (100 English templates)
 * 2. SLANG DATABASE parsed from docs/knowledge/02-slang-dictionary.md (ID/HI/EN)
 * 3. getLocalizedHookStrategy() = Select English hook → Transcreate using local slang
 *
 * The LLM adapts English hook CONCEPTS into local language at generation time.
 * We provide: the concept + the slang terms + explicit "do NOT translate literally" instruction.
 *
 * Created: 2026-02-06
 */

import {
  HOOK_LIBRARY,
  HOOK_CATEGORY_META,
  VISUAL_ACTION_BANK,
  getVisualActionsForHookCategory,
  type HookCategory,
  type HookTemplate
} from '../knowledge/11-hook-library-2026.ts'
import type { ContentType } from './contentTypeDetector.ts'

// ============================================================================
// SLANG DATABASE — Transcreation-focused extract from 02-slang-dictionary.md
// ============================================================================

interface SlangEntry { term: string; meaning: string }

interface LanguageSlang {
  pronouns: string;
  current_terms: SlangEntry[];
  particles: string[];    // ID: particles, HI: fillers, EN: softeners
  outdated: string[];
  emoji_style: string;
  transcreation_note: string;  // Key instruction for the LLM
}

const SLANG_DATABASE: Record<string, LanguageSlang> = {
  indonesian: {
    pronouns: 'gue/lo (NEVER saya/kamu — those sound corporate/boomer)',
    current_terms: [
      { term: 'Stecu', meaning: 'Pretending not to care' },
      { term: 'Rizz', meaning: 'Charisma/flirting skill' },
      { term: 'Delulu', meaning: 'Self-aware delusional' },
      { term: 'Slay', meaning: 'Perfect execution' },
      { term: 'Red flag', meaning: 'Warning sign' },
      { term: 'Cringe', meaning: 'Embarrassing' },
      { term: 'Healing', meaning: 'Self-care retreat' },
      { term: 'Burnout', meaning: 'Mental exhaustion' },
      { term: 'FOMO', meaning: 'Fear of missing out' },
      { term: 'Toxic', meaning: 'Unhealthy dynamic' },
      { term: 'Flex', meaning: 'Showing off' },
      { term: 'Ghosting', meaning: 'Disappearing without notice' },
      { term: 'Spill', meaning: 'Reveal secrets' },
      { term: 'Vibes', meaning: 'Atmosphere/energy' },
      { term: 'Bucin', meaning: 'Overly devoted to partner' },
    ],
    particles: ['sih', 'tuh', 'gitu', 'dong', 'deh', 'banget', 'parah'],
    outdated: ['alay', 'lebay', 'woles', 'kids jaman now', 'ciyus', 'miapah'],
    emoji_style: '😭=laughing hard, 💀=dead from laughter (NOT 😂 — that is boomer)',
    transcreation_note: `Adapt the English hook into Indonesian Gen-Z style:
- Use gue/lo pronouns (NEVER saya/kamu)
- Mix Indonesian with English slang naturally (code-mixing)
- Add particles for natural flow: sih, tuh, gitu, dong, banget
- Use hyperbolic reactions: "literally", "banget", "parah", "gila"
- Tone: casual chaotic friend giving advice, NOT a teacher/expert

❌ BAD TRANSCREATION (literal translation with slang sprinkled):
English: "Stop doing this immediately, you look like an amateur."
Bad ID: "Hentikan melakukan ini, lo keliatan kayak amatir."
Why bad: Indonesian sentence structure, just swapped saya→lo. Still sounds like a textbook.

✅ GOOD TRANSCREATION (complete cultural reimagining):
English: "Stop doing this immediately, you look like an amateur."
Good ID: "Anjir, lo masih gitu? Keliatan noob parah, sumpah."
Why good: Different structure, particles (parah, sumpah), hyperbolic, sounds like a real friend talking.`
  },

  hindi: {
    pronouns: 'tum (avoid excessive aap/ji — sounds sarcastic to Gen-Z)',
    current_terms: [
      { term: 'Bohot hard', meaning: 'Extremely impressive' },
      { term: 'Jugaad', meaning: 'Creative hack/workaround' },
      { term: 'Scene', meaning: 'Plans/situation' },
      { term: 'Jhakaas', meaning: 'Fantastic' },
      { term: 'Mast', meaning: 'Great/cool' },
      { term: 'Fadu', meaning: 'Mind-blowing' },
      { term: 'Bindaas', meaning: 'Carefree/bold' },
      { term: 'Chill maar', meaning: 'Relax/take it easy' },
      { term: 'Bakwas', meaning: 'Nonsense/BS' },
      { term: 'Ghanta', meaning: '"Yeah right!" (sarcastic)' },
      { term: 'Kaand', meaning: 'Mess/scandal' },
      { term: 'Kya baat hai', meaning: 'Wow!/Impressive!' },
      { term: 'Solid', meaning: 'Impressive performance' },
      { term: 'Kadak', meaning: 'Excellent/strong' },
      { term: 'Scene tight', meaning: 'Under control' },
    ],
    particles: ['Yaar', 'Na', 'Matlab', 'Arre', 'Bhai', 'Bilkul'],
    outdated: ['Swag (overused)', 'Fully tight', 'Tension not'],
    emoji_style: '💀=hilarious, 🔥=amazing',
    transcreation_note: `Adapt the English hook into Hinglish (Hindi-English mix) style:
- Write Hindi words in Devanagari script (हिंदी)
- Mix freely with English tech/trending terms
- Use tum pronoun (avoid excessive aap/ji)
- Add natural fillers: yaar, na, matlab, arre, bhai
- Tone: like a smart friend explaining in a chai shop, NOT a news anchor

❌ BAD TRANSCREATION (literal translation):
English: "Stop doing this immediately, you look like an amateur."
Bad HI: "तुरंत ये करना बंद करो, तुम amateur लग रहे हो।"
Why bad: Direct translation, no personality, sounds like a warning sign.

✅ GOOD TRANSCREATION (cultural reimagining):
English: "Stop doing this immediately, you look like an amateur."
Good HI: "यार, अभी तक ये कर रहे हो? बहोत गलत हो भाई।"
Why good: Uses fillers (यार, भाई), Hinglish mix, conversational, chai-shop energy.`
  },

  english: {
    pronouns: 'Standard (you/I)',
    current_terms: [
      { term: 'Slay', meaning: 'Doing exceptionally well' },
      { term: 'Rizz', meaning: 'Charisma' },
      { term: 'Fire', meaning: 'Amazing' },
      { term: 'Ate (no crumbs)', meaning: 'Flawless execution' },
      { term: 'W / L', meaning: 'Win / Loss' },
      { term: 'Lock in', meaning: 'Deep focus mode' },
      { term: 'Delulu', meaning: 'Playfully delusional' },
      { term: 'Hits different', meaning: 'Stronger impact than expected' },
      { term: 'Cooked', meaning: 'Defeated/done for' },
      { term: 'Let them cook', meaning: 'Let them continue/show skill' },
      { term: 'Mid', meaning: 'Mediocre/average' },
      { term: 'Sus', meaning: 'Suspicious' },
      { term: 'Bet', meaning: 'Agreement/confirmed' },
      { term: 'NPC', meaning: 'Robotic/boring person' },
      { term: 'Ick', meaning: 'Sudden disgust/turnoff' },
    ],
    particles: ['like', 'literally', 'basically', 'honestly', 'actually'],
    outdated: ['On fleek', 'YOLO', 'Yeet', 'Lit', 'Squad goals', 'Bae'],
    emoji_style: '💀=dead from laughter, 😭=overwhelming (NOT 😂 — outdated)',
    transcreation_note: `For English, use the hook template directly but:
- Replace all [Placeholder]s with actual topic content
- Use UNIVERSAL slang only (no US-only: "no cap", "finna", "deadass")
- No UK-only: "innit", "bare", "bruv", "peng"
- Keep it conversational, not formal`
  },

  french: {
    pronouns: 'tu/vous mix (casual)',
    current_terms: [
      { term: 'Slay', meaning: 'Réussir parfaitement' },
      { term: 'C\'est chaud', meaning: 'Intense/impressive' },
      { term: 'Ouf', meaning: 'Incredible (verlan of "fou")' },
      { term: 'Frais', meaning: 'Cool/fresh' },
      { term: 'Relou', meaning: 'Annoying (verlan of "lourd")' },
      { term: 'Dar', meaning: 'Crazy/insane' },
      { term: 'Bail', meaning: 'Thing/situation' },
      { term: 'Chanmé', meaning: 'Amazing (verlan of "méchant")' },
    ],
    particles: ['genre', 'en mode', 'du coup', 'trop', 'grave'],
    outdated: ['Swag', 'YOLO', 'Kiffer (overused)'],
    emoji_style: '💀=mort de rire, 😭=trop drôle',
    transcreation_note: `Adapt the English hook into modern French TikTok style:
- Mix with English trending terms naturally
- Use verlan where natural (ouf, relou, chanmé)
- Add flow particles: genre, en mode, du coup, trop, grave
- Tone: like a cool Parisian friend, NOT a professor`
  }
};

// ============================================================================
// CONTENT TYPE → HOOK CATEGORY MAPPING (5 categories)
// ============================================================================

const CONTENT_TYPE_TO_HOOKS: Record<ContentType, {
  primary: HookCategory;
  secondary: HookCategory;
  tertiary: HookCategory;
}> = {
  listicle:       { primary: 'curiosity_gap',  secondary: 'speed_value',    tertiary: 'negative_bias' },
  tutorial:       { primary: 'speed_value',    secondary: 'negative_bias',  tertiary: 'curiosity_gap' },
  controversy:    { primary: 'negative_bias',  secondary: 'relatability',   tertiary: 'curiosity_gap' },
  transformation: { primary: 'visual_shock',   secondary: 'relatability',   tertiary: 'curiosity_gap' },
  comparison:     { primary: 'curiosity_gap',  secondary: 'negative_bias',  tertiary: 'visual_shock' },
  story:          { primary: 'relatability',   secondary: 'curiosity_gap',  tertiary: 'visual_shock' },
  news:           { primary: 'curiosity_gap',  secondary: 'negative_bias',  tertiary: 'visual_shock' },
  review:         { primary: 'negative_bias',  secondary: 'curiosity_gap',  tertiary: 'speed_value' },
  challenge:      { primary: 'visual_shock',   secondary: 'curiosity_gap',  tertiary: 'relatability' },
  educational:    { primary: 'curiosity_gap',  secondary: 'speed_value',    tertiary: 'negative_bias' },
  general:        { primary: 'relatability',   secondary: 'speed_value',    tertiary: 'curiosity_gap' },
};

// ============================================================================
// SMART LOCALIZATION ENGINE — getLocalizedHookStrategy()
// ============================================================================

/**
 * The core Smart Localization Engine.
 *
 * Flow:
 * 1. SELECT: Pick ~6 English hooks from HOOK_LIBRARY based on contentType
 * 2. TRANSCREATE: Build LLM instructions to adapt hooks using SLANG_DATABASE
 * 3. TRIPLE HOOK: Always generates 3 options (safe/negative/visual)
 *
 * Returns a prompt block injected into the system prompt.
 */
export function getLocalizedHookStrategy(contentType: ContentType, language: string): string {
  const lang = language.toLowerCase();
  const langKey = (lang === 'indonesian' || lang === 'hindi' || lang === 'french') ? lang : 'english';
  const slang = SLANG_DATABASE[langKey] || SLANG_DATABASE.english;

  const mapping = CONTENT_TYPE_TO_HOOKS[contentType] || CONTENT_TYPE_TO_HOOKS.general;
  const primaryMeta = HOOK_CATEGORY_META[mapping.primary];
  const secondaryMeta = HOOK_CATEGORY_META[mapping.secondary];

  // Select hooks: 3 from primary, 2 from secondary, 1 from tertiary
  const primaryHooks = pickRandom(HOOK_LIBRARY[mapping.primary], 3);
  const secondaryHooks = pickRandom(HOOK_LIBRARY[mapping.secondary], 2);
  const tertiaryHooks = pickRandom(HOOK_LIBRARY[mapping.tertiary], 1);

  // Also always pick 1 from relatability (for Option A) and 1 from negative_bias (for Option B)
  // and 1 from visual_shock (for Option C) — to ensure all 3 triple-hook flavors are represented
  const safeHook = pickRandom(HOOK_LIBRARY.relatability, 1)[0] || HOOK_LIBRARY.relatability[0];
  const negHook = pickRandom(HOOK_LIBRARY.negative_bias, 1)[0] || HOOK_LIBRARY.negative_bias[0];
  const visHook = pickRandom(HOOK_LIBRARY.visual_shock, 1)[0] || HOOK_LIBRARY.visual_shock[0];

  // Get top visual actions for Option C based on primary hook category
  const visualActions = getVisualActionsForHookCategory(mapping.primary).slice(0, 3);

  const formatHook = (h: HookTemplate, i: number) => {
    const prefix = h.visual_cue ? `${h.visual_cue} ` : '';
    return `   ${i + 1}. ${prefix}"${h.script}"`;
  };

  // Build topic-aware slang terms list for transcreation instruction
  // Universal terms work for any topic; lifestyle terms only for non-technical content
  const UNIVERSAL_SLANG_TERMS = ['Slay', 'Cringe', 'Flex', 'FOMO', 'Vibes', 'Fire', 'Mid', 'W / L', 'Lock in', 'Cooked'];
  const isHighFriction = ['tutorial', 'educational', 'comparison', 'review'].includes(contentType);
  const relevantTerms = isHighFriction
    ? slang.current_terms.filter(t => UNIVERSAL_SLANG_TERMS.some(u => u.toLowerCase() === t.term.toLowerCase()) || ['Burnout', 'Toxic', 'Red flag'].includes(t.term))
    : slang.current_terms;
  const slangTermsList = relevantTerms.slice(0, 10).map(t => `${t.term} (=${t.meaning})`).join(', ');
  const particlesList = slang.particles.join(', ');

  return `
═══════════════════════════════════════════════════════════════
🎣 SMART HOOK SYSTEM — Triple Hook + Localization Engine
═══════════════════════════════════════════════════════════════

## CONTENT TYPE: ${contentType.toUpperCase()}
**Best hook category:** ${primaryMeta.name}
**Psychological trigger:** ${primaryMeta.psychological_trigger}

## STEP 1: REFERENCE HOOKS (English Concepts)

**Primary — ${primaryMeta.name} (best fit for ${contentType}):**
${primaryHooks.map(formatHook).join('\n')}

**Secondary — ${secondaryMeta.name}:**
${secondaryHooks.map(formatHook).join('\n')}

**Tertiary:**
${tertiaryHooks.map(formatHook).join('\n')}

## STEP 2: TRANSCREATION (NOT Translation!)

${langKey === 'english' ? `**Language: English** — Use hook templates directly. Replace all [Placeholder]s with actual topic content.` : `**Target Language: ${langKey.toUpperCase()}**

You have selected English hook concepts above.
Your goal is to ADAPT these into ${langKey.toUpperCase()} using the slang terms below.
Do NOT translate literally. Keep the psychological trigger (${primaryMeta.psychological_trigger}) but make it sound like a local native friend talking.

**Pronouns:** ${slang.pronouns}
**Slang terms to weave in:** ${slangTermsList}
**Natural particles/fillers:** ${particlesList}
**Emoji style:** ${slang.emoji_style}
**AVOID (outdated):** ${slang.outdated.join(', ')}

**Transcreation rules:**
${slang.transcreation_note}`}

## STEP 3: GENERATE TRIPLE HOOK (MANDATORY — All 3 Options)

You MUST generate 3 distinct hook options in the "hook_options" field.
Each option adapts a DIFFERENT English concept into ${langKey === 'english' ? 'engaging English' : langKey.toUpperCase()}.

### OPTION A — Safe / Relatable Hook
Source concept: "${safeHook.script}"
Goal: Broad appeal, easy identification, low friction.
Adapt this concept using ${langKey} slang. Make viewer think "that's literally me."

### OPTION B — Negative / Controversial Hook
Source concept: "${negHook.script}"
Goal: Stop scroll via negativity bias, warning, or contrarian take.
Adapt this concept with urgency. Make viewer think "wait, am I doing this wrong?"

### OPTION C — Visual / Action-First Hook
Source concept: ${visHook.visual_cue ? `${visHook.visual_cue} "${visHook.script}"` : `"${visHook.script}"`}
Goal: Physical action or camera trick stops scroll BEFORE words register.
${visHook.visual_cue ? `KEEP the visual cue prefix (${visHook.visual_cue}) and adapt the spoken text.` : 'Add a visual cue prefix: [Camera:], [Action:], or [Visual:].'}

**VISUAL ACTION LIBRARY — Choose ONE for the visual_direction field:**
${visualActions.map(a => `• **${a.name}:** ${a.videoAction}
  → Prompt: "${a.promptFragment}"`).join('\n')}

**Option C visual_direction MUST describe:**
1. What the creator physically does in the first 0.5 seconds (from the actions above or similar)
2. The expression at that moment (shock, smirk, intensity — matching the video action)
3. Camera framing (extreme close-up, medium shot, POV — to reinforce the action)
Example: "Creator frozen mid-bite eating raw onion, eyes snap to camera wide-open | Extreme close-up face | Rembrandt hard shadow lighting"

---

## 🎬 SCENE IMMERSION MANDATE — ALL 3 OPTIONS (A + B + C)

**THIS IS THE MOST IMPORTANT RULE FOR visual_direction.**

NEVER write "creator at desk", "creator in studio", "creator pointing at laptop", or any generic shot.
The HOOK image must be MINDBLOWING and make the viewer stop scrolling.

**FORMULA: [Creator as character in costume] + [Surreal world = topic made literal] + [Impossible props]**

The creator is NOT talking ABOUT the topic — the creator IS INSIDE the topic as a surreal character.

### TOPIC → WORLD TRANSLATION PATTERNS (use as inspiration):
| Topic Category | Surreal Scene Concept |
|---|---|
| War / Conflict / Military | Creator in medieval battle armor inside an active warzone, bullets ricocheting off a shield |
| Tech / AI / Business | Creator as mad scientist / surgeon in a futuristic lab, extracting glowing data-brains from famous tech figures |
| Finance / Stocks / Money | Creator as a bazaar street vendor selling stacks of cash, gold bars, or company logos like groceries |
| Health / Diet / Body | Creator as a chef in an operating room, dissecting human organs labeled with health facts |
| Social Media / Viral / Entertainment | Creator as a DJ performing on top of coffins in a graveyard / underwater / in zero gravity |
| Politics / Power / Government | Creator as a traditional shopkeeper (market stall / warung) selling nuclear missiles / oil barrels / flags with price tags |
| Mystery / Secret / Hidden | Creator emerging from a massive vault door / foggy portal / secret underground bunker |
| Education / History | Creator as a time-traveler caught between eras — half modern outfit, half ancient costume |
| Relationship / Social | Creator as a puppet master or chess player controlling life-size dolls of real-world characters |

### SCENE IMMERSION RULES:
1. **Costume:** Creator MUST wear a costume matching the scene — NOT everyday clothes or plain shirt
2. **Setting:** Background MUST be a surreal constructed world — NOT a home office, coffee shop, or plain studio
3. **Props:** Props MUST be physically impossible, absurdly literal, or surreally exaggerated
4. **Expression:** Manic grin, wide-eyed shock, conspiratorial smirk, or intense war-cry — NEVER neutral face
5. **Scale:** Make the scene CINEMATIC — epic lighting, detailed environment, multiple visual elements

### OUTPUT FORMAT for visual_direction (ALL options):
\`[Creator as ROLE in COSTUME] doing [ACTION] inside [SURREAL WORLD SETTING] | [IMPOSSIBLE/ABSURD PROPS relevant to topic] | [Camera: framing] | [Lighting: style and mood]\`

### SCENE IMMERSION EXAMPLES (real hook samples):
- Topic "Future War isn't about bombs": Creator wearing medieval Roman warrior armor, crouching behind bronze shield with bullets bouncing off it, screaming mid-battle, explosions and guns firing in background | Epic war ruins backdrop | Dutch angle extreme low shot | Harsh military flare lighting
- Topic "Tech Billionaire habits": Creator in white lab coat as brain surgeon, extracting glowing golden brains from reclining patients labeled "Elon Musk", "Zuckerberg", "Bezos" in a sleek surgical room | Multiple glowing brain jars on shelves | Clinical overhead operating light | Cold white-blue lighting
- Topic "Spotify Funeral Urn plays music": Creator wearing DJ headphones, scratching turntables made of grey burial urns in a misty moonlit graveyard | Spotify logo on tombstones | Ghosts floating in background | Moody atmospheric fog-light
- Topic "Trump says Iran has nukes": Creator in ornate traditional Middle Eastern merchant robes standing at a bazaar stall ("Toko Roket Nuklir") displaying nuclear missiles with price tags and country flags | Warm bazaar lantern lighting | Medium wide shot

### ANTI-PATTERNS — NEVER DO THIS:
❌ "Creator at coffee shop looking at laptop"
❌ "Creator pointing finger at camera with plain background"
❌ "Creator standing in front of whiteboard"
❌ "Creator holding phone showing statistics"
❌ Any scene that could describe 1000 other videos

### HOOK OUTPUT FORMAT:
\`\`\`json
"hook_options": {
  "option_a_safe": { "script_text": "...", "visual_direction": "Scene: ... | Camera: ... | ...", "hook_type": "safe_relatable" },
  "option_b_negative": { "script_text": "...", "visual_direction": "Scene: ... | Camera: ... | ...", "hook_type": "negative_controversial" },
  "option_c_visual": { "script_text": "...", "visual_direction": "Scene: ... | Camera: ... | ...", "hook_type": "visual_action" }
}
\`\`\`

### HOOK RULES:
1. **Clickbait-but-Honest:** The claim MUST be deliverable in the BODY. No empty promises.
2. **Replace ALL [Placeholder]s** with ACTUAL topic-specific content.
3. **2-Stage Hook/Rehook:** Visual action in first 1s, verbal hook in next 2s.
4. **The HOOK segment in "segments" array uses Option A by default.**
5. **Each option must have DIFFERENT script_text** — not just rephrased versions of the same hook.
6. **CURIOSITY GAP (CRITICAL):** NEVER reveal the answer, tool name, product name, solution, or payoff in the HOOK. The HOOK creates the question — BODY/PEAK delivers the answer. If someone reads ONLY the HOOK, they should NOT know what the specific tools/answers/solutions are. Instead of naming specific items, use quantity + category teasers: "3 AI tools yang gila" NOT "Jasper, CapCut, Pionex".
   **BUT IMPORTANT:** The BODY segments MUST name the specific tools/products/answers. That's the payoff! Each BODY segment reveals ONE item by name (e.g., BODY-1: "Pertama: Jasper AI..."). Hiding names in BODY = broken promise = viewer leaves.
7. **TOPIC KEYWORD COHERENCE (CRITICAL):** All 3 hook options MUST share the same core topic keywords so that FORE/BODY/PEAK connect with ANY hook variant. The user can switch between hooks — FORE must still make sense.
   **Rule:** Extract 2-3 core topic keywords from the TOPIC (e.g., topic "3 kesalahan branding" → keywords: "kesalahan", "branding"). ALL 3 hooks MUST contain these same topic keywords, just framed differently (safe/negative/visual angle).
   **Example:**
   - Topic: "3 kesalahan branding pribadi"
   - ✅ Option A: "3 KESALAHAN branding pribadi yang bikin lo gagal..."
   - ✅ Option B: "STOP! 3 KESALAHAN branding pribadi ini FATAL..."
   - ✅ Option C: "[Camera: extreme close-up] 3 KESALAHAN branding pribadi yang gak ada yang berani bilang..."
   - ❌ Option B: "Lo masih lakuin ini? Karir lo dalam BAHAYA..." (missing "kesalahan", "branding" → FORE won't connect)
   **Why:** FORE is written ONCE and says "kesalahan yang terakhir ini paling fatal..." — if Option B doesn't mention "kesalahan", switching to it breaks the narrative flow.`;
}

// ============================================================================
// FORESHADOW STRATEGY — 4 Types (matched to content type)
// ============================================================================

type ForeshadowType = 'steps_tease' | 'fear_urgency' | 'quiz_question' | 'visual_tease';

const CONTENT_TYPE_TO_FORESHADOW: Record<ContentType, ForeshadowType> = {
  listicle: 'steps_tease',
  tutorial: 'steps_tease',
  controversy: 'fear_urgency',
  transformation: 'visual_tease',
  comparison: 'quiz_question',
  story: 'visual_tease',
  news: 'fear_urgency',
  review: 'quiz_question',
  challenge: 'visual_tease',
  educational: 'fear_urgency',
  general: 'steps_tease',
};

const FORESHADOW_RULES: Record<ForeshadowType, { rule: string; example_id: string; example_en: string }> = {
  steps_tease: {
    rule: 'Preview the number of items + tease the LAST item as the most insane. End with urgency command.',
    example_id: 'Gue bakal kasih tau 3 cara, dan yang ketiga ini literally yang bikin gue quit job. Stay sampai akhir!',
    example_en: "I'm showing you 3 methods, and the third one literally made me quit my job. Watch till the end!"
  },
  fear_urgency: {
    rule: 'Create FOMO: If viewer skips this video, they WILL lose something specific. State the consequence.',
    example_id: 'Kalau lo skip video ini, lo bakal tetep buang 500rb per bulan tanpa sadar. Gue serius.',
    example_en: "If you skip this, you'll keep wasting $500 every month without knowing. I'm dead serious."
  },
  quiz_question: {
    rule: 'Ask a specific question the viewer CANNOT answer without watching. Tease that the answer is surprising.',
    example_id: 'Lo tau nggak antara [A] dan [B], mana yang SEBENARNYA lebih worth it? Jawabannya bakal bikin lo kaget.',
    example_en: "Do you know which is ACTUALLY better — [A] or [B]? The answer will shock you."
  },
  visual_tease: {
    rule: 'Show a BLURRED or PARTIAL preview of the end result. Create "I MUST see the full version" urge.',
    example_id: 'Lo bakal liat transformasi yang gila banget di akhir. Ini baru versi sebelumnya...',
    example_en: "You'll see an insane transformation at the end. This is just the before..."
  }
};

export function getForeshadowStrategy(contentType: ContentType, language: string): string {
  const lang = language.toLowerCase();
  const foreshadowType = CONTENT_TYPE_TO_FORESHADOW[contentType] || 'steps_tease';
  const strategy = FORESHADOW_RULES[foreshadowType];
  const example = lang === 'indonesian' ? strategy.example_id : strategy.example_en;

  return `
## FORESHADOW STRATEGY: ${foreshadowType.toUpperCase().replace(/_/g, ' ')}

**Purpose:** Create an UNFINISHED LOOP — incomplete information the brain cannot ignore.

**Rule:** ${strategy.rule}
**Example:** "${example}"

**Validation:**
1. FORE must create a SPECIFIC expectation for the PEAK segment
2. MUST contain urgency phrase ("sampai habis" / "watch till end" / "stay")
3. The promise MUST be delivered in the PEAK segment (no empty promises)
4. Creates measurable FOMO — viewer LOSES something if they skip`;
}

// ============================================================================
// BODY FRAMEWORK — PAS vs Points vs Narrative
// ============================================================================

export function getBodyFramework(contentType: ContentType, itemCount: number | null): string {
  if (itemCount && itemCount > 0) {
    return `
## BODY FRAMEWORK: POINTS SYSTEM (${itemCount} Items Detected)

Each BODY segment = 1 item. PEAK = final item (the BEST one).

**Stakes Escalation:**
- Item #1: Interesting → viewer thinks "oh cool"
- Item #2: Surprising → "wait, really?"
${itemCount >= 3 ? '- Item #3: Stakes raise → "no way..."' : ''}
${itemCount >= 4 ? '- Item #4: Mind-blown → "this is insane"' : ''}
- Final Item (PEAK): The BEST → "I NEED to share this"

**Per-Item Formula:** [SPECIFIC Name] + [Why it matters] + [One concrete detail/stat]
Example: "Pertama: Jasper AI buat copywriting. 50 artikel per hari, satu klik."

**Rules:**
- ✅ ALWAYS name the specific tool/product/answer in EACH body segment — this IS the payoff.
- ❌ NEVER hide or vaguely describe items in BODY ("AI copywriting tool" instead of "Jasper AI" = BAD).
- ❌ NEVER skip items. ALL ${itemCount} must be covered.
- ❌ NEVER waste a BODY segment on filler/reactions only.
- ✅ Each item introduces NEW information.
- ✅ Arrange from least to most impressive (best for PEAK).`;
  }

  if (['tutorial', 'educational'].includes(contentType)) {
    return `
## BODY FRAMEWORK: PROBLEM → AGITATE → SOLUTION (PAS)

- BODY-1 (PROBLEM): State the problem. Make viewer nod "that's me."
- BODY-2 (AGITATE): Make the problem WORSE. Show consequences of NOT solving it.
- BODY-3+ (SOLUTION): Deliver concrete steps. Each step = 1 segment. NAME specific tools/methods.
- PEAK: Show the RESULT of applying the solution. Proof it works.

**Rules:**
- PROBLEM must be relatable (80%+ of audience has this)
- AGITATE creates urgency (financial loss, wasted time, embarrassment)
- SOLUTION must be specific and actionable — NAME the exact tool/method/product (not "just use an AI tool")
- ✅ BODY is where the HOOK's curiosity gap gets resolved. Deliver the actual answer here.`;
  }

  return `
## BODY FRAMEWORK: NARRATIVE ARC

- BODY-1 (SETUP): Who, what, where. Make viewer care.
- BODY-2 (RISING ACTION): Conflict or complication.
- BODY-3+ (ESCALATION): Stakes get higher each segment.
- PEAK: Climax / plot twist / reveal. Highest emotional moment.

**Rules:**
- Every segment moves the story forward (no stalling)
- Each segment ends with micro-cliffhanger
- Stakes MUST escalate — each more intense than last
- PEAK delivers satisfying twist connecting back to FORE's promise`;
}

// ============================================================================
// PEAK PAYOFF RULES
// ============================================================================

export const PEAK_PAYOFF_RULES = `
## PEAK — THE PAYOFF (Non-Negotiable)

PEAK = The CLIMAX. The moment the viewer waited for since FORESHADOW.

**PEAK MUST:**
1. DELIVER the exact promise from FORE (if FORE teased "yang ketiga paling gila", PEAK IS that)
2. SURPRISE — plot twist, unexpected angle, or revelation viewer didn't predict
3. Be the HIGHEST-ENERGY moment in the entire script
4. Encourage RE-WATCHING (twist makes viewer want to catch foreshadowing clues)

**PEAK MUST NOT:**
- ❌ Generic summary ("Jadi itulah 3 caranya")
- ❌ Repeat BODY information
- ❌ Be weaker than any BODY segment

**Plot Twist Patterns:**
- Reversal: What everyone thought was X is actually Y
- Scale Reveal: Result is 10x bigger than expected
- Personal: Creator reveals surprising connection to topic
- Future: "And it gets even crazier — in 2026, [X] will..."`;

// ============================================================================
// CTA STRATEGY — 4 High-Engagement Types
// ============================================================================

type CTAType = 'polarize_debate' | 'question_trigger' | 'identity_tag' | 'engagement_reward';

const CONTENT_TYPE_TO_CTA: Record<ContentType, CTAType> = {
  listicle: 'question_trigger',
  tutorial: 'engagement_reward',
  controversy: 'polarize_debate',
  transformation: 'identity_tag',
  comparison: 'polarize_debate',
  story: 'identity_tag',
  news: 'question_trigger',
  review: 'polarize_debate',
  challenge: 'engagement_reward',
  educational: 'engagement_reward',
  general: 'question_trigger',
};

const CTA_RULES: Record<CTAType, { rule: string; example_id: string; example_en: string }> = {
  polarize_debate: {
    rule: 'Invite DEBATE. Ask a question with 2 clear sides to trigger comments.',
    example_id: 'Menurut lo [A] atau [B]? Comment di bawah, gue mau tau side lo.',
    example_en: "Do you think [A] or [B]? Drop your take in the comments."
  },
  question_trigger: {
    rule: 'Ask a question EASY to answer but makes viewers curious about others\' answers.',
    example_id: 'Lo termasuk yang mana? Comment angkanya: 1, 2, atau 3!',
    example_en: "Which one are you? Drop 1, 2, or 3 in the comments!"
  },
  identity_tag: {
    rule: 'Trigger viewer to TAG a friend or SHARE because "this is literally them."',
    example_id: 'Tag temen lo yang PALING butuh ini. Lo tau siapa orangnya.',
    example_en: "Tag the friend who NEEDS this. You know exactly who."
  },
  engagement_reward: {
    rule: 'Offer additional VALUE as reward for engagement.',
    example_id: 'Comment "MAU" dan gue kirim full guide-nya ke DM lo.',
    example_en: "Comment 'GUIDE' and I'll DM you the full step-by-step."
  }
};

export function getCTAStrategy(contentType: ContentType, language: string): string {
  const lang = language.toLowerCase();
  const ctaType = CONTENT_TYPE_TO_CTA[contentType] || 'question_trigger';
  const strategy = CTA_RULES[ctaType];
  const example = lang === 'indonesian' ? strategy.example_id : strategy.example_en;

  return `
## CTA STRATEGY: ${ctaType.toUpperCase().replace(/_/g, ' ')}

**Rule:** ${strategy.rule}
**Example:** "${example}"

**CTA Rules:**
1. ❌ NEVER generic "Follow gue buat part 2" — that's weak
2. ✅ Trigger a SPECIFIC action (comment a word, tag someone, answer a question)
3. ✅ Feel like natural continuation of PEAK energy
4. ✅ 70/30 Rule: 70% value already delivered, CTA is the 30% that drives action`;
}

// ============================================================================
// POPE IN THE POOL — Retention Through Dual Engagement
// ============================================================================

const HIGH_FRICTION_KEYWORDS = [
  // Finance / Keuangan
  'finance', 'financial', 'keuangan', 'invest', 'investasi', 'saham', 'stock', 'crypto',
  'trading', 'trade', 'pajak', 'tax', 'asuransi', 'insurance', 'bank', 'tabungan',
  'saving', 'budget', 'hutang', 'debt', 'kredit', 'mortgage',
  // Law / Hukum
  'hukum', 'law', 'legal', 'regulasi', 'regulation', 'undang', 'kebijakan', 'policy',
  // Tech / Coding
  'code', 'coding', 'program', 'programming', 'algorithm', 'database', 'API', 'framework',
  'debug', 'machine learning', 'data science', 'backend', 'frontend', 'devops', 'deploy',
  'python', 'javascript', 'typescript', 'react', 'sql',
  // Academic / Sejarah / Sains
  'sejarah', 'history', 'sains', 'science', 'matematika', 'math', 'fisika', 'physics',
  'kimia', 'chemistry', 'biologi', 'biology', 'ekonomi', 'economics', 'statistik',
  // Health / Kesehatan
  'kesehatan', 'health', 'medis', 'medical', 'penyakit', 'disease', 'obat', 'medicine',
  'nutrisi', 'nutrition', 'diet', 'vitamin', 'kalori', 'calorie',
];

const POPE_IN_POOL_SUGGESTIONS: Record<string, string[]> = {
  indonesian: [
    'Creator masak / bikin kopi sambil ngejelasin — aktivitas satisfying bikin viewer stay',
    'Creator jalan-jalan di cafe / mall sambil ngejelasin — movement = retention naik',
    'Creator makan / nyobain makanan sambil drop knowledge — satisfying + informative',
    'Creator ngerjain puzzle / main rubik sambil ngomong — visual bikin otak engaged',
    'Creator workout ringan / stretching sambil ngebahas topik — health audience stays',
    'Creator potong buah / bikin smoothie sambil explain — ASMR-like visual retention',
  ],
  english: [
    'Creator cooks/makes coffee while explaining — satisfying activity keeps viewer',
    'Creator walks through cafe/park while explaining — movement boosts retention',
    'Creator eats/taste-tests food while dropping knowledge — satisfying + informative',
    'Creator solves puzzle/Rubik\'s cube while talking — visual keeps brain engaged',
    'Creator does light workout while discussing — health audience stays longer',
    'Creator cuts fruit/makes smoothie while explaining — ASMR-like retention',
  ],
  hindi: [
    'Creator chai बनाते हुए explain करे — satisfying activity से viewer रुकता है',
    'Creator walk करते हुए explain करे — movement से retention बढ़ता है',
    'Creator खाना खाते हुए knowledge drop करे — satisfying + informative',
    'Creator puzzle/Rubik\'s cube solve करते हुए बात करे — visual brain engagement',
    'Creator light workout करते हुए discuss करे — health audience stays longer',
    'Creator drawing/sketching करते हुए explain करे — ASMR-like visual retention',
  ],
  french: [
    'Le créateur cuisine/fait du café en expliquant — activité satisfaisante retient le spectateur',
    'Le créateur marche dans un lieu animé en expliquant — mouvement booste la rétention',
    'Le créateur mange en partageant ses connaissances — satisfaisant + informatif',
    'Le créateur résout un puzzle/Rubik\'s cube en parlant — le visuel garde le cerveau engagé',
    'Le créateur fait du sport léger en discutant — l\'audience santé reste plus longtemps',
    'Le créateur dessine/peint en expliquant — rétention visuelle type ASMR',
  ]
};

/**
 * Returns Pope-in-the-Pool suggestion.
 * MANDATORY for high-friction topics, OPTIONAL otherwise.
 */
export function getPopeInPoolSuggestion(topic: string, language: string = 'indonesian'): string | null {
  const topicLower = topic.toLowerCase();
  const isMandatory = HIGH_FRICTION_KEYWORDS.some(kw => topicLower.includes(kw));

  const langKey = ['indonesian', 'hindi', 'french'].includes(language) ? language : 'english';
  const suggestions = POPE_IN_POOL_SUGGESTIONS[langKey] || POPE_IN_POOL_SUGGESTIONS.english;
  const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

  if (isMandatory) {
    return `
## "POPE IN THE POOL" TECHNIQUE (⚠️ MANDATORY — Boring Topic Detected)

This topic is HIGH-FRICTION (finance/law/coding/medical/academic).
Viewers will DROP OFF if they only see a talking head lecturing.

**YOU MUST apply this technique:**
${suggestion}

**Rule:** The creator PERFORMS an entertaining/satisfying activity
while delivering the educational content. This gives the viewer
TWO reasons to stay: VALUE (the content) + VISUAL ENTERTAINMENT (the activity).

**Apply to:** ALL CREATOR shot visual_direction (HOOK, CTA, LOOP-END).
The background activity should be visible and continuous.`;
  }

  return `
## "POPE IN THE POOL" TECHNIQUE (Optional — Consider For Retention)

**Suggestion:** ${suggestion}

If the content feels lecture-y, consider having the creator perform
a background activity for visual variety. This is OPTIONAL for this topic.`;
}

// ============================================================================
// UTILITY
// ============================================================================

function pickRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return [...arr];
  // Fisher-Yates shuffle — unbiased uniform distribution
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
