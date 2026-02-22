/**
 * SCORING OPTIMIZER — Component 18 for generate-script prompt
 *
 * Reads SCORING_RULES from 12-scoring-engine.ts programmatically and generates
 * language-aware prompt text that teaches the LLM how to write scripts
 * that score 90-95% automatically.
 *
 * Enhanced with 2026 algorithm research from 7 sources:
 *   [M] OpusClip — TikTok 2026 algorithm (watch time > views, shares 3x > likes)
 *   [N] Virvid — 71% decide in 3s, 70%+ completion = algorithmic boost
 *   [O] Joyspace — "50% Rule", pattern interrupts every 5-8s, looping hack
 *   [P] AutoFaceless — 82% internet = video, TikTok 2.80% engagement
 *   [Q] DriveEditor — Problem/Solution +48% retention, Reveal/Teaser +41% watch time
 *   [R] WolfPack — 4-part structure, single idea per video, direct CTAs
 *   [S] Sprout Social — Saves/shares outweigh likes, "Qualified Views" (5s+)
 *
 * IMPORTANT: All weights are read from SCORING_RULES — never hardcoded here.
 */

import { SCORING_RULES, type SegmentType, type ScoringWeight } from '../knowledge/12-scoring-engine.ts';

// ═══════════════════════════════════════════════════════════════
// LANGUAGE-SPECIFIC EXAMPLES
// ═══════════════════════════════════════════════════════════════

const FEATURE_EXAMPLES: Record<string, Record<string, string>> = {
  indonesian: {
    has_question: '"Lo gak tau...?" or "Pernah kepikiran...?"',
    has_number: '"3 cara...", "50 orang...", "100 juta..."',
    has_power_word: 'GILA, PARAH, RAHASIA, GRATIS, literally',
    has_negative_frame: '"Jangan pernah...", "Stop...", "Rugi kalau..."',
    payoff_not_revealed: 'JANGAN sebut nama tool/produk di HOOK! ✅ "3 AI tools yang gila" ❌ "Jasper, CapCut, Pionex". Reveal di BODY/PEAK.',
    has_pattern_interrupt: '"Tapi tunggu...", "Dan yang bikin kaget..."',
    has_foreshadow: '"Tapi yang terakhir ini yang paling gila..."',
    has_transition: 'Start with "Nah", "Tapi", "Terus"',
    has_transition_word: '"Tapi", "Nah", "Terus", "Nah sekarang"',
    has_specific_detail: 'BODY WAJIB sebut NAMA SPESIFIK: "Jasper AI bikin 50 artikel per hari", BUKAN "AI copywriting tool bikin banyak". Nama tool/produk = payoff dari HOOK.',
    has_value_delivery: '"cara", "langkah", "coba sendiri", actionable verbs. BODY harus deliver jawaban yang dijanjikan HOOK.',
    has_emotional_climax: 'Most intense language — "PALING GILA", "SHOCKING"',
    has_unexpected_twist: '"Tapi ternyata...", "yang gak disangka..."',
    has_specific_proof: '"100 orang udah buktiin", "40% profit dalam 3 bulan"',
    emotional_intensity_high: '"literally", "GILA", "beneran", "serius"',
    has_clear_action: '"Save sekarang", "Follow gue", "Klik link"',
    first_person: '"Gue mau lo...", "Ikutin gue..."',
    single_focus: 'ONE action only — "Save & follow", not "Save + follow + share + comment"',
    has_urgency_word: '"Sekarang!", "Limited!", "Segera!"',
    mirrors_hook_energy: 'Match HOOK intensity — if HOOK is excited, LOOP-END is excited',
    has_callback: '"Inget tadi gue bilang...?", "Yang tadi gue sebut..."',
    emotional_match: 'Same emotion as HOOK — if curious → curious, if angry → angry',
    builds_on_hook: 'Reference what HOOK promised — deliver on curiosity gap',
    matches_hook_category: 'Match content style to hook type used',
    matches_funnel_stage: 'Awareness→"Learn more", Consideration→"Get guide"',
    word_density_optimal: '60-95% of max words — not too sparse, not too packed',
    under_word_limit: 'Stay within word count limit for duration',
  },
  english: {
    has_question: '"Did you know...?" or "Ever wondered...?"',
    has_number: '"3 ways...", "50 people...", "$100M..."',
    has_power_word: 'INSANE, SECRET, FREE, SHOCKING, literally',
    has_negative_frame: '"Don\'t ever...", "Stop...", "You\'re losing..."',
    payoff_not_revealed: 'NEVER name tools/products in HOOK! ✅ "3 AI tools that are insane" ❌ "Jasper, CapCut, Pionex". Reveal in BODY/PEAK.',
    has_pattern_interrupt: '"But wait...", "Here\'s the crazy part..."',
    has_foreshadow: '"But the last one is absolutely insane..."',
    has_transition: 'Start with "Now", "But", "So"',
    has_transition_word: '"But", "However", "Now", "So"',
    has_specific_detail: 'BODY MUST name SPECIFIC tools/products: "Jasper AI writes 50 articles per day", NOT "an AI copywriting tool writes a lot". Tool names = the payoff from HOOK.',
    has_value_delivery: '"step", "try this", "download", actionable verbs. BODY must deliver the answer that HOOK promised.',
    has_emotional_climax: 'Most intense language — "ABSOLUTELY INSANE", "MIND-BLOWING"',
    has_unexpected_twist: '"But turns out...", "Plot twist..."',
    has_specific_proof: '"100 people have proven it", "40% profit in 3 months"',
    emotional_intensity_high: '"literally", "absolutely", "seriously"',
    has_clear_action: '"Save now", "Follow me", "Click the link"',
    first_person: '"I want you to...", "Get my..."',
    single_focus: 'ONE action only — "Save & follow", not multiple CTAs',
    has_urgency_word: '"Right now!", "Limited!", "Today only!"',
    mirrors_hook_energy: 'Match HOOK intensity — if HOOK is excited, LOOP-END is excited',
    has_callback: '"Remember what I said...?", "Like I told you..."',
    emotional_match: 'Same emotion as HOOK — if curious → curious, if angry → angry',
    builds_on_hook: 'Reference what HOOK promised — deliver on curiosity gap',
    matches_hook_category: 'Match content style to hook type used',
    matches_funnel_stage: 'Awareness→"Learn more", Consideration→"Get guide"',
    word_density_optimal: '60-95% of max words — not too sparse, not too packed',
    under_word_limit: 'Stay within word count limit for duration',
  },
  hindi: {
    has_question: '"Kya tumhe pata hai...?" or "Kabhi socha hai...?"',
    has_number: '"3 tarike...", "50 log...", "100 crore..."',
    has_power_word: 'SHOCKING, DHAMAKA, RAHASYA, FREE',
    has_negative_frame: '"Kabhi mat...", "Ruko...", "Nuksaan ho raha hai..."',
    payoff_not_revealed: 'HOOK mein tool/product ka naam KABHI mat batao! ✅ "3 AI tools jo crazy hain" ❌ "Jasper, CapCut, Pionex". Reveal BODY/PEAK mein karo.',
    has_pattern_interrupt: '"Lekin ruko...", "Aur jo chaukane wali baat hai..."',
    has_foreshadow: '"Lekin aakhri wala sabse crazy hai..."',
    has_transition: 'Start with "Ab", "Lekin", "Phir"',
    has_transition_word: '"Lekin", "Phir", "Ab", "To"',
    has_specific_detail: 'BODY mein SPECIFIC naam batao: "Jasper AI roz 50 article likhta hai", NAHI "AI copywriting tool bahut likhta hai". Tool ka naam = HOOK ka payoff.',
    has_value_delivery: '"tarika", "step", "try karo", actionable verbs. BODY mein HOOK ka promise deliver karo.',
    has_emotional_climax: 'Most intense language — "SABSE CRAZY", "SHOCKING"',
    has_unexpected_twist: '"Lekin asli mein...", "Sach ye hai..."',
    has_specific_proof: '"100 logon ne prove kiya", "40% profit 3 mahine mein"',
    emotional_intensity_high: '"sach mein", "bilkul", "seriously"',
    has_clear_action: '"Save karo abhi", "Follow karo", "Link click karo"',
    first_person: '"Main chahta hoon tum...", "Mere saath..."',
    single_focus: 'ONE action only — "Save & follow", not multiple CTAs',
    has_urgency_word: '"Abhi!", "Jaldi!", "Limited!"',
    mirrors_hook_energy: 'Match HOOK intensity — if HOOK is excited, LOOP-END is excited',
    has_callback: '"Yaad hai maine kya kaha...?", "Jo pehle bola tha..."',
    emotional_match: 'Same emotion as HOOK — if curious → curious, if angry → angry',
    builds_on_hook: 'Reference what HOOK promised — deliver on curiosity gap',
    matches_hook_category: 'Match content style to hook type used',
    matches_funnel_stage: 'Awareness→"Learn more", Consideration→"Get guide"',
    word_density_optimal: '60-95% of max words — not too sparse, not too packed',
    under_word_limit: 'Stay within word count limit for duration',
  },
};

// ═══════════════════════════════════════════════════════════════
// 2026 HOOK MASTERY — 5 CATEGORIES (matches Hook Library)
// Each category has its own optimal feature mix.
// Scoring is ADDITIVE: more features = higher score, but NOT all are required.
// ═══════════════════════════════════════════════════════════════

const HOOK_CATEGORY_GUIDE: Record<string, string[]> = {
  indonesian: [
    'visual_shock — "STOP. Lo harus liat ini..." → Power word + pattern interrupt. Visual-first, bisa tanpa question/number. JANGAN sebut nama tools/produk — tunjukkan HASIL-nya aja. Best: Showcase, Food, Tech, Beauty, Fashion, Fitness, Gaming. AVOID: Education deep-dive, B2B, Finance.',
    'negative_bias — "3 KESALAHAN FATAL yang bikin konten lo GAK PERNAH viral" → Negative frame + number + power word. Sebut MASALAH-nya, jangan SOLUSI-nya (tools/produk reveal di BODY). Best: Education, Finance, Coding, Business, Health, Self-Improvement, Product Review. AVOID: Comedy, Lifestyle (kesan menggurui).',
    'curiosity_gap — "Gue nemuin 3 AI tools yang literally ganti kerjaan gue..." → Open loop + curiosity word. JANGAN PERNAH sebut nama tool/produk di HOOK (✅ "3 AI tools" ❌ "Jasper, CapCut, Pionex"). Reveal satu per satu di BODY segments. Best: Storytelling, Case Study, Motivation, Product Launch, Personal Story. AVOID: Tutorial/Tips (viewer mau value langsung, bukan delayed reveal).',
    'relatability — "Ini literally lo setiap kali buka TikTok..." → Emotional word + relatable situation. Gak butuh number/question. Describe SITUASI, bukan solusinya. Best: Lifestyle, Entertainment, Comedy, Daily Life, Relationship, Parenting, Career. AVOID: B2B, Deep Education.',
    'speed_value — "3 hack ini bikin konten lo viral dalam 24 jam" → Number + power word + value promise. Janjikan HASIL-nya, bukan CARA-nya (tools/steps = payoff di BODY). Best: Tutorial, Tips, Hacks, How-To, Productivity, DIY, Recipe, Marketing. AVOID: Entertainment/Comedy (terlalu transaksional), Emotional Storytelling.',
  ],
  english: [
    'visual_shock — "STOP. You need to see this..." → Power word + pattern interrupt. Visual-first, may not need question/number. NEVER name tools/products — show the RESULT. Best: Showcase, Food, Tech, Beauty, Fashion, Fitness, Gaming, Unboxing. AVOID: Education (deep-dive), B2B, Finance.',
    'negative_bias — "3 FATAL mistakes that are KILLING your content right now" → Negative frame + number + power word. Name the PROBLEM, never the SOLUTION (tools/products revealed in BODY). Best: Education, Finance, Coding, Business, Health, Self-Improvement, Product Review, Marketing. AVOID: Comedy, Lifestyle (feels preachy).',
    'curiosity_gap — "I found 3 AI tools that literally replaced my entire workflow..." → Open loop + curiosity word. NEVER reveal tool/product names in HOOK (✅ "3 AI tools" ❌ "Jasper, CapCut, Pionex"). Reveal one per segment in BODY. Best: Storytelling, Case Study, Motivation, Product Launch, Personal Story, Science. AVOID: Tutorial/Tips (viewers want instant value, not delayed reveals).',
    'relatability — "This is literally you every time you open TikTok..." → Emotional word + relatable situation. Doesn\'t need number/question. Describe the SITUATION, not the solution. Best: Lifestyle, Entertainment, Comedy, Daily Life, Relationship, Parenting, Career. AVOID: B2B, Deep Education.',
    'speed_value — "3 hacks to make your content viral in 24 hours" → Number + power word + value promise. Promise the RESULT, not the METHOD (tools/steps = payoff in BODY). Best: Tutorial, Tips, Hacks, How-To, Productivity, DIY, Recipe, Marketing. AVOID: Entertainment/Comedy (too transactional), Emotional Storytelling.',
  ],
  hindi: [
    'visual_shock — "RUKO. Ye dekhna zaroori hai..." → Power word + pattern interrupt. Visual-first, question/number zaroori nahi. Tools/products ka naam KABHI mat batao — RESULT dikhao. Best: Showcase, Food, Tech, Beauty, Fashion, Fitness, Gaming. AVOID: Education deep-dive, B2B, Finance.',
    'negative_bias — "3 GALTIYAAN jo tumhara content KABHI viral nahi hone deti" → Negative frame + number + power word. PROBLEM batao, SOLUTION nahi (tools/products BODY mein reveal). Best: Education, Finance, Coding, Business, Health, Self-Improvement, Product Review. AVOID: Comedy, Lifestyle (lecture lagta hai).',
    'curiosity_gap — "Maine 3 AI tools dhundhe jo literally meri puri job replace kar diye..." → Open loop + curiosity word. HOOK mein tool/product ka naam KABHI mat batao (✅ "3 AI tools" ❌ "Jasper, CapCut, Pionex"). Ek ek karke BODY mein reveal karo. Best: Storytelling, Case Study, Motivation, Product Launch, Personal Story. AVOID: Tutorial/Tips (viewer ko turant value chahiye).',
    'relatability — "Ye literally tum ho jab bhi TikTok kholte ho..." → Emotional word + relatable situation. Number/question zaroori nahi. SITUATION describe karo, solution nahi. Best: Lifestyle, Entertainment, Comedy, Daily Life, Relationship, Parenting, Career. AVOID: B2B, Deep Education.',
    'speed_value — "3 hacks se tumhara content 24 ghante mein viral" → Number + power word + value promise. RESULT ka promise karo, METHOD nahi (tools/steps = BODY mein payoff). Best: Tutorial, Tips, Hacks, How-To, Productivity, DIY, Recipe, Marketing. AVOID: Entertainment/Comedy, Emotional Storytelling.',
  ],
};

// ═══════════════════════════════════════════════════════════════
// TOPIC → HOOK CATEGORY SELECTION RULES (for LLM prompt)
// Research-backed: OpusClip, TokPortal Q2-2025, Virvid, Buffer,
// DriveEditor, WolfPack, Brandefy psychology data.
// ═══════════════════════════════════════════════════════════════

const TOPIC_HOOK_SELECTION_RULES: Record<string, string[]> = {
  indonesian: [
    'ATURAN PEMILIHAN HOOK BERDASARKAN TOPIK (WAJIB DIIKUTI):',
    '',
    'Topik EDUCATION / FINANCE / CODING / BUSINESS / HEALTH / SELF-IMPROVEMENT:',
    '  → PRIMARY: negative_bias (Problem-focused hooks 2:1 lebih baik dari generic advice)',
    '  → SECONDARY: speed_value (untuk tips/tutorial dalam niche ini)',
    '  → JANGAN: visual_shock (kesan gimmick, gak kredibel untuk konten edukasi)',
    '',
    'Topik FOOD / TRAVEL / BEAUTY / FASHION / FITNESS / TECH / GAMING / UNBOXING:',
    '  → PRIMARY: visual_shock (Visual-first. Copenhagen study: surprise +400% dopamine)',
    '  → SECONDARY: speed_value (untuk recipe/tutorial) ATAU negative_bias (untuk review)',
    '  → JANGAN: relatability (terlalu casual untuk konten visual showcase)',
    '',
    'Topik LIFESTYLE / ENTERTAINMENT / COMEDY / DAILY LIFE / RELATIONSHIP / PARENTING:',
    '  → PRIMARY: relatability (Identity trigger: +91.7% engagement untuk "ini literally lo")',
    '  → SECONDARY: visual_shock (untuk momen high-energy) ATAU curiosity_gap (untuk cerita)',
    '  → JANGAN: negative_bias (kesan menggurui untuk konten lifestyle)',
    '',
    'Topik STORYTELLING / CASE STUDY / MOTIVATION / PRODUCT LAUNCH / PERSONAL STORY:',
    '  → PRIMARY: curiosity_gap (Sephora: reveal hook +41% watch time, +27% engagement)',
    '  → SECONDARY: relatability (untuk cerita personal) ATAU negative_bias (untuk warning)',
    '  → JANGAN: speed_value (viewer mau diajak bercerita, bukan dikasih tips cepat)',
    '',
    'Topik TUTORIAL / TIPS / HACKS / HOW-TO / DIY / RECIPE / PRODUCTIVITY:',
    '  → PRIMARY: speed_value (List-based hooks 2.5x lebih sering di-save/share)',
    '  → SECONDARY: negative_bias ("kesalahan yang bikin gagal" = strong opener)',
    '  → JANGAN: curiosity_gap (viewer mau value langsung, bukan delayed reveal)',
    '',
    'Topik PRODUCT REVIEW / COMPARISON:',
    '  → PRIMARY: negative_bias ("Jangan beli sebelum nonton ini!" = loss aversion)',
    '  → SECONDARY: speed_value ("3 hal yang harus lo tau sebelum beli")',
    '  → JANGAN: relatability (terlalu casual untuk konten review)',
  ],
  english: [
    'TOPIC-BASED HOOK SELECTION RULES (MUST FOLLOW):',
    '',
    'Topics: EDUCATION / FINANCE / CODING / BUSINESS / HEALTH / SELF-IMPROVEMENT:',
    '  → PRIMARY: negative_bias (Problem-focused hooks 2:1 outperform generic advice)',
    '  → SECONDARY: speed_value (for tips/tutorial within these niches)',
    '  → AVOID: visual_shock (feels gimmicky, undermines credibility for educational content)',
    '',
    'Topics: FOOD / TRAVEL / BEAUTY / FASHION / FITNESS / TECH / GAMING / UNBOXING:',
    '  → PRIMARY: visual_shock (Visual-first. Copenhagen study: surprise +400% dopamine)',
    '  → SECONDARY: speed_value (for recipes/tutorials) OR negative_bias (for reviews)',
    '  → AVOID: relatability (too casual for visual showcase content)',
    '',
    'Topics: LIFESTYLE / ENTERTAINMENT / COMEDY / DAILY LIFE / RELATIONSHIP / PARENTING:',
    '  → PRIMARY: relatability (Identity trigger: +91.7% engagement for "this is literally you")',
    '  → SECONDARY: visual_shock (for high-energy moments) OR curiosity_gap (for stories)',
    '  → AVOID: negative_bias (feels preachy for lifestyle content)',
    '',
    'Topics: STORYTELLING / CASE STUDY / MOTIVATION / PRODUCT LAUNCH / PERSONAL STORY:',
    '  → PRIMARY: curiosity_gap (Sephora: reveal hooks +41% watch time, +27% engagement)',
    '  → SECONDARY: relatability (for personal stories) OR negative_bias (for warnings)',
    '  → AVOID: speed_value (viewers want to be taken on a journey, not given quick tips)',
    '',
    'Topics: TUTORIAL / TIPS / HACKS / HOW-TO / DIY / RECIPE / PRODUCTIVITY:',
    '  → PRIMARY: speed_value (List-based hooks 2.5x more likely to be saved/shared)',
    '  → SECONDARY: negative_bias ("mistakes that are killing your results" = strong opener)',
    '  → AVOID: curiosity_gap (viewers want immediate value, not delayed reveals)',
    '',
    'Topics: PRODUCT REVIEW / COMPARISON:',
    '  → PRIMARY: negative_bias ("Don\'t buy until you watch this!" = loss aversion)',
    '  → SECONDARY: speed_value ("3 things you need to know before buying")',
    '  → AVOID: relatability (too casual for review content)',
  ],
  hindi: [
    'TOPIC KE HISAAB SE HOOK SELECTION (YE FOLLOW KARNA ZAROORI HAI):',
    '',
    'Topics: EDUCATION / FINANCE / CODING / BUSINESS / HEALTH / SELF-IMPROVEMENT:',
    '  → PRIMARY: negative_bias (Problem-focused hooks 2:1 better than generic advice)',
    '  → SECONDARY: speed_value (niche ke andar tips/tutorial ke liye)',
    '  → MAT KARO: visual_shock (gimmicky lagta hai, educational content ki credibility girti hai)',
    '',
    'Topics: FOOD / TRAVEL / BEAUTY / FASHION / FITNESS / TECH / GAMING / UNBOXING:',
    '  → PRIMARY: visual_shock (Visual-first. Copenhagen study: surprise +400% dopamine)',
    '  → SECONDARY: speed_value (recipe/tutorial ke liye) YA negative_bias (review ke liye)',
    '  → MAT KARO: relatability (visual showcase ke liye bahut casual)',
    '',
    'Topics: LIFESTYLE / ENTERTAINMENT / COMEDY / DAILY LIFE / RELATIONSHIP / PARENTING:',
    '  → PRIMARY: relatability (Identity trigger: +91.7% engagement "ye literally tum ho" ke liye)',
    '  → SECONDARY: visual_shock (high-energy moments ke liye) YA curiosity_gap (stories ke liye)',
    '  → MAT KARO: negative_bias (lifestyle content ke liye lecture jaisa lagta hai)',
    '',
    'Topics: STORYTELLING / CASE STUDY / MOTIVATION / PRODUCT LAUNCH / PERSONAL STORY:',
    '  → PRIMARY: curiosity_gap (Sephora: reveal hooks +41% watch time, +27% engagement)',
    '  → SECONDARY: relatability (personal stories ke liye) YA negative_bias (warning ke liye)',
    '  → MAT KARO: speed_value (viewer ko journey pe le jaana hai, quick tips nahi dena)',
    '',
    'Topics: TUTORIAL / TIPS / HACKS / HOW-TO / DIY / RECIPE / PRODUCTIVITY:',
    '  → PRIMARY: speed_value (List-based hooks 2.5x zyada save/share hote hain)',
    '  → SECONDARY: negative_bias ("galtiyaan jo results barbaad kar rahi hain" = strong opener)',
    '  → MAT KARO: curiosity_gap (viewer ko turant value chahiye, delayed reveal nahi)',
    '',
    'Topics: PRODUCT REVIEW / COMPARISON:',
    '  → PRIMARY: negative_bias ("Ye mat kharido jab tak ye nahi dekh lo!" = loss aversion)',
    '  → SECONDARY: speed_value ("3 cheezein jo kharidne se pehle jaanno")',
    '  → MAT KARO: relatability (review content ke liye bahut casual)',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 2026 RETENTION ANTI-PATTERNS
// ═══════════════════════════════════════════════════════════════

const ANTI_PATTERNS: Record<string, string[]> = {
  indonesian: [
    'HOCKEY STICK: Hook kuat tapi abis itu langsung turun — gak ada pattern interrupt, gak ada foreshadow → viewer pergi di detik 5',
    'GRADUAL BLEED: Monotone, gak ada variasi energi — flat line emotion → otak bosen, auto scroll',
    'CAMEL HUMPS: Naik turun random tanpa build-up — gak ada emotional arc → viewer confuse, gak engaged',
  ],
  english: [
    'HOCKEY STICK: Strong hook but immediate drop-off — no pattern interrupt, no foreshadow → viewers leave at second 5',
    'GRADUAL BLEED: Monotone, no energy variation — flat line emotion → brain habituates, auto scroll',
    'CAMEL HUMPS: Random up-down without build-up — no emotional arc → viewer confused, not engaged',
  ],
  hindi: [
    'HOCKEY STICK: Hook acha lekin fir seedha girawat — koi pattern interrupt nahi, koi foreshadow nahi → viewer 5 second mein chala jaata hai',
    'GRADUAL BLEED: Ek sur mein, koi energy variation nahi — flat line emotion → dimaag bore, auto scroll',
    'CAMEL HUMPS: Random upar-neeche bina build-up ke — koi emotional arc nahi → viewer confused, engaged nahi',
  ],
};

// ═══════════════════════════════════════════════════════════════
// HUMAN-READABLE FEATURE NAMES
// ═══════════════════════════════════════════════════════════════

const FEATURE_NAMES: Record<string, string> = {
  has_question: 'Question Hook',
  has_number: 'Number/Statistic',
  has_power_word: 'Power Word',
  has_negative_frame: 'Negative Framing',
  word_density_optimal: 'Word Density (60-95%)',
  under_word_limit: 'Under Word Limit',
  has_pattern_interrupt: 'Pattern Interrupt',
  matches_hook_category: 'Hook Category Match',
  payoff_not_revealed: 'Curiosity Gap (No Payoff Reveal)',
  has_foreshadow: 'Foreshadow/Open Loop',
  has_transition: 'Smooth Transition',
  builds_on_hook: 'Builds on Hook',
  has_specific_detail: 'Specific Detail',
  has_transition_word: 'Transition Word',
  has_value_delivery: 'Value Delivery',
  has_emotional_climax: 'Emotional Climax',
  has_unexpected_twist: 'Unexpected Twist',
  has_specific_proof: 'Specific Proof/Data',
  emotional_intensity_high: 'High Emotional Intensity',
  has_clear_action: 'Clear CTA Action Verb',
  first_person: 'First-Person CTA',
  single_focus: 'Single Focus (ONE CTA)',
  has_urgency_word: 'Urgency Word',
  matches_funnel_stage: 'Funnel Stage Match',
  mirrors_hook_energy: 'Mirrors Hook Energy',
  has_callback: 'Callback to Hook',
  emotional_match: 'Emotion Match with Hook',
};

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a scoring optimization prompt block for the LLM.
 * Reads all weights from SCORING_RULES programmatically.
 * Enhanced with 2026 algorithm intelligence and proven patterns.
 *
 * @param language - 'indonesian' | 'english' | 'hindi'
 * @returns Prompt text string for Component 18
 */
export function getScoringOptimizationRules(language: string): string {
  const lang = language === 'id' ? 'indonesian' : language === 'hi' ? 'hindi' : language === 'en' ? 'english' : language;
  const examples = FEATURE_EXAMPLES[lang] || FEATURE_EXAMPLES.english;
  const hookGuide = HOOK_CATEGORY_GUIDE[lang] || HOOK_CATEGORY_GUIDE.english;
  const antiPatterns = ANTI_PATTERNS[lang] || ANTI_PATTERNS.english;
  const topicHookRules = TOPIC_HOOK_SELECTION_RULES[lang] || TOPIC_HOOK_SELECTION_RULES.english;

  const segmentOrder: SegmentType[] = ['HOOK', 'FORE', 'BODY', 'PEAK', 'CTA', 'LOOP-END'];

  const segmentBlocks = segmentOrder.map(segType => {
    const rules = SCORING_RULES[segType];
    if (!rules) return '';

    // Sort features by weight descending (highest impact first)
    const sortedFeatures = Object.entries(rules)
      .sort(([, a], [, b]) => b.weight - a.weight);

    const totalWeight = sortedFeatures.reduce((sum, [, r]) => sum + r.weight, 0);

    const featureLines = sortedFeatures.map(([key, rule]) => {
      const name = FEATURE_NAMES[key] || key;
      const example = examples[key] || '';
      return `  • ${name} (${rule.weight}/${totalWeight} pts)${example ? ` → ${example}` : ''}`;
    }).join('\n');

    return `**${segType}** (max ${totalWeight} pts):\n${featureLines}`;
  }).filter(Boolean).join('\n\n');

  const hookGuideText = hookGuide.map((p, i) => `  ${i + 1}. ${p}`).join('\n');
  const antiPatternsText = antiPatterns.map(p => `  ✗ ${p}`).join('\n');
  const topicHookText = topicHookRules.map(line => line ? `  ${line}` : '').join('\n');

  return `
═══════════════════════════════════════════════════════════════
📊 SCORING OPTIMIZATION RULES (Component 18) — 2026 Algorithm Intelligence
═══════════════════════════════════════════════════════════════

⚠️ CRITICAL 2026 ALGORITHM DATA (your script will be scored against these):
• 71% of viewers decide to stay or leave in the FIRST 3 SECONDS
• 70%+ completion rate = algorithmic boost (under 70% = suppressed distribution)
• Shares are weighted 3X HIGHER than likes — write for shareability, not just engagement
• Saves signal reference-worthy content — the algorithm values saves heavily
• Scrolling away within 2 seconds = STRONG negative signal → your hook failed
• Pattern interrupts every 5-8 seconds "bump" retention back up
• The "50% Rule": keep 50% of your audience watching until the last second = viral territory
• 80% completion with 10K views OUTPERFORMS 20% completion with 100K views

Your script will be scored AUTOMATICALLY by a scoring engine after generation.
Each segment is scored independently. Target: 90+ per segment, 90+ overall.
Features are listed in order of impact (highest first).

${segmentBlocks}

═══════════════════════════════════════════════════════════════
🎯 5 HOOK CATEGORIES — each has its own optimal feature mix:
═══════════════════════════════════════════════════════════════
${hookGuideText}

SCORING IS ADDITIVE: Each feature (question, number, power word, negative frame) earns bonus points.
The MORE features you include, the HIGHER the score.
- Power words are ALWAYS beneficial (any category) — EVERY hook MUST have at least 1
- Numbers boost ANY hook (+36% CTR) — EVERY hook MUST include a number
- Questions create open loops (+23.3% shares) — STRONGLY recommended for 90%+ score
- Negative frames trigger loss aversion (+63% CTR) — powerful for education/warning topics

⚠️ FOR 90+ HOOK SCORE (MANDATORY):
HOOK needs ALL of these: number + power word + pattern interrupt + under word limit + good density (60-95%)
PLUS at least 2 of: question(?), negative frame, curiosity gap (no payoff revealed)
Example: "3 KESALAHAN fatal yang bikin brand lo GAGAL di Metaverse 2026?" = number(3) + power word(FATAL/GAGAL) + negative frame(KESALAHAN/GAGAL) + question(?) + pattern interrupt(ALL CAPS) = 90%+ score

═══════════════════════════════════════════════════════════════
🎯 TOPIC → HOOK CATEGORY MATCHING (CRITICAL — choose the RIGHT hook for the topic):
═══════════════════════════════════════════════════════════════
${topicHookText}

IMPORTANT: Analyze the user's topic FIRST, then select the PRIMARY hook category.
Use SECONDARY only when generating hook variants (Safe/Bold/Visual).
NEVER use a hook category from the AVOID list — it will feel off-brand and lower retention.
When the topic spans multiple categories, use the PRIMARY of the DOMINANT category.

═══════════════════════════════════════════════════════════════
📈 PROGRESSIVE VALUE DELIVERY (the retention architecture):
═══════════════════════════════════════════════════════════════
HOOK  → Scroll-stopping promise (MUST score 90+, this decides EVERYTHING)
        CRITICAL: NEVER reveal tool/product names here — tease with quantity + category ("3 AI tools")
        The HOOK creates the question, BODY/PEAK delivers the answer.
FORE  → Foreshadow + value promise — "But wait, the last one is the craziest..."
BODY  → Each body segment delivers ESCALATING value (insight 2 > insight 1)
        ⚠️ THIS IS THE PAYOFF: You MUST name the specific tool/product/answer here!
        "Pertama: Jasper AI buat copywriting" ← GOOD (names the tool)
        "Pertama: AI copywriting tool" ← BAD (vague, no specifics = broken promise)
        Each BODY reveals ONE item by name. HOOK teases → BODY delivers.
        MUST include a pattern interrupt phrase to "bump" retention
PEAK  → Highest emotional intensity — the "share trigger" moment
        This is where viewers decide to SHARE (3x more valuable than likes)
CTA   → Single, specific action — "Comment 'STRATEGY' below" not "let us know"
LOOP  → Seamless energy match with HOOK — the "looping hack" for 100%+ retention

═══════════════════════════════════════════════════════════════
🚫 ANTI-PATTERNS (these KILL retention — avoid at all costs):
═══════════════════════════════════════════════════════════════
${antiPatternsText}

The IDEAL emotion arc is "ROLLER COASTER": High energy → dip → build → CLIMAX → warm.
This pattern has the highest completion rate across all platforms.

═══════════════════════════════════════════════════════════════
⚡ POWER WORD BANK — Use 3-5 per script minimum (scorer DETECTS these):
═══════════════════════════════════════════════════════════════

${lang === 'indonesian' ? `🇮🇩 Indonesian Power Words (HIGH IMPACT — use in CAPS for max score):
  Urgency: SEKARANG, BURUAN, WAJIB, terakhir, habis
  Negative: JANGAN, BAHAYA, FATAL, SALAH, GAGAL, RUGI, toxic, scam, KESALAHAN
  Curiosity: RAHASIA, ternyata, tau gak, baru tau, sebenarnya
  Value: GRATIS, terbukti, hack, game changer
  Emotional: GILA, PARAH, SHOCKING, brutal, dahsyat, gokil, merinding, epic, INSANE` :
lang === 'hindi' ? `🇮🇳 Hindi Power Words (HIGH IMPACT — use in CAPS for max score):
  Urgency: ABHI, JALDI, AAKHRI, limited
  Negative: GALTI, DHOKHA, KHATARA, MAT, scam
  Curiosity: SACH, RAAZ, ASLI, pata hai
  Value: FREE, JUGAAD, hack, tarika
  Emotional: SHOCKING, INSANE, FADU, JHAKKAS, sach mein` :
`🇺🇸 English Power Words (HIGH IMPACT — use in CAPS for max score):
  Urgency: NOW, TODAY, LIMITED, last chance, deadline
  Negative: NEVER, WORST, STOP, WARNING, MISTAKE, FAIL, DEAD
  Curiosity: SECRET, HIDDEN, TRUTH, EXPOSED, actually, INSANE
  Value: FREE, PROVEN, GUARANTEED, HACK, save
  Emotional: SHOCKING, CRAZY, UNBELIEVABLE, literally`}

The scorer regex-detects these EXACT words. Using them = guaranteed points.
Scatter 3-5 power words across the script (at least 1 per HOOK, BODY, PEAK).

═══════════════════════════════════════════════════════════════
🔗 BUILDS-ON-HOOK RULE — FORE/BODY MUST reference HOOK keywords:
═══════════════════════════════════════════════════════════════

The scorer checks KEYWORD OVERLAP between HOOK text and FORE/BODY text.
FORE and each BODY segment MUST contain at least 1-2 keywords from the HOOK.

Examples:
  HOOK: "3 KESALAHAN branding yang bikin lo GAGAL"
  → FORE must contain "kesalahan" OR "branding" OR "gagal"
  → BODY must contain "kesalahan" OR "branding" (delivering on the promise)

  HOOK: "5 AI tools yang LITERALLY ganti kerjaan gue"
  → FORE must contain "AI" OR "tools" OR "kerjaan"
  → BODY must name specific tools (payoff)

If FORE/BODY don't reference HOOK keywords, the "builds_on_hook" score drops to 0.

═══════════════════════════════════════════════════════════════
🔀 TRIPLE HOOK COHERENCE — All 3 hooks MUST share topic keywords:
═══════════════════════════════════════════════════════════════

FORE/BODY/PEAK/CTA are written ONCE but the user can switch between 3 hook options.
If hooks use completely different keywords, FORE won't connect → score drops.

RULE: Extract 2-3 CORE TOPIC KEYWORDS from the topic. ALL 3 hooks must contain these SAME keywords.
Each hook just frames them differently (safe angle, negative angle, visual angle).

Example — Topic: "3 kesalahan branding pribadi"
  Core keywords: "kesalahan", "branding"
  ✅ Safe:    "3 KESALAHAN branding pribadi yang bikin lo gagal..."
  ✅ Negative: "STOP! 3 KESALAHAN branding pribadi ini FATAL..."
  ✅ Visual:   "[Close-up] 3 KESALAHAN branding pribadi yang gak ada yang berani bilang..."
  ❌ Bad B:    "Lo masih lakuin ini? Karir lo dalam BAHAYA..." (missing topic keywords!)

Why: FORE says "kesalahan yang terakhir ini paling fatal" — if hook B doesn't mention
"kesalahan", switching to it breaks the narrative. User sees disconnected script.

═══════════════════════════════════════════════════════════════
✅ MANDATORY 90%+ SCORING CHECKLIST (every script MUST pass ALL):
═══════════════════════════════════════════════════════════════

🎯 HOOK (target: 90+, this decides EVERYTHING — 30% of overall score):
□ Contains a SPECIFIC NUMBER ("3 cara", "5 tips", "24 jam") — worth 15pts
□ Contains a QUESTION mark or question word ("tau gak?", "gimana?", "pernah?") — worth 12pts
□ Contains at least 1 POWER WORD in CAPS or emotional ("GILA", "SHOCKING", "FATAL", "literally") — worth 10pts
□ Does NOT reveal tool/product names (tease with "3 AI tools", not "Jasper, CapCut") — worth 10pts
□ Word density 60-95% of max words (use enough words, not too few) — worth 10pts
□ Under word limit — worth 8pts
□ Has pattern interrupt element (ALL CAPS word, "But wait...", or direct address "Lo bakal...") — worth 7pts

🔮 FORE (target: 85+, locks viewer in — 10% of overall):
□ Contains foreshadow/open loop phrase ("tapi yang terakhir ini...", "but the best part...") — worth 15pts
□ Keywords from HOOK appear (references the promise) — worth 12pts
□ Specific detail: number, name, or measurement — worth 10pts
□ Word density 60-95% — worth 10pts
□ Starts with transition ("Nah", "Tapi", "Jadi gini") — worth 8pts

📦 BODY (target: 85+ each, main value delivery — 20% per segment):
□ Pattern interrupt EVERY segment ("Tapi tunggu...", ALL CAPS word, "ini yang gila...") — worth 15pts
□ Actionable value verb ("cara", "bikin", "ciptain", "step", "use", "buat") — worth 13pts
□ Specific concrete detail (tool NAME, percentage, measurement) — NEVER vague — worth 12pts
□ Word density 60-95% — worth 10pts
□ Transition word ("Pertama:", "Kedua:", "Tapi", "Nah", "Selanjutnya") — worth 5pts

🏔️ PEAK (target: 85+, the share-trigger moment — 20% of overall):
□ HIGHEST emotional intensity of entire script — use CAPS + superlatives ("PALING GILA", "MIND-BLOWING") — worth 18pts
□ Unexpected twist/reveal phrase ("ternyata...", "ini dia...", "yang bikin beda...") — worth 15pts
□ High emotional intensity words throughout — worth 12pts
□ Social proof with specific numbers ("100K orang udah buktiin", "40% profit") — worth 10pts
□ Word density 60-95% — worth 8pts

📣 CTA (target: 85+, conversion point — 15% of overall):
□ SINGLE focus — ONE action only, never multiple CTAs — worth 18pts
□ Clear action VERB ("follow", "save", "comment", "cek", "share") — worth 12pts
□ Under word limit (CTA must be concise) — worth 10pts
□ First-person framing ("Gue mau lo...", "Get my...") — worth 10pts
□ Urgency word ("sekarang", "today", "limited") — worth 8pts

🔄 LOOP-END (if present — 5% of overall):
□ Energy/emotion matches HOOK exactly — worth 20pts
□ Callback reference to HOOK ("Nah itu tadi...", "Ingat yang gue bilang?") — worth 15pts
□ Word density 60-95% — worth 10pts
□ Same emotion type as HOOK — worth 10pts

📏 ALL SEGMENTS:
□ Word density 60-95% of max words for ALL segments
□ Emotion arc follows "roller coaster" pattern (high→dip→build→CLIMAX→warm)
□ Each BODY segment more intense/valuable than the previous (stakes escalation)
`;
}
