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
  psychological_trigger: string;
}> = {
  visual_shock: {
    name: 'Visual Shock & Pattern Interrupt',
    objective: 'Stop the scroll in <0.5 seconds using non-verbal cues',
    best_for: 'Showcase, Travel, Food, Tech, High-Energy Vlogs',
    psychological_trigger: 'Pattern Interrupt — breaks autopilot scrolling with unexpected visual'
  },
  negative_bias: {
    name: 'Negative Bias & Warnings',
    objective: 'Trigger Loss Aversion psychology',
    best_for: 'Education, Finance, Coding, Business, Health',
    psychological_trigger: 'Negativity Bias — brain prioritizes threats/warnings over positive info'
  },
  curiosity_gap: {
    name: 'Curiosity Gaps & Insider Secrets',
    objective: 'Create an information itch that must be scratched',
    best_for: 'Storytelling, Vlogs, Case Studies, Motivation',
    psychological_trigger: 'Curiosity Gap — incomplete information the brain cannot ignore'
  },
  relatability: {
    name: 'Relatability & Identity',
    objective: 'Make viewer think "That is literally me"',
    best_for: 'Lifestyle, General Entertainment, Comedy',
    psychological_trigger: 'Identity Trigger — viewer feels seen, compelled to engage/share'
  },
  speed_value: {
    name: 'Speed & Value Promise',
    objective: 'Maximize ROI on time invested',
    best_for: 'Tutorials, Quick Tips, Hacks',
    psychological_trigger: 'Value Promise — specific outcome in exchange for viewer attention'
  }
};
