/**
 * Video Ad Frameworks with Timing Parameters
 * For Deno Edge Function compatibility
 * Last updated: 2026-01-20
 */

export default `# Video Ad Frameworks with Timing Parameters

## Framework Overview

| Framework | Structure | Best For |
|-----------|-----------|----------|
| AIDA | Attention → Interest → Desire → Action | Brand awareness, complex products |
| PAS | Problem → Agitate → Solution | Problem-aware audiences, B2B |
| BAB | Before → After → Bridge | Transformation products |
| Hook-Story-Offer | Hook → Story → Offer | Social media, direct response |

---

## AIDA Framework (Attention, Interest, Desire, Action)

### Timing Distribution

| Phase | % of Video | 15-sec | 30-sec | 60-sec | Function |
|-------|------------|--------|--------|--------|----------|
| Attention | 10-15% | 1.5-2s | 3-5s | 6-9s | Pattern interrupt hook |
| Interest | 25-30% | 4-5s | 7-9s | 15-18s | Problem resonance |
| Desire | 35-40% | 5-6s | 10-12s | 21-24s | Benefit showcase |
| Action | 15-20% | 2-3s | 5-6s | 9-12s | Clear CTA |

### Phase Guidelines

**ATTENTION (Hook)**
- Visual or audio pattern interrupt
- Bold claim or question
- Unexpected imagery
- "Stop the scroll" moment

**INTEREST (Problem)**
- Identify viewer's pain point
- Show understanding of their situation
- Build "this is about ME" recognition
- Demonstrate you know their world

**DESIRE (Benefits)**
- Feature → Benefit transformation
- Social proof integration
- Visualization of outcome
- Emotional connection to solution

**ACTION (CTA)**
- Single, clear call-to-action
- Urgency element if appropriate
- Risk reversal (guarantee, trial)
- Visual + verbal CTA sync

### Best Use Cases
- Product launches
- Brand awareness campaigns
- E-commerce
- Complex products requiring explanation
- Multi-step funnels

### Avoid When
- Ultra-short formats (under 15 seconds)
- Retargeting (audience already knows product)
- Simple impulse purchases

---

## PAS Framework (Problem, Agitate, Solution)

### Timing Distribution

| Phase | % of Video | 15-sec | 30-sec | 60-sec | Function |
|-------|------------|--------|--------|--------|----------|
| Problem | 20-25% | 3-4s | 6-8s | 12-15s | Pain identification |
| Agitate | 30-35% | 5-6s | 9-11s | 18-21s | Amplify discomfort |
| Solution | 40-50% | 6-8s | 12-15s | 24-30s | Product + CTA |

### Phase Guidelines

**PROBLEM (Identify)**
- State the problem clearly
- Use "you" language
- Specific > vague
- Example: "Your leads are going cold because you can't respond fast enough."

**AGITATE (Amplify)**
- Deepen the emotional impact
- Show consequences of inaction
- Create urgency to solve

**Agitation Techniques:**

| Technique | Example |
|-----------|---------|
| Consequences | "If you don't fix this, [worse outcome]..." |
| Escalation | "It starts with [small issue], then becomes [bigger issue]..." |
| Negative Future Pacing | "Imagine 6 months from now, still dealing with..." |
| Comparison | "While your competitors are [winning], you're stuck..." |
| Quantification | "Every day you wait costs you $[X]..." |

**SOLUTION (Resolve + CTA)**
- Position product as the relief
- Clear benefit statement
- Social proof
- Strong CTA

### Best Use Cases
- Problem-aware audiences
- B2B solutions
- Health / wellness products
- Pain-driven purchases
- Service businesses

### Avoid When
- Pure brand / lifestyle content
- Audiences not yet problem-aware
- Premium luxury positioning (pain ≠ aspiration)

---

## BAB Framework (Before, After, Bridge)

### Timing Distribution

| Phase | % of Video | 15-sec | 30-sec | 60-sec | Function |
|-------|------------|--------|--------|--------|----------|
| Before | 25-30% | 4-5s | 8-9s | 15-18s | Current painful state |
| After | 35-40% | 5-6s | 10-12s | 21-24s | Desired future state |
| Bridge | 30-35% | 5-6s | 9-11s | 18-21s | Product as path + CTA |

### Phase Guidelines

**BEFORE (Current State)**
- Paint the struggle vividly
- "Remember what it was like when..."
- Specific frustrations and pain points
- Viewer recognition: "That's me"

**AFTER (Desired State)**
- Paint the transformation outcome
- "Now imagine..."
- Emotional and practical benefits
- Make it feel achievable

**BRIDGE (Product)**
- Product/service as the connection
- "Here's how to get there..."
- Social proof of transformation
- CTA with urgency

### Best Use Cases
- Transformation products (fitness, education)
- Before/after visual products (skincare, home improvement)
- Personal development
- Career / skill-building
- Weight loss / health

### Avoid When
- Technical products (hard to show transformation)
- B2B enterprise (less emotional)
- Products without clear before/after

---

## Hook-Story-Offer Framework

### Timing Distribution

| Phase | % of Video | 15-sec | 30-sec | 60-sec | Function |
|-------|------------|--------|--------|--------|----------|
| Hook | 10-15% | 1.5-2s | 3-5s | 6-9s | Stop scroll |
| Story | 50-60% | 8-9s | 15-18s | 30-36s | Build connection |
| Offer | 25-30% | 4-5s | 8-10s | 15-18s | Value prop + CTA |

### Phase Guidelines

**HOOK (Stop Scroll)**
- Pattern interrupt
- Curiosity gap
- Bold claim
- Direct address

**Hook Types:**
| Type | Example |
|------|---------|
| POV | "POV: You just discovered..." |
| Question | "Why is nobody talking about this?" |
| Confession | "I was today years old when I learned..." |
| Warning | "Stop scrolling if you've ever..." |
| Controversy | "Unpopular opinion: [statement]" |

**STORY (Build Connection)**
- Personal narrative
- Relatable journey
- Struggle → Discovery → Transformation
- Authenticity over polish

**OFFER (Convert)**
- Clear value proposition
- What they get
- Why now (urgency)
- How to get it (CTA)

### Best Use Cases
- TikTok / Reels
- Direct response marketing
- Funnel-based businesses
- Info products / courses
- Creator-led brands

### Avoid When
- B2B enterprise / corporate
- Formal industries (finance, legal)
- Audiences expecting polish

---

## Framework Selection Logic

\`\`\`
// Decision Tree for Framework Selection

IF platform IN ["TikTok", "Instagram_Reels"] AND b2b = false:
    framework = "Hook-Story-Offer"

ELIF campaign_goal = "conversion" AND audience_awareness = "problem_aware":
    framework = "PAS"

ELIF product_type = "transformation":
    framework = "BAB"

ELIF campaign_goal = "awareness" AND audience_temp = "cold":
    framework = "AIDA"

ELIF audience_age IN ["Gen_X", "Boomer"] OR b2b = true:
    framework = "AIDA"
    timing_multiplier = 1.5  // Slower pacing

ELIF campaign_goal = "retargeting":
    framework = "PAS"  // They know the problem, agitate + solve

DEFAULT:
    framework = "AIDA"
\`\`\`

---

## Optimal Video Lengths by Platform × Objective

| Platform | Awareness | Consideration | Conversion |
|----------|-----------|---------------|------------|
| TikTok | 15-30s | 21-34s | 21-34s |
| Instagram Reels | 15-30s | 15-60s | 15-30s |
| Facebook Feed | 15-30s | 30-60s | 15-30s |
| LinkedIn | 15-30s | 30-90s | 15-45s |
| YouTube Skippable | 30-60s | 60-120s | 30-60s |
| YouTube Bumper | 6s | N/A | N/A |
| YouTube Shorts | 15-30s | 15-45s | 20-45s |

### Key Finding: TikTok Sweet Spot
21-34 second videos drive **280% more conversions** than other lengths on TikTok.

---

## Framework Timing Multipliers by Audience

| Audience | Multiplier | Effect |
|----------|------------|--------|
| Gen Z | 1.0x | Standard pacing |
| Millennial | 1.2x | Slightly longer phases |
| Gen X | 1.5x | Extended timing |
| Boomer | 2.0x | Double standard timing |

**Example:** A 30-second AIDA for Boomers:
- Attention: 6-10s (instead of 3-5s)
- Interest: 14-18s (instead of 7-9s)
- Desire: 20-24s (instead of 10-12s)
- Action: 10-12s (instead of 5-6s)
- **Total: ~60 seconds**

---

## Quick Reference: Framework by Context

| Context | Framework | Why |
|---------|-----------|-----|
| TikTok B2C | Hook-Story-Offer | Native format, creator-style |
| Facebook Retargeting | PAS | Agitate known problem |
| Fitness Product | BAB | Visual transformation |
| B2B SaaS | AIDA | Methodical, professional |
| Flash Sale | PAS | Urgency + pain resolution |
| Brand Launch | AIDA | Full story arc |
| Course/Info Product | Hook-Story-Offer | Story sells |
| Professional Services | AIDA | Authority building |
`;
