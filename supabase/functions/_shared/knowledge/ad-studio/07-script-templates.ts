/**
 * Parameterized Script Templates for Ad Studio
 * For Deno Edge Function compatibility
 * Last updated: 2026-01-20
 */

export default `# Parameterized Script Templates for Ad Studio

## Master Template Structure

\`\`\`
[HOOK: {hook_type} using {persuasion_principle}]
Duration: {hook_duration_by_age}
Visual: {production_style}

[FRAMEWORK_PHASE_1: {problem_or_attention}]
Tone: {tone_by_b2b_b2c}
Duration: {phase1_duration}
Trust element: {early_credibility}

[FRAMEWORK_PHASE_2: {agitation_or_interest}]
Proof element: {proof_type_by_context}
Duration: {phase2_duration}
Emotional trigger: {emotion_by_audience}

[FRAMEWORK_PHASE_3: {solution_or_desire}]
Benefits: {benefit_1}, {benefit_2}
Social proof: {proof_by_audience_type}
Duration: {phase3_duration}

[CTA: {cta_template_by_objective}]
Urgency: {urgency_element_if_appropriate}
Risk reversal: {risk_element_by_b2b_b2c}
Duration: {cta_duration}
Visual: {cta_visual_sync}
\`\`\`

---

## Variable Definitions

### {platform}
\`TikTok | Instagram_Reels | Facebook_Feed | LinkedIn | YouTube_Skippable | YouTube_Bumper | YouTube_Shorts\`

### {audience_age}
\`Gen_Z | Millennial | Gen_X | Boomer\`

### {b2b_b2c}
\`B2B | B2C\`

### {campaign_goal}
\`Awareness | Consideration | Conversion | Retargeting\`

### {product_complexity}
\`Simple_Impulse | Moderate | Complex_Technical | High_Ticket\`

### {hook_type}
\`Pattern_Interrupt | POV | Question | Statistic | Controversy | Story_Tease | Credibility | Pain_Point\`

### {persuasion_principle}
\`Reciprocity | Commitment | Social_Proof | Authority | Liking | Scarcity\`

### {proof_type}
\`UGC | Testimonial | Case_Study | Statistics | Expert_Endorsement | Before_After | User_Count\`

### {cta_type}
\`Lead_Gen | Purchase | Trial | Signup | Demo_Request | Download\`

---

## Pacing Configuration by Age

| Age Group | Words/Second | Max Shot | Cuts/Minute | Duration Multiplier |
|-----------|--------------|----------|-------------|---------------------|
| Gen Z | 2.5-3.0 | 4s | 15-25 | 1.0x |
| Millennial | 2.5 | 6s | 10-15 | 1.2x |
| Gen X | 2.0-2.5 | 10s | 6-12 | 1.5x |
| Boomer | 1.5-2.0 | 15s | 4-8 | 2.0x |

### Duration Calculation
\`\`\`
base_duration = platform_optimal[platform][campaign_goal]
final_duration = base_duration × age_multiplier[audience_age]

// Example: TikTok + Conversion + Boomer
// 21s × 2.0 = 42s video
\`\`\`

---

## Hook Formula Selection Matrix

| Audience × Platform | Recommended Hook Types |
|---------------------|------------------------|
| Gen Z + TikTok | Pattern_Interrupt, POV, Controversy, Trending_Audio |
| Gen Z + Instagram | POV, Question, Story_Tease |
| Millennial + Instagram | Nostalgic_Pull, Story_Tease, Social_Proof_Lead |
| Millennial + Facebook | Values_Hook, Question, Testimonial_Open |
| Gen X + Facebook | Credibility_Lead, Practical_Value, Testimonial_Open |
| Gen X + LinkedIn | Problem_Statement, Statistic, Authority_Open |
| Boomer + YouTube | Authority_First, Clear_Value, Educational_Hook |
| Boomer + Facebook | Professional_Tone, Benefit_Lead, Trust_Signal |
| B2B + LinkedIn | Statistic_Hook, Problem_Agitation, Thought_Leadership |
| B2C + Any Social | Benefit_Statement, Emotional_Scene, Pain_Question |

### Hook Templates by Type

**Pattern_Interrupt:**
- "Wait—this changes everything about [topic]"
- "[Sound effect] + unexpected visual"
- "Stop scrolling if you've ever [relatable struggle]"

**POV:**
- "POV: You just discovered [game-changer]"
- "POV: You finally [achieved outcome]"
- "POV: Your [problem] is gone forever"

**Question:**
- "Why is nobody talking about this?"
- "What if I told you [surprising claim]?"
- "Ever wondered why [common frustration]?"

**Statistic:**
- "[X]% of [audience] don't know this"
- "We analyzed [large number]—here's what we found"
- "Only [X] in [Y] people know this trick"

**Controversy:**
- "Unpopular opinion: [statement]"
- "This might be controversial but..."
- "[Industry] doesn't want you to know this"

**Story_Tease:**
- "I was [struggling], then I discovered..."
- "6 months ago, I couldn't [do thing]..."
- "Here's what happened when I tried..."

**Credibility:**
- "After 10 years in [industry]..."
- "As a [credential], I can tell you..."
- "We've helped [X] companies [achieve outcome]..."

**Pain_Point:**
- "Tired of [specific frustration]?"
- "If you're still [dealing with problem]..."
- "This [problem] is costing you [consequence]"

---

## Production Style by Context

| Context | Production Approach | Camera | Editing |
|---------|---------------------|--------|---------|
| Gen Z + B2C | Lo-fi, smartphone-shot | Selfie, handheld | Fast cuts, effects |
| Millennial + B2C | Polished-but-real | Mixed | Clean transitions |
| Gen X/Boomer + B2C | Professional, clear | Steady shots | Slow, deliberate |
| B2B + LinkedIn | Professional-conversational | Talking head | Minimal effects |
| B2B + YouTube | Polished, educational | Studio quality | Graphics, demos |

---

## Framework Templates

### AIDA Template (30 seconds)
\`\`\`
[ATTENTION: 3-5s]
{hook_type} opening
Visual: {pattern_interrupt_visual}
"[Hook that stops scroll]"

[INTEREST: 7-9s]
Problem identification
Tone: {empathetic}
"[Pain point they recognize]. [Consequence of problem]."

[DESIRE: 10-12s]
Solution + benefits
Proof: {proof_type}
"[Product] does [benefit 1] and [benefit 2].
[Social proof statement]."

[ACTION: 5-6s]
CTA: {cta_template}
Urgency: {if_appropriate}
Risk: {risk_reversal}
"[CTA]. [Urgency]. [Risk reversal]."
\`\`\`

### PAS Template (30 seconds)
\`\`\`
[PROBLEM: 6-8s]
Direct pain identification
Tone: {empathetic}
"You're [experiencing problem]. [Specific struggle]."

[AGITATE: 9-11s]
Amplify the discomfort
Technique: {agitation_type}
"If you don't fix this, [worse outcome].
[Quantify the cost]. [Emotional consequence]."

[SOLUTION: 12-15s]
Relief through product
Proof: {proof_type}
CTA: {cta_template}
"[Product] solves this by [mechanism].
[Social proof]. [CTA with urgency]."
\`\`\`

### BAB Template (30 seconds)
\`\`\`
[BEFORE: 8-9s]
Paint current struggle
Tone: {relatable}
"Remember what it was like when [struggle]?
[Specific frustration]. [Emotional weight]."

[AFTER: 10-12s]
Paint transformation
Visual: {outcome_visualization}
"Now imagine [transformed state].
[Emotional benefit]. [Practical benefit]."

[BRIDGE: 9-11s]
Product as the path
Proof: {transformation_proof}
CTA: {cta_template}
"[Product] takes you there.
[Social proof of transformation]. [CTA]."
\`\`\`

### Hook-Story-Offer Template (30 seconds)
\`\`\`
[HOOK: 3-5s]
{hook_type}
Visual: {native_platform_style}
"[Scroll-stopping opener]"

[STORY: 15-18s]
Personal narrative
Tone: {authentic}
"[Relatable struggle].
[Discovery moment].
[Transformation result]."

[OFFER: 8-10s]
Value proposition + CTA
Urgency: {if_appropriate}
"[What they get]. [Why now]. [How to get it]."
\`\`\`

---

## Parameter Lookup Tables

### Framework Selection
\`\`\`
function selectFramework(params):
    if params.platform in ["TikTok", "Instagram_Reels"] and params.b2b == false:
        return "Hook-Story-Offer"

    if params.campaign_goal == "conversion" and params.audience_awareness == "problem_aware":
        return "PAS"

    if params.product_type == "transformation":
        return "BAB"

    if params.audience_age in ["Gen_X", "Boomer"] or params.b2b == true:
        return "AIDA"  // with 1.5x timing

    return "AIDA"  // default
\`\`\`

### Length Calculator
\`\`\`
base_lengths = {
    "TikTok": {"Awareness": 21, "Conversion": 21},
    "Instagram_Reels": {"Awareness": 20, "Conversion": 20},
    "Facebook_Feed": {"Awareness": 20, "Conversion": 20},
    "LinkedIn": {"Awareness": 20, "Conversion": 30},
    "YouTube_Skippable": {"Awareness": 45, "Conversion": 45}
}

age_multipliers = {
    "Gen_Z": 1.0,
    "Millennial": 1.2,
    "Gen_X": 1.5,
    "Boomer": 2.0
}

function calculateLength(platform, goal, age, b2b):
    base = base_lengths[platform][goal]
    multiplied = base * age_multipliers[age]

    if b2b and goal == "consideration":
        return max(multiplied, 60)

    return round(multiplied)
\`\`\`

### Trust Element Selection
\`\`\`
trust_elements = {
    "Gen_Z": {
        "B2B": "Expert creator endorsement",
        "B2C": "UGC, peer validation"
    },
    "Millennial": {
        "B2B": "Case studies + values proof",
        "B2C": "Reviews + cause connection"
    },
    "Gen_X": {
        "B2B": "Detailed testimonials",
        "B2C": "Customer testimonials"
    },
    "Boomer": {
        "B2B": "Credentials + heritage",
        "B2C": "Authority + guarantees"
    }
}
\`\`\`

### CTA Selection
\`\`\`
cta_templates = {
    "Lead_Gen": {
        "soft": "Learn more about [benefit]",
        "medium": "Get my free [resource]",
        "hard": "Claim my [resource] now"
    },
    "Purchase": {
        "soft": "See [product]",
        "medium": "Shop now",
        "hard": "Buy today—save [X]%"
    },
    "Trial": {
        "soft": "See how it works",
        "medium": "Start my free trial",
        "hard": "Try free—no credit card"
    },
    "Signup": {
        "soft": "Join the community",
        "medium": "Create my free account",
        "hard": "Sign up now—limited spots"
    }
}

function selectCTA(objective, funnel_stage):
    intensity = {"awareness": "soft", "consideration": "medium", "conversion": "hard"}
    return cta_templates[objective][intensity[funnel_stage]]
\`\`\`

---

## Complete Script Generation Logic

\`\`\`
function generateScriptStructure(params):
    // 1. Select framework
    framework = selectFramework(params)

    // 2. Calculate duration
    duration = calculateLength(
        params.platform,
        params.campaign_goal,
        params.audience_age,
        params.b2b
    )

    // 3. Select hook
    hook = selectHook(params.audience_age, params.platform, params.b2b)

    // 4. Select trust element
    trust = trust_elements[params.audience_age][params.b2b ? "B2B" : "B2C"]

    // 5. Select CTA
    cta = selectCTA(params.cta_objective, params.campaign_goal)

    // 6. Apply pacing
    pacing = {
        "words_per_second": pacing_config[params.audience_age].wps,
        "max_shot_length": pacing_config[params.audience_age].max_shot,
        "cuts_per_minute": pacing_config[params.audience_age].cuts
    }

    // 7. Select production style
    production = selectProductionStyle(params.audience_age, params.b2b)

    return {
        framework,
        duration,
        hook,
        trust,
        cta,
        pacing,
        production
    }
\`\`\`

---

## Example: Generated Script Structure

**Input:**
\`\`\`
{
    platform: "TikTok",
    audience_age: "Millennial",
    b2b: false,
    campaign_goal: "Conversion",
    product_type: "skincare",
    cta_objective: "Purchase"
}
\`\`\`

**Output:**
\`\`\`
Framework: Hook-Story-Offer
Duration: 25 seconds (21 × 1.2)
Hook: Story_Tease or Nostalgic_Pull

[HOOK: 3-4s]
Type: Story_Tease
"6 months ago, my skin was a disaster..."

[STORY: 13-15s]
Tone: Authentic, relatable
Trust: Reviews + transformation proof
"I tried everything. Expensive serums. Dermatologist visits.
Then I found [Product]. Three weeks later? Look at this."

[OFFER: 6-8s]
CTA: "Shop now"
Urgency: "20% off ends tonight"
Social: "50,000+ 5-star reviews"
"Link in bio. 20% off ends tonight."

Pacing: 2.5 wps, 6s max shot, 10-15 cuts/min
Production: Polished-but-real, smartphone OK
\`\`\`
`;
