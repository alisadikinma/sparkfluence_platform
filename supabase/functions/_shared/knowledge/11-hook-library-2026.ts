/**
 * HOOK LIBRARY 2026 — Master Edition
 * Converted from: public/Sparkfluence_Hook_Library_2026.md
 *
 * 100 high-retention hooks across 5 categories (20 each).
 * All hooks are English templates with [Placeholder]s.
 * The LLM transcreates them into the target language at generation time.
 *
 * Source of truth for: seefluencerFramework.ts → getLocalizedHookStrategy()
 */

export interface HookTemplate {
  id: number;
  script: string;
  visual_cue?: string; // Only visual_shock category has these
}

export type HookCategory =
  | 'visual_shock'
  | 'negative_bias'
  | 'curiosity_gap'
  | 'relatability'
  | 'speed_value';

export const HOOK_LIBRARY: Record<HookCategory, HookTemplate[]> = {

  // ═══════════════════════════════════════════════════════════════
  // 1. VISUAL SHOCK & PATTERN INTERRUPT
  // Objective: Stop scroll in <0.5s using non-verbal cues
  // Best For: Showcase, Travel, Food, Tech, High-Energy Vlogs
  // ═══════════════════════════════════════════════════════════════
  visual_shock: [
    { id: 1,  visual_cue: '[Camera: Start upside down -> Flip to normal]', script: 'The world is looking at this wrong.' },
    { id: 2,  visual_cue: '[Action: Pouring water/coffee on the product]', script: 'Stop babying your gear.' },
    { id: 3,  visual_cue: '[Camera: Extreme Close-up on Eye -> Zoom Out fast]', script: 'Pay attention.' },
    { id: 4,  visual_cue: '[Action: Rip a piece of paper in half]', script: 'Tear up your to-do list.' },
    { id: 5,  visual_cue: '[Visual: Green Screen of a crashing stock chart]', script: "It's all over." },
    { id: 6,  visual_cue: '[Action: Throw the object at the camera lens]', script: 'Garbage.' },
    { id: 7,  visual_cue: '[Visual: Black screen for 0.5s -> Bright light]', script: 'Wake up.' },
    { id: 8,  visual_cue: '[Camera: Shaking violently -> Stabilize]', script: "Chaos. That's your life right now." },
    { id: 9,  visual_cue: '[Visual: Text "DON\'T WATCH" flashing red]', script: 'I knew you would look.' },
    { id: 10, visual_cue: '[Action: Snap fingers -> Background changes]', script: 'Just like that.' },
    { id: 11, visual_cue: '[Visual: Split screen comparison (Good vs Bad)]', script: 'Which one are you?' },
    { id: 12, visual_cue: '[Action: Holding a match -> Light it]', script: 'Burn the boats.' },
    { id: 13, visual_cue: '[Camera: POV running fast]', script: 'We are running out of time.' },
    { id: 14, visual_cue: '[Visual: Object floating (fishing line trick)]', script: 'Physics is broken.' },
    { id: 15, visual_cue: '[Action: Slamming laptop shut]', script: "I'm done." },
    { id: 16, visual_cue: '[Visual: Typing on screen "Deleting Account..."]', script: 'Goodbye.' },
    { id: 17, visual_cue: '[Camera: 360-degree spin around subject]', script: 'Look at this from every angle.' },
    { id: 18, visual_cue: '[Visual: Blurred video -> Instantly sharp]', script: 'Focus.' },
    { id: 19, visual_cue: '[Action: Cutting a credit card]', script: 'Stop spending money.' },
    { id: 20, visual_cue: '[Visual: Phone notification pop-up "Bank Alert"]', script: 'This is what you want to see.' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 2. NEGATIVE BIAS & WARNINGS
  // Objective: Trigger "Loss Aversion" psychology
  // Best For: Education, Finance, Coding, Business, Health
  // ═══════════════════════════════════════════════════════════════
  negative_bias: [
    { id: 1,  script: 'Stop [Topic] like this immediately, you look like an amateur.' },
    { id: 2,  script: 'If you are still using [Old Tool] in 2026, you are officially behind.' },
    { id: 3,  script: 'The [Industry] Gurus are lying to you, and here is the proof.' },
    { id: 4,  script: "I probably shouldn't show you this, but it's too good to gatekeep." },
    { id: 5,  script: 'This is exactly why your [Business/Project] will fail in 6 months.' },
    { id: 6,  script: "Don't buy the [Popular Product] until you watch this." },
    { id: 7,  script: 'Most people are dead wrong about [Topic].' },
    { id: 8,  script: 'This serves as a warning to anyone trying to [Goal].' },
    { id: 9,  script: "Your [Skill] is useless if you don't know this one thing." },
    { id: 10, script: 'I wasted 5 years doing [Topic] the hard way.' },
    { id: 11, script: 'Why 99% of people fail at [Topic] before they even start.' },
    { id: 12, script: 'This is the uncomfortable truth about [Topic].' },
    { id: 13, script: 'Stop listening to your friends about [Topic].' },
    { id: 14, script: 'The biggest mistake I made in my 20s was...' },
    { id: 15, script: "If you ignore this, you're losing money every single day." },
    { id: 16, script: 'This advice might get me banned, but...' },
    { id: 17, script: "Stop scrolling if you don't want to hear the truth." },
    { id: 18, script: 'You have been doing [Topic] wrong your entire life.' },
    { id: 19, script: 'This tiny mistake is costing you [Amount/Result].' },
    { id: 20, script: "Nobody wants to admit this, but..." },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 3. CURIOSITY GAPS & INSIDER SECRETS
  // Objective: Create an "information itch" that must be scratched
  // Best For: Storytelling, Vlogs, Case Studies, Motivation
  // ═══════════════════════════════════════════════════════════════
  curiosity_gap: [
    { id: 1,  script: 'I found a glitch in the [Industry] matrix.' },
    { id: 2,  script: "This might be the most illegal [Topic] hack I've ever found." },
    { id: 3,  script: 'I tried [Hard Thing] for 30 days and the results scared me.' },
    { id: 4,  script: 'The secret [Topic] tool that [Famous Person] uses.' },
    { id: 5,  script: 'They said this was impossible, so I filmed it.' },
    { id: 6,  script: 'I broke into the [Industry] and found this.' },
    { id: 7,  script: 'What happens if you [Action] for 24 hours straight?' },
    { id: 8,  script: 'I challenged myself to [Goal] with $0 budget.' },
    { id: 9,  script: "The government/company doesn't want you to know this." },
    { id: 10, script: 'I asked AI to ruin my life, and this happened.' },
    { id: 11, script: 'This feels illegal to know.' },
    { id: 12, script: 'The dark side of [Popular Trend] nobody talks about.' },
    { id: 13, script: 'I stalked the top 1% of [Profession] and found a pattern.' },
    { id: 14, script: 'This $5 tool replaced my $5000 employee.' },
    { id: 15, script: 'How I tricked my brain into liking [Hated Task].' },
    { id: 16, script: 'I accidentally discovered a way to [Result].' },
    { id: 17, script: 'This is not clickbait: [Crazy Statement].' },
    { id: 18, script: 'The 3-second trick to change your [Life/Habit].' },
    { id: 19, script: "I tested every single [Product] so you don't have to." },
    { id: 20, script: 'The loophole that made me [Result].' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 4. RELATABILITY & IDENTITY
  // Objective: Identify the user ("That is literally me")
  // Best For: Lifestyle, General Entertainment, Comedy
  // ═══════════════════════════════════════════════════════════════
  relatability: [
    { id: 1,  script: 'POV: You finally figured out how to [Result] without [Pain].' },
    { id: 2,  script: "If you are a [Job Title] and you don't know this, you're in trouble." },
    { id: 3,  script: 'This video is only for people who want [Result] in 2026.' },
    { id: 4,  script: 'We need to talk about [Relatable Struggle].' },
    { id: 5,  script: 'If you live in [Place] or do [Activity], watch this.' },
    { id: 6,  script: 'To the person watching this at 2 AM...' },
    { id: 7,  script: 'If you have $0 in your bank account, this is for you.' },
    { id: 8,  script: 'Normalise [Unpopular Opinion].' },
    { id: 9,  script: 'Am I the only one who thinks [Topic] is a scam?' },
    { id: 10, script: 'Send this to a friend who needs to hear this.' },
    { id: 11, script: "If you can't focus for 30 seconds, this video will fix it." },
    { id: 12, script: 'For anyone feeling behind in life right now.' },
    { id: 13, script: 'Stop scrolling if you are [Age Group].' },
    { id: 14, script: 'This is your sign to start [Activity].' },
    { id: 15, script: "I don't know who needs to hear this, but..." },
    { id: 16, script: 'The exact day my life changed was when...' },
    { id: 17, script: 'Things I wish I knew before I started [Topic].' },
    { id: 18, script: 'My toxic trait is thinking I can [Impossible Task].' },
    { id: 19, script: 'Imagine if you started [Topic] one year ago.' },
    { id: 20, script: 'You are not lazy, you are just [Explanation].' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 5. SPEED & VALUE PROMISE
  // Objective: High ROI on time invested
  // Best For: Tutorials, Quick Tips, Hacks
  // ═══════════════════════════════════════════════════════════════
  speed_value: [
    { id: 1,  script: "Give me 30 seconds and I'll save you 30 hours." },
    { id: 2,  script: 'How to [Result] in 3 steps (No BS).' },
    { id: 3,  script: "The lazy person's guide to [Topic]." },
    { id: 4,  script: 'Master [Topic] in under 60 seconds.' },
    { id: 5,  script: 'Steal my exact strategy for [Result].' },
    { id: 6,  script: "You don't need [Expensive Thing], you just need this." },
    { id: 7,  script: 'Cheat code for [Topic] unlocked.' },
    { id: 8,  script: 'How to actually [Result] without trying hard.' },
    { id: 9,  script: 'The fastest way to [Result] known to man.' },
    { id: 10, script: 'I can teach you [Skill] faster than a 4-year degree.' },
    { id: 11, script: 'Skip the tutorial, just do this.' },
    { id: 12, script: 'Copy-paste this workflow to get [Result].' },
    { id: 13, script: 'Do this every morning to fix [Problem].' },
    { id: 14, script: 'The only 3 apps you need for [Topic].' },
    { id: 15, script: 'Stop overcomplicating [Topic], it\'s this simple.' },
    { id: 16, script: 'From 0 to [Result] in record time.' },
    { id: 17, script: 'Instant fix for [Common Problem].' },
    { id: 18, script: 'How to automate your [Task] completely.' },
    { id: 19, script: 'The 80/20 rule applied to [Topic].' },
    { id: 20, script: 'Solve [Problem] while you sleep.' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY METADATA (for prompt instructions)
// ═══════════════════════════════════════════════════════════════

export const HOOK_CATEGORY_META: Record<HookCategory, {
  name: string;
  objective: string;
  best_for: string;
  avoid_for: string;
  psychological_trigger: string;
  evidence: string;
  curiosity_principle: string;
}> = {
  visual_shock: {
    name: 'Visual Shock & Pattern Interrupt',
    objective: 'Stop the scroll in <0.5 seconds using non-verbal cues',
    best_for: 'Showcase, Travel, Food, Tech, Unboxing, Beauty, Fashion, Fitness, Gaming, High-Energy Vlogs',
    avoid_for: 'Education (deep-dive), B2B, Finance (feels gimmicky)',
    psychological_trigger: 'Pattern Interrupt — breaks autopilot scrolling with unexpected visual',
    evidence: 'TokPortal Q2-2025: Visual Jump Shock 131% AR across 127 accounts. Copenhagen neuro study: surprise +400% dopamine vs neutral. OpusClip: pattern interrupts "hijack attention before conscious decision". DriveEditor: 85% watch muted → visual-first hooks perform without sound.',
    curiosity_principle: 'Show a dramatic visual result WITHOUT naming the method/product. E.g., show an incredible outcome → viewer must watch to learn HOW.',
  },
  negative_bias: {
    name: 'Negative Bias & Warnings',
    objective: 'Trigger Loss Aversion psychology',
    best_for: 'Education, Finance, Coding, Business, Health, Self-Improvement, Product Reviews, Marketing',
    avoid_for: 'Comedy, Lifestyle (feels preachy), Entertainment (kills the vibe)',
    psychological_trigger: 'Negativity Bias — brain prioritizes threats/warnings over positive info',
    evidence: 'Virvid: Problem-Focused hooks 2:1 outperform generic advice. Nike Q2-2025: problem/solution hooks +48% retention, +32% product page visits. TokPortal: Controversial Hot Take 122% AR (143% US, 124% DE, 117% FR). Kahneman: loss aversion 2x stronger than gain.',
    curiosity_principle: 'Name the PROBLEM or MISTAKE, never the SOLUTION. E.g., "3 fatal mistakes killing your growth" NOT "Stop using X, Y, Z — they\'re killing your growth".',
  },
  curiosity_gap: {
    name: 'Curiosity Gaps & Insider Secrets',
    objective: 'Create an information itch that must be scratched',
    best_for: 'Storytelling, Vlogs, Case Studies, Motivation, Product Launch, Mystery/Reveal, Personal Stories',
    avoid_for: 'Tutorial/Quick Tips (viewers want instant value, not delayed reveals)',
    psychological_trigger: 'Curiosity Gap — incomplete information the brain cannot ignore',
    evidence: 'Sephora May-2025: blurred→reveal = +41% watch time, +27% engagement. Buffer: "Curiosity drives people, discomfort of not knowing entices engagement". Virvid: Mystery Hook 22M+ views, 70%+ completion. FOMO Hook +83% comment rate.',
    curiosity_principle: 'NEVER reveal the specific answer/tool/product in the HOOK. Use quantity + category teasers: "3 AI tools" NOT "Jasper, CapCut, Pionex". The open loop MUST remain open until BODY/PEAK.',
  },
  relatability: {
    name: 'Relatability & Identity',
    objective: 'Make viewer think "That is literally me"',
    best_for: 'Lifestyle, Entertainment, Comedy, Daily Life, Relationship, Parenting, Work/Career',
    avoid_for: 'B2B/Professional (too casual), Deep Educational Content (not enough structure)',
    psychological_trigger: 'Identity Trigger — viewer feels seen, compelled to engage/share',
    evidence: 'Virvid: Direct Call-Out hooks +91.7% engagement when addressing specific situations. OpusClip: raw/authentic content +31% engagement vs polished production. Brandefy: "Self-Identification — viewers continue when personally recognized".',
    curiosity_principle: 'Describe the SITUATION, not the solution. E.g., "This is literally you every morning" → viewer stays to see what the solution/punchline is.',
  },
  speed_value: {
    name: 'Speed & Value Promise',
    objective: 'Maximize ROI on time invested',
    best_for: 'Tutorials, Quick Tips, Hacks, How-To, Productivity, DIY, Recipes, Marketing Tips',
    avoid_for: 'Entertainment/Comedy (too transactional), Emotional Storytelling (kills the mood)',
    psychological_trigger: 'Value Promise — specific outcome in exchange for viewer attention',
    evidence: 'Virvid: List-Based hooks 2.5x more likely to be saved/shared. Transformation hooks +217% lead generation. WolfPack: value proposition must land in 5-10s. DriveEditor: number-heavy hooks work visually (85% muted).',
    curiosity_principle: 'Promise the RESULT, not the METHOD. E.g., "3 hacks to go viral in 24 hours" NOT "Use CapCut, Canva, and Buffer to go viral". The tools/steps are the payoff in BODY.',
  },
};

/**
 * TOPIC → HOOK CATEGORY MATCHING MAP
 *
 * Research-backed mapping of content topics to optimal hook categories.
 * PRIMARY = best match, SECONDARY = good alternative for variety.
 *
 * Sources: OpusClip TikTok 2026, TokPortal Q2-2025 (127 accounts),
 * Virvid 2026, Buffer, DriveEditor, WolfPack, Brandefy psychology.
 */
export const TOPIC_HOOK_MAP: Record<string, {
  primary: HookCategory;
  secondary: HookCategory;
  avoid: HookCategory;
  reason: string;
}> = {
  // === EDUCATION & KNOWLEDGE ===
  education:       { primary: 'negative_bias',  secondary: 'speed_value',   avoid: 'visual_shock',  reason: 'Problem-focused hooks 2:1 outperform generic advice. Bold statements work for debunking myths.' },
  finance:         { primary: 'negative_bias',  secondary: 'curiosity_gap', avoid: 'relatability',  reason: 'Loss aversion 2x stronger for financial topics. "Mistakes costing you money" = 48% higher retention.' },
  coding:          { primary: 'negative_bias',  secondary: 'speed_value',   avoid: 'relatability',  reason: '"Stop doing X wrong" + "3 tips in 30s" = highest retention for dev content.' },
  business:        { primary: 'negative_bias',  secondary: 'curiosity_gap', avoid: 'visual_shock',  reason: 'Contrarian statements = niche leader positioning. TokPortal: Hot Take 122% AR for business.' },
  health:          { primary: 'negative_bias',  secondary: 'relatability',  avoid: 'visual_shock',  reason: 'Health warnings trigger loss aversion. Relatability adds "I feel this" connection.' },
  self_improvement:{ primary: 'negative_bias',  secondary: 'curiosity_gap', avoid: 'visual_shock',  reason: 'Problem-focused doubles engagement. Curiosity gap for "secrets nobody tells you".' },
  science:         { primary: 'curiosity_gap',  secondary: 'negative_bias', avoid: 'relatability',  reason: '"Did you know?" creates information itch. Mystery hooks = 22M+ views, 70%+ completion.' },

  // === LIFESTYLE & ENTERTAINMENT ===
  lifestyle:       { primary: 'relatability',   secondary: 'curiosity_gap', avoid: 'negative_bias', reason: 'Identity trigger: +91.7% engagement for "this is literally you" hooks.' },
  entertainment:   { primary: 'relatability',   secondary: 'visual_shock',  avoid: 'negative_bias', reason: 'Authentic/raw content +31% engagement. Visual shock for high-energy moments.' },
  comedy:          { primary: 'relatability',   secondary: 'visual_shock',  avoid: 'speed_value',   reason: 'Self-identification drives sharing. Visual shock for physical comedy/surprise.' },
  daily_life:      { primary: 'relatability',   secondary: 'curiosity_gap', avoid: 'speed_value',   reason: '"POV: you at midnight..." hooks = self-identification + shareability.' },
  relationship:    { primary: 'relatability',   secondary: 'negative_bias', avoid: 'speed_value',   reason: 'Relatable situations + "mistakes you\'re making" = high comment engagement.' },
  parenting:       { primary: 'relatability',   secondary: 'negative_bias', avoid: 'visual_shock',  reason: '"Every parent when..." = identity hook. Warning hooks for parenting mistakes.' },
  career:          { primary: 'relatability',   secondary: 'negative_bias', avoid: 'visual_shock',  reason: 'Work culture relatability + career mistake warnings.' },

  // === VISUAL-FIRST CONTENT ===
  food:            { primary: 'visual_shock',   secondary: 'speed_value',   avoid: 'negative_bias', reason: 'Food visuals stop scroll instantly. Speed value for recipes ("5-min meal").' },
  travel:          { primary: 'visual_shock',   secondary: 'curiosity_gap', avoid: 'negative_bias', reason: 'Stunning visuals +400% dopamine (surprise). Curiosity for "hidden gems".' },
  fitness:         { primary: 'visual_shock',   secondary: 'negative_bias', avoid: 'curiosity_gap', reason: 'High-energy visual hooks + "mistakes killing your gains" = dual approach.' },
  beauty:          { primary: 'visual_shock',   secondary: 'speed_value',   avoid: 'negative_bias', reason: 'Before/after visual shock. Sephora: reveal hooks +41% watch time.' },
  fashion:         { primary: 'visual_shock',   secondary: 'relatability',  avoid: 'speed_value',   reason: 'Style showcase = visual-first. Relatability for outfit struggles.' },
  gaming:          { primary: 'visual_shock',   secondary: 'relatability',  avoid: 'negative_bias', reason: 'Gameplay moments = visual shock. Relatability for "gamer moments".' },
  tech:            { primary: 'visual_shock',   secondary: 'negative_bias', avoid: 'relatability',  reason: 'Product demos = visual-first. "Don\'t buy until you see this" = loss aversion.' },
  unboxing:        { primary: 'visual_shock',   secondary: 'curiosity_gap', avoid: 'speed_value',   reason: 'Physical reveal = visual shock. Curiosity for "what\'s inside?".' },

  // === STORY & CASE STUDY ===
  storytelling:    { primary: 'curiosity_gap',  secondary: 'relatability',  avoid: 'speed_value',   reason: 'Open loops = 70%+ completion. Sephora: delayed reveal +41% watch time.' },
  case_study:      { primary: 'curiosity_gap',  secondary: 'negative_bias', avoid: 'visual_shock',  reason: '"What happened when I tried X..." = irresistible curiosity.' },
  motivation:      { primary: 'curiosity_gap',  secondary: 'negative_bias', avoid: 'speed_value',   reason: '"I found a secret nobody tells you" = 83% higher comments.' },
  product_launch:  { primary: 'curiosity_gap',  secondary: 'visual_shock',  avoid: 'speed_value',   reason: 'Sephora model: blurred→reveal = +41% watch time, +27% engagement.' },
  personal_story:  { primary: 'curiosity_gap',  secondary: 'relatability',  avoid: 'speed_value',   reason: 'Confessional open loops. Transformation hooks +217% lead generation.' },

  // === TUTORIAL & VALUE ===
  tutorial:        { primary: 'speed_value',    secondary: 'negative_bias', avoid: 'curiosity_gap', reason: 'List-based hooks 2.5x saves. WolfPack: value proposition in 5-10s.' },
  tips:            { primary: 'speed_value',    secondary: 'negative_bias', avoid: 'curiosity_gap', reason: '"3 hacks in 30 seconds" = clear value promise + number boost.' },
  hacks:           { primary: 'speed_value',    secondary: 'visual_shock',  avoid: 'relatability',  reason: 'Number + value promise. Visual shock for "wait, that actually works?!".' },
  diy:             { primary: 'speed_value',    secondary: 'visual_shock',  avoid: 'negative_bias', reason: '"How I built this in 10 minutes" = value + visual demonstration.' },
  productivity:    { primary: 'speed_value',    secondary: 'negative_bias', avoid: 'visual_shock',  reason: '"5 tools that 10x your output" = promise hooks get highest saves.' },
  recipe:          { primary: 'speed_value',    secondary: 'visual_shock',  avoid: 'negative_bias', reason: '"3-ingredient meal in 5 min" = speed value. Food visuals = bonus.' },
  marketing:       { primary: 'speed_value',    secondary: 'negative_bias', avoid: 'visual_shock',  reason: 'Actionable tips = highest engagement. "Mistakes killing your reach" = strong secondary.' },
  product_review:  { primary: 'negative_bias',  secondary: 'speed_value',   avoid: 'relatability',  reason: '"Don\'t buy until you watch this" = loss aversion drives full watch.' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL ACTION BANK 2026 — Video-First Absurd/Unexpected Opening Actions
// ═══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE: Stop-scroll opening motion for short video 9:16 (TikTok/Reels/Shorts).
// Unlike static carousel images, these are MOTION-based actions that peak at frame 0-0.5s.
// Each entry specifies what the creator physically does to trigger visual curiosity.
//
// Source: Adapted from carousel plugin's visual hook bank → translated to video motion.
// Psychology: Absurd-mundane contrast creates involuntary attention (orienting reflex).
//
// ═══════════════════════════════════════════════════════════════════════════════

export interface VisualAction {
  id: string;
  name: string;
  description: string;
  videoAction: string;       // What creator physically does (motion, not static pose)
  promptFragment: string;    // Ready-to-use LLM fragment for visual_direction field
  bestFor: string[];         // Topic categories where this works best
  psychologyNote: string;    // Why this stops the scroll
  evidence: string;          // Data / reference supporting effectiveness
}

export const VISUAL_ACTION_BANK: VisualAction[] = [
  // ─── FOOD & EATING ───────────────────────────────────────────────────────
  {
    id: 'makan_nyeleneh',
    name: 'Absurd Eating',
    description: 'Mid-bite snap-to-camera — interrupts a universal mundane action',
    videoAction: 'Creator is mid-bite eating something unexpected (raw onion, huge spoonful, ice cream on pizza), then snaps gaze directly to camera with mouth still full',
    promptFragment: 'creator caught mid-bite eating [absurd food], eyes snap to camera wide-open with food still in mouth, frozen for 0.5s before speaking',
    bestFor: ['food', 'health', 'lifestyle', 'comedy', 'mukbang'],
    psychologyNote: 'Interrupts pattern of "normal eating" — brain flags it as anomaly and forces attention',
    evidence: 'Food anomaly hooks average 2.3x higher 3-second retention vs standard talking-head (TikTok Creator Insights 2025)',
  },
  {
    id: 'minum_dramatic',
    name: 'Dramatic Drink',
    description: 'Intense slow-motion drinking followed by hard stare',
    videoAction: 'Creator drinks something (coffee, energy drink, mysterious liquid) in exaggerated slow motion, then slams it down and locks eyes with camera with intense expression',
    promptFragment: 'creator lifts drink in slow deliberate motion, drinks with exaggerated intensity, slams cup down hard, locks piercing gaze into camera lens',
    bestFor: ['fitness', 'productivity', 'morning routine', 'health', 'motivation'],
    psychologyNote: '"What is that?" + intense gaze = dual curiosity trigger within 0.5s',
    evidence: 'Ritualistic props increase thumb-stop rate by 31% (Later.com Social Benchmark 2025)',
  },

  // ─── OBJECT INTERACTION ──────────────────────────────────────────────────
  {
    id: 'objek_absurd',
    name: 'Wrong Object',
    description: 'Holding or using a completely wrong/unexpected object for the topic',
    videoAction: 'Creator holds an object that makes zero sense for the video topic — uses it as if it is completely normal, then looks at camera as if confused why you are confused',
    promptFragment: 'creator casually holds [completely unrelated absurd object] as if normal, glances at camera with confused innocence, one eyebrow raised',
    bestFor: ['tutorial', 'education', 'finance', 'tech', 'productivity'],
    psychologyNote: 'Cognitive dissonance forces brain to resolve "why is that there?" — buys 2-3s of attention',
    evidence: 'Incongruity theory: mismatched objects generate 40% longer fixation (Nielsen Eye-Tracking 2024)',
  },
  {
    id: 'props_overflow',
    name: 'Props Overflow',
    description: 'Frame is completely stuffed with relevant objects — visual overwhelm',
    videoAction: 'Creator stands or sits surrounded by a chaotic pile of related items (books, gadgets, food, tools), all clearly visible, then calmly points at one specific item',
    promptFragment: 'creator surrounded by overflowing pile of [topic-related items], slight calm smile, points confidently at one single item amid the visual chaos',
    bestFor: ['product review', 'recommendations', 'shopping', 'cooking', 'travel'],
    psychologyNote: 'Visual overwhelm triggers "sorting reflex" — viewer scans to understand, extending watch time',
    evidence: 'Cluttered-frame thumbnails show 1.8x CTR vs clean frames for review content (VidIQ 2025)',
  },

  // ─── DESTRUCTION & IMPACT ────────────────────────────────────────────────
  {
    id: 'destruction',
    name: 'Destruction Opener',
    description: 'Creator destroys, breaks, or discards something dramatically at frame 0',
    videoAction: 'Creator slams, tears, smashes, or throws an object (paper, phone case, food, packaging) in first 0.5s, then turns to camera with calm or smug expression',
    promptFragment: 'creator mid-motion of destroying [object] — caught at peak impact moment, then pivots to camera with cool composed expression',
    bestFor: ['product review', 'debunking', 'motivation', 'finance', 'life advice'],
    psychologyNote: 'Destruction activates threat-detection response — visceral stop-scroll reaction',
    evidence: 'Destruction openers show 2.7x average watch-through rate for review content (TikTok Creator Academy 2025)',
  },

  // ─── SATISFYING PROCESS ──────────────────────────────────────────────────
  {
    id: 'satisfying_process',
    name: 'Satisfying Loop',
    description: 'Repetitive satisfying action interrupted by gaze — ASMR-adjacent hook',
    videoAction: 'Creator performs a visually satisfying repetitive action (slicing, folding, stacking, pouring), then abruptly stops and locks eyes with camera as if catching the viewer staring',
    promptFragment: 'creator paused mid-satisfying-action, caught in the act, making direct eye contact with camera with a knowing slight smile — "I know you were watching that"',
    bestFor: ['food', 'cooking', 'crafts', 'organization', 'cleaning', 'DIY'],
    psychologyNote: 'Interrupted completion creates Zeigarnik effect — viewer stays to see resolution',
    evidence: 'ASMR-pattern hooks retain 68% of audience past 15s (YouTube Analytics Cohort 2025)',
  },

  // ─── SCALE & PROPORTION ──────────────────────────────────────────────────
  {
    id: 'scale_absurd',
    name: 'Scale Shock',
    description: 'Object/portion that is absurdly large or tiny relative to normal expectation',
    videoAction: 'Creator reveals object of shocking scale — either gigantic (huge serving, oversized item) or microscopic (tiny version), with wide-eyed reaction to its own size',
    promptFragment: 'creator holds [extremely oversized / tiny] [item] at arm\'s length, eyes wide with genuine astonishment, looking between the object and camera incredulously',
    bestFor: ['food', 'product review', 'travel', 'shopping', 'comedy'],
    psychologyNote: 'Scale violation triggers orienting reflex — "is that real?" forces mental pause',
    evidence: 'Scale-surprise thumbnails generate 2.1x more comments vs standard product shots (Sprout Social 2025)',
  },

  // ─── CONTEXT MISMATCH ────────────────────────────────────────────────────
  {
    id: 'wrong_context',
    name: 'Wrong Context',
    description: 'Normal activity performed in a completely wrong setting or outfit',
    videoAction: 'Creator does something mundane (laptop work, eating, exercising) while wearing a completely incongruous outfit or being in the wrong location — acts totally normal about it',
    promptFragment: 'creator casually [doing normal activity] while dressed in [wildly inappropriate outfit/setting], completely unbothered, glances at camera with slight shrug',
    bestFor: ['lifestyle', 'productivity', 'fashion', 'comedy', 'travel', 'WFH'],
    psychologyNote: 'Context violation disrupts autopilot — viewer must resolve the mismatch',
    evidence: 'Out-of-context openers show 34% higher share rate — novelty drives "you have to see this" shares',
  },
  {
    id: 'era_clash',
    name: 'Era Clash',
    description: 'Modern topic delivered with retro/unexpected aesthetic',
    videoAction: 'Creator uses vintage/retro framing, props, or reference points to introduce a modern topic — acts as if this juxtaposition is completely normal',
    promptFragment: 'creator in [retro/vintage aesthetic] setting confidently presenting [modern topic], pointing to old-school visual elements while discussing cutting-edge ideas',
    bestFor: ['finance', 'tech', 'history', 'productivity', 'marketing'],
    psychologyNote: 'Temporal incongruity creates "wait, what year is this?" cognitive pause',
    evidence: 'Aesthetic contrast increases content shareability by 28% (Buffer 2025)',
  },

  // ─── FROZEN / SUSPENDED MOTION ───────────────────────────────────────────
  {
    id: 'frozen_mid_action',
    name: 'Frozen Mid-Action',
    description: 'Creator frozen in a physically impossible or awkward position, then snaps to normal',
    videoAction: 'Video opens with creator frozen mid-motion (mid-jump, mid-fall, mid-gesture, arm outstretched) for exactly 0.5s, then cuts to normal speaking position as if nothing happened',
    promptFragment: 'creator frozen mid-[absurd physical action] — arm outstretched, body caught in impossible position, eyes already locked on camera with complete stillness',
    bestFor: ['fitness', 'comedy', 'dance', 'lifestyle', 'challenge'],
    psychologyNote: 'Frozen unexpected action triggers "glitch in matrix" response — viewer rewatches to confirm',
    evidence: 'Interrupted-motion hooks show 1.9x rewatch rate (TikTok internal data via Creator Academy)',
  },

  // ─── EXTREME PROXIMITY ───────────────────────────────────────────────────
  {
    id: 'extreme_closeup',
    name: 'Extreme Close-Up',
    description: 'Opens on extreme close-up of an unexpected body part or object detail',
    videoAction: 'Video opens with extreme macro close-up (eye, texture, object detail, skin, food) so close it is unrecognizable, then pulls back to reveal context in first second',
    promptFragment: 'extreme macro close-up filling 90% of frame — [eye / texture / object detail], so close the subject is unidentifiable, sharp focus, viewer disoriented',
    bestFor: ['beauty', 'food', 'product', 'science', 'nature', 'skin care'],
    psychologyNote: '"What am I looking at?" triggers mandatory 3-second processing delay before swipe',
    evidence: 'Close-up mystery openers retain 71% to 3s vs 52% for standard wide shots (Hootsuite 2025)',
  },

  // ─── POSE & BODY LANGUAGE ────────────────────────────────────────────────
  {
    id: 'contradiction_pose',
    name: 'Contradiction Pose',
    description: 'Body language directly contradicts what will be said',
    videoAction: 'Creator opens with physically aggressive, defeated, or extreme pose (fists up, head in hands, jumping for joy, slumped on floor) for a topic that is the total opposite in tone',
    promptFragment: 'creator in extreme [contradictory body language] — [defeated slump / fists raised / sprawled on floor] — expression completely at odds with expected topic energy',
    bestFor: ['motivation', 'finance', 'relationships', 'personal growth', 'health'],
    psychologyNote: 'Emotional incongruity creates "something is wrong here" signal that demands resolution',
    evidence: 'Emotional contrast openers drive 43% more profile visits per view',
  },
  {
    id: 'mundane_zen',
    name: 'Mundane Zen',
    description: 'Absurdly calm and meditative about something that should be stressful',
    videoAction: 'Creator sits in meditative zen pose, eyes closed, slow breathing — surrounded by absolute chaos (mess, emergency, crisis props around them), then slowly opens eyes and begins normally',
    promptFragment: 'creator in perfect meditative lotus pose, serene closed-eye expression, surrounded by [visual chaos], ultra-calm amid the disaster, opens eyes with quiet certainty',
    bestFor: ['finance', 'business', 'productivity', 'stress', 'motivation', 'mindset'],
    psychologyNote: 'Unexpected serenity in crisis context creates narrative tension viewers must resolve',
    evidence: 'Calm-amid-chaos visual archetype shows 2.2x higher completion rate for talking-head content',
  },

  // ─── TRANSPORT & MOTION ──────────────────────────────────────────────────
  {
    id: 'riding_absurd',
    name: 'Absurd Transport',
    description: 'Delivering content from an absurd or unexpected vehicle/mode of transport',
    videoAction: 'Creator films while riding/using something unexpected for the topic — scooter, shopping cart, exercise ball, giant inflatable — moving through frame and speaking normally',
    promptFragment: 'creator in motion on [absurd vehicle/transport], completely casual and unbothered, speaking directly to camera while moving through scene',
    bestFor: ['lifestyle', 'travel', 'fitness', 'comedy', 'product review'],
    psychologyNote: 'Unexpected motion direction + casual delivery = "this person is unhinged, I must know more"',
    evidence: 'Motion-combined-with-direct-address openers show 1.7x stronger hook retention',
  },

  // ─── PHYSICAL IMPOSSIBILITY ──────────────────────────────────────────────
  {
    id: 'physical_impossibility',
    name: 'Visual Paradox',
    description: 'Something that appears physically impossible or defies gravity/logic',
    videoAction: 'Creator uses fishing line, camera angle, or editing to appear to defy physics (floating object, impossible balance, reverse gravity moment) in first 0.5s',
    promptFragment: 'creator holding [object] that appears to float or defy gravity, matter-of-fact expression, as if this is completely normal — slight smirk acknowledging the absurdity',
    bestFor: ['science', 'tech', 'magic', 'entertainment', 'product', 'education'],
    psychologyNote: '"That can\'t be real" forces mental engagement — brain refuses to scroll past unresolved anomaly',
    evidence: 'Physics-violation openers have lowest immediate-scroll rate across all content categories (15% vs 34% average)',
  },

  // ─── RISK & INTENSITY ────────────────────────────────────────────────────
  {
    id: 'danger_zone',
    name: 'Controlled Risk',
    description: 'Performing something that appears risky or intense (safely staged)',
    videoAction: 'Creator opens doing something that appears intense or precarious (balanced on edge, very close to something hot/cold, extreme sport moment) then calmly addresses camera',
    promptFragment: 'creator in physically intense or precarious-looking position — [on edge of something / extreme environment] — completely composed, direct gaze to camera, no fear',
    bestFor: ['fitness', 'extreme sports', 'travel', 'challenge', 'motivation', 'outdoor'],
    psychologyNote: 'Perceived risk activates threat-monitoring system — viewer stays to see resolution/outcome',
    evidence: 'Risk-adjacent content shows 3.1x higher completion rate when danger is implied but creator is calm (Red Bull Creator Report 2025)',
  },
];

/**
 * Get visual actions recommended for a given hook category.
 * visual_shock and curiosity_gap have the strongest overlap with absurd actions.
 */
export function getVisualActionsForHookCategory(hookCategory: HookCategory): VisualAction[] {
  const categoryMap: Record<HookCategory, string[]> = {
    visual_shock:   ['destruction', 'physical_impossibility', 'frozen_mid_action', 'extreme_closeup', 'scale_absurd'],
    negative_bias:  ['contradiction_pose', 'danger_zone', 'wrong_context', 'destruction', 'objek_absurd'],
    curiosity_gap:  ['extreme_closeup', 'objek_absurd', 'frozen_mid_action', 'mundane_zen', 'era_clash'],
    relatability:   ['makan_nyeleneh', 'mundane_zen', 'wrong_context', 'satisfying_process', 'minum_dramatic'],
    speed_value:    ['props_overflow', 'scale_absurd', 'satisfying_process', 'riding_absurd', 'minum_dramatic'],
  };
  const ids = categoryMap[hookCategory] ?? [];
  return VISUAL_ACTION_BANK.filter(a => ids.includes(a.id));
}

/**
 * Get a single best visual action for a given hook category and topic.
 * Falls back to first match if topic-specific not found.
 */
export function getBestVisualAction(hookCategory: HookCategory, topicCategory?: string): VisualAction {
  const actions = getVisualActionsForHookCategory(hookCategory);
  if (topicCategory) {
    const topicMatch = actions.find(a => a.bestFor.some(b => b.toLowerCase().includes(topicCategory.toLowerCase())));
    if (topicMatch) return topicMatch;
  }
  return actions[0] ?? VISUAL_ACTION_BANK[0];
}
