/**
 * Prop/Tool Interaction System — Topic→Prop Banks + Visual Action Interactions
 * Ported from ai-image-carousel-prompt-gen plugin (hook-visual-library.md §11a-11d)
 *
 * Used by: generate-carousel-images (HOOK slide prompt building)
 * Provides: topic-based prop selection, prop×action interaction matrix,
 *           hook category→prop type rules, and 5-step decision tree
 */

export const PROP_INTERACTION_SYSTEM_KNOWLEDGE = `
## PROP/TOOL INTERACTION SYSTEM

This system selects the RIGHT prop and the RIGHT physical interaction for HOOK slides.
Every hook slide MUST include a prop interaction — it is the pattern interrupt that stops scrolling.

---

### 11a. TOPIC → PROP BANK

For each topic, **Topic-Related** props visually signal the subject matter.
**Random Absurd** props have zero connection to the topic — pure WTF factor that creates cognitive dissonance.

#### Finance / Investment
**Topic-Related:** golden coin, stock chart printout, calculator with numbers on screen, credit card, bundled cash stack
**Random Absurd:** raw whole fish, rubber duck, traffic cone

#### Tech / AI
**Topic-Related:** tangled USB cables, circuit board, vintage floppy disk, robot figurine, oversized computer mouse
**Random Absurd:** pineapple, garden gnome, kitchen whisk

#### Health / Fitness
**Topic-Related:** dumbbell, protein shaker bottle, yoga mat rolled up, measuring tape, green smoothie in glass
**Random Absurd:** cactus pot, flip-flop sandal, alarm clock

#### Food / Cooking
**Topic-Related:** fresh durian cut open, chef knife, wooden cutting board with ingredients, steaming pot, spice jars
**Random Absurd:** laptop computer, necktie, phone charger cable

#### Education / Tutorial
**Topic-Related:** stack of heavy textbooks, oversized magnifying glass, chalkboard eraser, graduation cap, notebook with sticky notes
**Random Absurd:** rubber chicken, boxing glove, watering can

#### Business / Startup
**Topic-Related:** whiteboard marker, pitch deck printout, sticky note wall, business card stack, trophy/award
**Random Absurd:** pool noodle, oven mitt, snow globe

#### Lifestyle / Travel
**Topic-Related:** passport, vintage suitcase, world map, polaroid camera, plane ticket
**Random Absurd:** fire extinguisher, toilet plunger, disco ball

#### Productivity / Tools
**Topic-Related:** hourglass, stacked planners, multiple phone screens, keyboard, cable management clips
**Random Absurd:** banana, garden hose, rubber stamp

#### Creative / Design
**Topic-Related:** paint-splattered palette, oversized pencil, color swatch fan deck, camera lens, sketchbook
**Random Absurd:** iron (clothes), fish bowl, umbrella

#### News / Current Events
**Topic-Related:** rolled newspaper, microphone, press badge, breaking news printout, red folder marked confidential
**Random Absurd:** teddy bear, beach ball, toilet paper roll

#### Beauty / Skincare
**Topic-Related:** compact mirror, makeup brush set, skincare bottle with dropper, face roller, cotton pads
**Random Absurd:** wrench, cactus, stapler

#### Fashion / Style
**Topic-Related:** sunglasses, designer handbag, fabric swatch, sewing tape measure, perfume bottle
**Random Absurd:** plunger, garden trowel, rubber duck

#### Default / General (when no topic match)
**Topic-Related:** pen, notebook, coffee mug, phone, whiteboard marker
**Random Absurd:** rubber duck, traffic cone, pineapple

---

### 11b. PROP x VISUAL ACTION INTERACTION MATRIX

How each Visual Action modifies prop usage. The interaction column tells exactly HOW the creator physically engages with the selected prop.

| Visual Action | Prop Source | Physical Interaction | Prompt Fragment |
|---|---|---|---|
| Makan Nyeleneh | Topic-Related OR Absurd | Creator BITES/EATS the prop | "mid-bite into [prop], teeth making contact with surface, crumbs or fragments visible, the absurd act of eating [prop] contrasts with the serious headline" |
| Minum Dramatic | Topic-Related OR Absurd | Creator DRINKS from/with prop | "holding [prop] at lip level as if sipping from it, steam or condensation optional, eyes locked on camera over the [prop], intense knowing stare" |
| Objek Absurd | Random Absurd ONLY | Creator HOLDS with deadpan | "holding [absurd prop] at chest height with completely flat serious expression, dead-pan stare at camera, the object has zero connection to the headline topic" |
| Destruction | Topic-Related preferred | Creator RIPS/BREAKS/SMASHES | "mid-action tearing apart [prop], fragments and pieces visible in the air, aggressive confident energy, the physical destruction of [prop] mirrors dismantling the old belief" |
| Satisfying Process | Topic-Related preferred | Creator performs SATISFYING action | "slow deliberate [pouring/slicing/peeling/unboxing] of [prop], captured at the peak satisfying moment, warm backlighting catching the texture and detail" |
| Scale Absurd | Topic-Related preferred | Creator dwarfed by OVERSIZED prop | "standing next to an absurdly oversized version of [prop], looking up at it with genuine amazement, one hand reaching toward it, the extreme scale difference creates immediate visual shock" |
| Wrong Context | Topic-Related | Prop NORMAL but SETTING is absurd | "using [prop] as if completely normal while sitting in [absurd setting - beach, jungle, rooftop edge, laundromat], relaxed unbothered expression despite the environmental mismatch" |
| Frozen Mid-Action | Topic-Related OR Absurd | Creator FROZEN mid-interaction | "captured at the peak moment of [throwing/catching/dropping/juggling] [prop], body suspended in dynamic pose, hair and clothing showing motion blur, the [prop] frozen mid-trajectory" |
| Extreme Close-Up | Topic-Related preferred | MACRO shot of prop interaction | "extreme tight close-up of hands [gripping/slicing/pressing/opening] [prop], filling most of the frame, every texture hyper-visible - surface detail, skin pores, material grain - uncomfortably intimate" |
| Props Overflow | Topic-Related ONLY | Creator BURIED in many props | "sitting at center surrounded by an overwhelming abundance of [topic props from bank], slightly buried under the pile, expression of knowing confidence or overwhelmed excitement amid the chaos" |
| Contradiction Pose | Topic-Related | Emotional MISMATCH with prop | "smiling warmly and laughing while casually holding [serious/warning topic prop], or maintaining stone-faced seriousness while surrounded by [fun/playful topic props], the emotional mismatch forces curiosity" |
| Mundane Zen | Topic-Related as background chaos | Props create CHAOS behind calm creator | "creator in serene meditation pose or calmly sipping tea, peaceful half-lidded eyes, while behind them [topic props] are scattered chaotically - flying, falling, stacked precariously, creating visible disorder" |

---

### 11c. HOOK CATEGORY → PROP SELECTION RULE

Which prop type the agent picks based on the selected hook category.

| Hook Category | Prop Type | Why | Example (Finance topic) |
|---|---|---|---|
| Visual Shock | **Random Absurd** | Maximum WTF pattern interrupt - topic only visible from headline text | Creator biting raw fish while headline says "RAHASIA INVESTASI" |
| Negative Bias | **Topic-Related** | Warning object reinforces the "danger" message - prop IS the threat | Creator ripping stock chart while headline warns about financial mistake |
| Curiosity Gap | **Topic-Related** | Visual clue teases the topic - viewer connects prop + headline for partial reveal | Creator holding golden coin with knowing smirk - "what does he know?" |
| Relatability | **Topic-Related** | Recognizable everyday object = "gue juga punya itu" identification | Creator holding phone showing calculator app - relatable daily tool |
| Speed & Value | **Topic-Related** | Tool/product shown = immediate value association - "I need that tool" | Creator confidently presenting calculator with visible numbers |

---

### 11d. PROP SELECTION DECISION TREE

When generating a hook slide, follow this sequence:

Step 1: Identify topic → find matching Topic Category in Section 11a
        (If no match → use Default props: pen, notebook, coffee mug, phone, whiteboard marker)

Step 2: Read hook category (selected by user from 3 options)
        → Check Section 11c for prop type: Topic-Related or Random Absurd

Step 3: Read visual action (paired with hook category from hook-science.ts)
        → Check Section 11b for physical interaction style

Step 4: Pick a specific prop from the bank that works with the interaction:
        - If prop type = Topic-Related → pick from Topic-Related list in 11a
        - If prop type = Random Absurd → pick from Random Absurd list in 11a
        - Prefer props that physically work with the action (e.g., Makan = something bite-able)

Step 5: Write into prompt:
        - Costume: from wardrobe library (visual-action-bank.ts Section 10)
        - Prop + interaction: using interaction phrase from 11b
        - Include the specific prop name and interaction description
`;
