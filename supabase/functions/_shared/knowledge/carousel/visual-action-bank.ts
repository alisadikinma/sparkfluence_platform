// Visual Action Bank -- Expression, Lighting, Camera & Environment Specs
// Ported from ai-image-carousel-prompt-gen/references/hook-visual-library.md
// RAG knowledge for LLM prompt injection -- keep ALL content intact

export const VISUAL_ACTION_BANK_KNOWLEDGE = `
Hook Visual Library -- Expression, Lighting, Camera & Environment Specs

Single source of truth for HOW hook slides LOOK. Provides prompt-ready visual specs per hook category.

How This File Works

Three-file hook workflow:
1. hook-science -- Hook psychology, 5 categories, 100-hook bank, 16 Visual Action types, Topic -> Hook Category mapping, scoring gate
2. hook-formula-bank -- 52 fill-in-the-blank headline formula templates, 8 psychology categories
3. THIS FILE -- Deep visual specs: expression library, lighting presets, camera angle banks, environment palettes, synergy matrix, anti-repetition system

When generating a hook slide:
1. Select hook category from Topic -> Hook Category Mapping (hook-science) -- MANDATORY, never default to Visual Shock
2. Select headline from hook bank (hook-science) or formula (hook-formula-bank)
3. Read visual profile for the selected category from THIS FILE (expression, lighting, camera, environment)
4. Select costume from Section 10 based on topic category
5. Select Visual Action from hook-science (Topic -> Visual Action mapping)
6. Select prop from Section 11 -- check hook category -> prop type rule (11c), pick from topic bank (11a), apply interaction style (11b)
7. Check synergy matrix (Section 6) for expression modification when combining category + visual action
8. If repeat topic this session: rotate to next variant (A->B->C) per Section 7

---

Section 1: Expression Library -- 5 Hook Categories

Each category defines a complete expression profile with prompt-ready phrases. Copy the relevant phrases directly into the hook slide prompt.

Visual Shock Expression

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | eyes blown wide open with full iris visible, eyebrows shot up high creating deep forehead lines, frozen mid-blink stare directly into camera |
| Mouth | jaw dropped with lips parted in a small O shape, not gaping -- controlled astonishment, slight tension in cheek muscles |
| Head | tilted back five degrees as if physically pushed by surprise, chin slightly lifted |
| Hands | one hand raised palm-out at shoulder height in reflexive shock gesture, fingers slightly spread, other hand gripping an object tightly |
| Body | shoulders pulled back and tensed, upper body leaning slightly backward -- recoil from unexpected visual |
| Emotion | "frozen in the split-second of genuine disbelief, a visceral 'wait WHAT' reaction caught at peak intensity" |

Negative Bias Expression

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | intense direct stare through slightly narrowed lids, brows drawn together creating a deep vertical furrow between eyes, gaze locked on camera with protective urgency |
| Mouth | tight-lipped with corners pulled slightly down, jaw set with determination, no teeth showing -- controlled seriousness |
| Head | chin lowered five degrees, looking up through brows with a "listen to me carefully" gravity |
| Hands | one palm raised flat at chest level in a firm stop gesture, fingers pressed together, other hand pointing index finger at camera |
| Body | squared shoulders with slight forward lean toward camera -- confrontational authority, invading the viewer's space |
| Emotion | "intense protective warning with frustrated urgency, like a trusted friend grabbing your shoulders to stop you from making a costly mistake" |

Curiosity Gap Expression

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | one eyebrow raised higher than the other creating asymmetric intrigue, eyes bright and alert with a knowing glint, gaze slightly off-center then snapping to camera |
| Mouth | closed-lip smirk with one corner lifted, the "I know something you desperately want to know" half-smile |
| Head | tilted ten degrees to one side with chin slightly forward, the classic "let me tell you a secret" lean |
| Hands | one hand near mouth as if about to whisper, or index finger pressed to lips in a subtle shush gesture, other hand holding a partially hidden object |
| Body | relaxed shoulders but with a conspiratorial forward lean, one shoulder slightly ahead of the other -- asymmetric and intriguing |
| Emotion | "smug insider confidence radiating 'I discovered something you need to see', a mix of excitement and deliberate mystery" |

Relatability & Identity Expression

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | soft warm eye contact with slightly raised brows of recognition, the "oh you TOO?" look, gentle crow's feet from authentic micro-smile |
| Mouth | natural relaxed smile showing a hint of teeth, or a sympathetic pressed-lip nod -- genuine, not performed |
| Head | slight forward nod as if agreeing with the viewer, head level and straight -- peer-to-peer, not looking down |
| Hands | both hands wrapped around a coffee mug at chest level, or one hand touching chest over heart in an "I feel you" gesture |
| Body | relaxed open posture, shoulders soft and slightly rounded, leaning toward camera as if sitting across a cafe table |
| Emotion | "warm empathetic recognition, the exact face you make when a friend describes your own life back to you -- comfort mixed with 'finally someone gets it'" |

Speed & Value Expression

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | direct unwavering eye contact, steady confident gaze, brows relaxed but slightly lifted showing engagement, the "pay attention because this is worth your time" focus |
| Mouth | closed-lip confident half-smile, or lips slightly parted mid-sentence as if about to deliver key information -- no hesitation |
| Head | chin tilted up three degrees with a subtle authoritative nod, head perfectly centered in frame |
| Hands | one hand held up showing a number (matching the hook number), fingers clearly defined, or both hands framing a product/tool at chest level |
| Body | upright squared posture, chest open, shoulders back -- competent authority without arrogance, slight lean forward indicating eagerness to deliver value |
| Emotion | "calm unshakeable competence radiating 'I've done the work so you don't have to', the energy of someone who genuinely has the answer and can't wait to share it" |

---

Section 2: Expression Library -- 8 Formula Categories

These map to the 5 hook categories but with formula-specific nuances. Use when generating hooks from hook-formula-bank.

Unbeatable Value (maps to: Speed & Value + price discovery amazement)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | wide eyes with raised brows of genuine amazement, not shock -- the difference is warmth and excitement rather than fear, pupils dilated with discovery delight |
| Mouth | open smile of disbelief, teeth visible, cheeks pushed up high -- the "are you SERIOUS right now?" joy face |
| Head | slight forward lean with chin down as if re-reading a price tag in disbelief, then looking up at camera |
| Hands | one hand holding product at chest height angled toward camera, other hand palm-up in "can you believe this?" presentation gesture |
| Body | energized forward lean, shoulders up with excitement, slight bounce energy -- "I need to show you this immediately" |
| Emotion | "genuine price-discovery amazement mixed with barely contained excitement, like finding a designer piece at a thrift store" |

Problem-Solver (maps to: Negative Bias + empathetic resolution)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | knowing empathetic gaze with one brow slightly raised, the "I've been exactly where you are" understanding look, soft focus directly at camera |
| Mouth | pressed lips with a slight sympathetic downturn that transitions to a confident half-smile -- "I had the pain, now I have the answer" |
| Head | slight sideways tilt of understanding, then straightening with confidence as if shifting from empathy to solution mode |
| Hands | one hand gesturing palm-up presenting the solution, other hand at side or touching chin thoughtfully |
| Body | slight forward lean of sincerity, open chest, one shoulder slightly ahead -- approachable authority |
| Emotion | "empathetic determination of someone who suffered through the problem, found the fix, and is now on a mission to save others the same pain" |

Plot Twist (maps to: Curiosity Gap + genuine surprise discovery)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | eyes widening in real-time as if the twist is happening NOW, brows shooting up, the exact moment of "wait... actually?!" realization |
| Mouth | lips pressed together then breaking into an incredulous laugh, or caught mid-word with mouth forming "no way" |
| Head | pulled back slightly in surprise then leaning forward with interest, a double-take micro-movement frozen at peak |
| Hands | one hand frozen mid-gesture as if pausing a story, other hand raised to temple in "mind blown" position |
| Body | dynamic twist at the waist as if literally turning to face something unexpected, shoulders at slight angle |
| Emotion | "caught at the exact inflection point between skepticism and amazement, the split-second when low expectations shatter into genuine delight" |

FOMO & Urgency (maps to: Negative Bias + aggressive time pressure)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | wide alarmed eyes with visible tension in brow muscles, rapid-looking gaze as if checking a countdown timer, intensity dialed to maximum |
| Mouth | tight set jaw with lips slightly parted, breathing visible urgency, the "we don't have time for me to explain slowly" tension |
| Head | pushed forward aggressively, chin jutting toward camera, neck muscles slightly visible from tension |
| Hands | one hand reaching toward camera in a "GRAB THIS NOW" gesture with fingers curved as if pulling the viewer in, other hand pointing at something off-frame |
| Body | aggressive forward lean from the waist, shoulders hunched and tense, coiled spring energy about to release |
| Emotion | "adrenaline-fueled urgency of someone who just found out the last tickets are selling NOW, desperate to tell you before it's too late" |

Social Proof (maps to: Speed & Value + data-backed confidence)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | steady confident gaze with relaxed brows, the unblinking certainty of someone backed by overwhelming evidence, subtle satisfied narrowing |
| Mouth | closed-lip knowing smile, the "numbers don't lie" quiet confidence, no need to oversell |
| Head | perfectly level and centered, chin neutral -- the composure of authority that doesn't need to try hard |
| Hands | arms crossed at chest with relaxed grip (not defensive), or one hand casually gesturing at data/products surrounding them |
| Body | settled back with squared shoulders and open chest, the "I could show you proof all day" relaxed authority |
| Emotion | "quiet unshakeable certainty backed by overwhelming evidence, the calm confidence of someone who doesn't need to convince -- the numbers already did" |

Comparison & Authority (maps to: Negative Bias + challenging superiority)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | one eyebrow raised in skeptical challenge, direct penetrating stare, the "are you SERIOUSLY still using that?" incredulity |
| Mouth | asymmetric smirk of amused superiority, one corner lifted, or lips pursed in thoughtful judgment |
| Head | tilted five degrees with chin slightly up, looking down the bridge of the nose -- subtle authority without arrogance |
| Hands | one index finger pointed upward as if making a definitive point, or one hand dismissively waving away the inferior option while other presents the superior |
| Body | one shoulder slightly forward in a confrontational stance, weight shifted to front foot, the "let me show you how it's really done" posture |
| Emotion | "amused intellectual superiority of someone who has tested both options and can't believe people still choose the wrong one" |

Hyper-Targeted (maps to: Relatability + intimate direct address)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | soft intense direct eye contact, pupils slightly dilated with genuine care, the "I'm talking directly to YOU and no one else" intimate focus |
| Mouth | gentle closed-lip smile of understanding, or lips parted as if about to say the viewer's name -- personal and warm |
| Head | subtle forward nod of recognition, slight tilt of empathy, moving closer to camera as if bridging the screen gap |
| Hands | one hand near heart in an "I feel this" gesture, or index finger pointing gently at camera -- not accusatory, inviting |
| Body | close to camera with intimate framing, shoulders soft, entire posture communicating "this space is just for us" |
| Emotion | "the warm targeted intimacy of a friend who pulls you aside at a party to say 'hey, I saw something and immediately thought of you'" |

Curiosity & Teaser (maps to: Curiosity Gap + excited anticipation)

| Element | Prompt Phrase |
|---------|--------------|
| Eyes | eyebrows raised high with bright excited eyes, pupils dilated with anticipation, the "you are NOT ready for what I'm about to show you" buildup |
| Mouth | lips pressed together tightly suppressing a grin, or biting lower lip with contained excitement -- visibly holding back information |
| Head | chin tucked slightly with eyes looking up through lashes, the teasing "should I tell you?" angle |
| Hands | both hands partially concealing or covering something in frame, or one hand hovering over an object about to be revealed |
| Body | slightly crouched or hunched forward as if protecting a secret, coiled anticipation energy, shoulders raised with excitement |
| Emotion | "barely contained excitement of someone sitting on incredible news, physically struggling to not spoil the reveal, vibrating with 'oh my god you need to see this'" |

---

Section 3: Lighting Presets -- 5 Hook Categories

Each preset produces a visually DISTINCT mood. Copy prompt phrases directly into the hook prompt.

Visual Shock Lighting

| Element | Value | Prompt Phrase |
|---------|-------|--------------|
| Pattern | Rembrandt with hard edge | "sharp Rembrandt key light from forty-five degrees camera-left" |
| Ratio | 4:1 high contrast | "at four to one lighting ratio, deep dramatic shadows" |
| Key temp | 3200K warm tungsten | "3200K warm tungsten key light" |
| Fill | Minimal, dark | "minimal fill, letting shadows go nearly black on shadow side" |
| Rim | Strong cool separation | "strong cool-toned rim light at 5600K from behind, creating sharp edge separation" |
| Shadow | Hard-edged, dramatic | "crisp shadow edges, Rembrandt triangle clearly defined on cheek" |
| Accent | Optional red/amber practical | "practical warm amber light source visible in background" |
| Mood | "dramatically lit like a thriller movie reveal scene" |

Negative Bias Lighting

| Element | Value | Prompt Phrase |
|---------|-------|--------------|
| Pattern | Short-side Rembrandt, underlit | "short-side Rembrandt key light from thirty degrees camera-right, illuminating the narrow side of face" |
| Ratio | 3:1 moody | "at three to one ratio, moody and serious but face still readable" |
| Key temp | 3800K neutral-warm | "3800K neutral warm key" |
| Fill | Cool subtle bounce | "cool 5000K subtle fill from below eye level, creating unsettling under-eye shadows" |
| Rim | Warm thin edge | "thin warm rim light from behind-left separating head from dark background" |
| Shadow | Soft but deep | "soft-edged shadows that swallow the background, face emerging from darkness" |
| Accent | Red glow from below or side | "faint red-amber accent glow from below frame edge, warning-signal energy" |
| Mood | "moody underlit like a documentary interview about a serious expose" |

Curiosity Gap Lighting

| Element | Value | Prompt Phrase |
|---------|-------|--------------|
| Pattern | Rembrandt with warm key | "classic Rembrandt key from forty-five degrees camera-right with warm golden quality" |
| Ratio | 4:1 with mystery | "at four to one ratio, shadow side mysterious but not threatening" |
| Key temp | 3200K warm golden | "3200K warm golden key light, amber quality" |
| Fill | Warm ambient only | "minimal fill from warm ambient bounce, shadow side glowing faintly with reflected warmth" |
| Rim | Subtle warm halo | "subtle warm rim light creating a soft halo separation, ethereal quality" |
| Shadow | Soft mysterious pools | "soft shadow pools that suggest hidden information, darkness that invites rather than repels" |
| Accent | Warm practicals in bokeh | "warm practical light sources visible as golden bokeh orbs in background" |
| Mood | "warmly mysterious like a firelit conversation where secrets are about to be shared" |

Relatability & Identity Lighting

| Element | Value | Prompt Phrase |
|---------|-------|--------------|
| Pattern | Loop or butterfly, soft | "soft loop lighting from slightly above and camera-left, flattering and natural" |
| Ratio | 2:1 gentle | "at gentle two to one ratio, open and approachable, no harsh shadows" |
| Key temp | 3500K warm natural | "3500K warm natural daylight quality, like golden hour through a window" |
| Fill | Large soft source | "large soft fill from camera-right wrapping the face with gentle light, mimicking window light" |
| Rim | Barely visible, warm | "barely perceptible warm rim light, natural and unforced" |
| Shadow | Minimal, soft transitions | "whisper-soft shadow transitions, no hard edges anywhere, skin glows with natural warmth" |
| Accent | Practical lifestyle sources | "warm practical light from desk lamp or string lights visible in background" |
| Mood | "beautifully natural like golden hour cafe light, intimate and real, as if photographed by a talented friend" |

Speed & Value Lighting

| Element | Value | Prompt Phrase |
|---------|-------|--------------|
| Pattern | Butterfly, clean | "clean butterfly lighting from directly above camera position, professional and authoritative" |
| Ratio | 2:1 balanced | "at two to one ratio, bright and confident, slight shadow under chin for definition" |
| Key temp | 4000K neutral | "4000K neutral-warm key, clean and professional without being cold" |
| Fill | Even, controlled | "controlled even fill from both sides, no distracting shadows, focus entirely on subject" |
| Rim | Subtle professional edge | "subtle professional rim light from behind, clean separation from background" |
| Shadow | Minimal, defined chin | "minimal shadows, just enough under chin and nose for three-dimensional definition" |
| Accent | Clean backlight | "clean white backlight creating slight glow around subject edges" |
| Mood | "crisply professional like a premium YouTube studio setup, trustworthy and polished" |

---

Section 4: Camera Angle Bank -- 5 Categories x 3 Variants

Each category has 3 distinct camera setups to prevent repetition. Rotate through A->B->C for successive carousels on the same topic.

Visual Shock Camera Variants

| Variant | Shot | Lens | Angle | DOF | Best For |
|---------|------|------|-------|-----|----------|
| A | CU (close-up) | 85mm f/1.8 | eye-level, dead center | razor shallow, only eyes and nose sharp | Standard shock hook -- maximum face impact |
| B | MCU (medium close-up) | 50mm f/2.0 | slight low angle, ten degrees up | shallow, face and hands sharp | Shock with visual action props visible |
| C | CU extreme | 135mm f/2.0 | slight dutch tilt, five degrees | ultra-shallow, single eye sharp | Intense disorienting shock -- premium content |

Negative Bias Camera Variants

| Variant | Shot | Lens | Angle | DOF | Best For |
|---------|------|------|-------|-----|----------|
| A | MCU | 85mm f/1.8 | eye-level, straight on | shallow, full face sharp | Standard warning hook -- direct confrontation |
| B | MCU tight | 50mm f/2.0 | slight high angle, looking down at viewer | shallow, face dominant | Authority warning -- "I'm telling you from experience" |
| C | MS (medium shot) | 35mm f/2.8 | eye-level, slight camera-left offset | medium, face and stop-gesture hand both sharp | Warning with body language -- full "stop" gesture visible |

Curiosity Gap Camera Variants

| Variant | Shot | Lens | Angle | DOF | Best For |
|---------|------|------|-------|-----|----------|
| A | MCU | 85mm f/1.8 | slight angle, ten degrees camera-right | shallow, face sharp, hidden object blurred | Standard mystery -- "I know something" |
| B | MS | 50mm f/2.0 | eye-level, centered | medium, face and partially hidden object both readable | Mystery with visible tease element |
| C | CU | 135mm f/2.0 | slight low angle, five degrees up | ultra-shallow, smirk and eyes dominant | Intimate secret-telling -- maximum intrigue |

Relatability & Identity Camera Variants

| Variant | Shot | Lens | Angle | DOF | Best For |
|---------|------|------|-------|-----|----------|
| A | MCU | 50mm f/2.0 | eye-level, slight camera-left offset | shallow, face sharp with lifestyle bokeh | Standard relatable -- cafe conversation feel |
| B | MS | 35mm f/2.8 | eye-level, centered | medium, face and environment both readable | Contextual relatable -- environment tells the story |
| C | MCU close | 85mm f/1.8 | slight high angle, five degrees down (intimate, peer) | shallow, face and coffee mug sharp | Intimate peer moment -- "just between us" |

Speed & Value Camera Variants

| Variant | Shot | Lens | Angle | DOF | Best For |
|---------|------|------|-------|-----|----------|
| A | MCU | 85mm f/1.8 | eye-level, centered, symmetrical | shallow, face sharp | Standard authority -- clean and confident |
| B | MS | 50mm f/2.0 | slight low angle, five degrees up (authority boost) | medium, face and hand-number-gesture sharp | Authority with number hook -- "3 steps" hand visible |
| C | MCU | 35mm f/2.8 | eye-level, centered | medium-wide, face and background tools/setup visible | Contextual authority -- studio/workspace visible as proof |

---

Section 5: Environment Palette -- 5 Hook Categories

Visual Shock Environment

| Element | Spec |
|---------|------|
| Background | Dynamic or disrupted environment -- scattered papers, tipped objects, motion blur elements, or stark minimalist void with single dramatic element |
| Color palette | High contrast warm-cool clash: warm tungsten (3200K) on subject, cool blue-teal accent in background |
| Props in frame | The visual action object (bread, coffee, ripped paper) must be prominent and lit. Background props suggest aftermath of disruption |
| Blur depth | f/1.8 with visible circular bokeh highlights, background dissolving into abstract warm-cool shapes |
| 3 depth layers | Foreground: visual action object detail / Subject: creator face with dramatic lighting / Background: disrupted environment with bokeh |
| Avoid | Calm orderly backgrounds, neutral tones, corporate settings, anything that undermines the shock |

Negative Bias Environment

| Element | Spec |
|---------|------|
| Background | Dark minimal environment emerging from shadow -- exposed brick, dark wood panel, or deep black void with subtle texture |
| Color palette | Dark warm browns and deep blacks, single warm key cutting through darkness, faint red-amber accent suggesting danger |
| Props in frame | Minimal -- the warning is about the MESSAGE, not the environment. One subtle danger-signal element (red light, warning icon, harsh shadow) |
| Blur depth | f/1.8 with dark warm bokeh, background nearly black with occasional warm light leak |
| 3 depth layers | Foreground: stop-gesture hand / Subject: underlit face emerging from darkness / Background: dark void with faint warm practicals |
| Avoid | Bright cheerful backgrounds, colorful props, cluttered environments, anything that dilutes seriousness |

Curiosity Gap Environment

| Element | Spec |
|---------|------|
| Background | Warm atmospheric space with depth and mystery -- library, candle-lit room, cozy workspace with warm practicals, golden hour interior |
| Color palette | Warm ambers and deep golds (#C98B3F, #8B6914), shadows that are warm not cold, everything bathed in golden mystery light |
| Props in frame | One partially hidden or blurred object that teases the reveal -- covered item, closed box, turned-away screen, shadow silhouette |
| Blur depth | f/1.8 with large warm golden bokeh orbs from practical lights, background invitingly soft |
| 3 depth layers | Foreground: hidden/teaser object partially visible / Subject: creator with knowing expression / Background: warm atmospheric space with golden bokeh |
| Avoid | Clinical bright spaces, stark minimalism, cold tones, fully revealed objects -- nothing should feel completely visible |

Relatability & Identity Environment

| Element | Spec |
|---------|------|
| Background | Authentic lifestyle setting the viewer recognizes -- home desk with real clutter, cafe corner with coffee and laptop, bedroom with warm string lights, cozy couch |
| Color palette | Warm naturals: cream, soft brown, muted sage, warm wood tones, nothing too saturated or too perfect -- real but elevated |
| Props in frame | Everyday recognizable objects -- coffee mug, phone, laptop, headphones, notebook, plant -- things the viewer owns. Not styled, naturally placed |
| Blur depth | f/2.0 with soft warm lifestyle bokeh, background readable enough to recognize the setting but not distracting |
| 3 depth layers | Foreground: lifestyle object (mug, phone) / Subject: creator in relatable posture / Background: recognizable room with warm practical lighting |
| Avoid | Studio setups, stark minimalism, luxury environments, anything that creates distance between creator and viewer |

Speed & Value Environment

| Element | Spec |
|---------|------|
| Background | Clean professional context -- organized desk with screens, bright modern workspace, or simple studio with clean backdrop |
| Color palette | Clean neutrals with professional warmth: white, light gray, warm wood, subtle accent from screens or tools. Crisp and organized |
| Props in frame | Tools of expertise visible -- screens showing relevant content, books, organized supplies, the specific product/tool mentioned in hook |
| Blur depth | f/2.8 with soft professional bokeh, background clean but slightly readable showing competence signals |
| 3 depth layers | Foreground: product or hand gesture / Subject: confident creator / Background: clean professional environment with competence signals |
| Avoid | Messy environments, dark moody lighting, overly casual settings, anything that undermines professional credibility |

---

Section 6: Visual Action x Expression Synergy Matrix

When combining a Visual Action (from hook-science) with a hook category expression (from Sections 1-2 above), the expression MODIFIES. The pose comes from the visual action; the face comes from the hook category -- but they influence each other.

Primary Synergies (Most Common Pairings)

Visual Shock + Destruction (primary visual action)
- Modification: Shock expression amplified -- mouth wider, eyes more intense, caught at the exact moment of ripping/snapping
- Pose override: Both hands engaged in destruction action. Shock expression stays on face while body executes aggressive motion
- Prompt phrase: "frozen at the peak moment of aggressively ripping paper in half, torn edges suspended mid-air, eyes blown wide with visceral shock intensity, jaw dropped, the split-second between action and reaction"

Visual Shock + Scale Absurd (secondary)
- Modification: Shock redirected to amazement at scale -- eyes tracking the oversized/tiny object, mouth open in "how is this real" wonder
- Prompt phrase: "standing next to an absurdly oversized object, eyes wide tracking upward, jaw dropped in genuine scale-shock, body leaning back as if the object just appeared"

Negative Bias + Minum Dramatic (primary)
- Modification: Warning intensity maintained during casual sip -- the CONTRAST is the pattern interrupt. Serious face + casual action = "I'm so certain about this warning I can deliver it casually"
- Prompt phrase: "slow deliberate coffee sip with mug at lip level, steam rising past intense narrowed warning eyes, brows furrowed with grave seriousness despite the casual action, other hand pointing firmly at camera"

Negative Bias + Contradiction Pose (secondary)
- Modification: Concerned expression in mismatched emotional context -- smiling environment but creator is deadly serious
- Prompt phrase: "surrounded by cheerful bright environment but face locked in stern warning mode, creating jarring emotional mismatch, brows drawn together, tight jaw, arms crossed protectively"

Curiosity Gap + Satisfying Process (primary)
- Modification: Knowing smirk maintained while hands perform satisfying action -- the reveal IS the process. Eyes stay locked on camera with "watch this" energy
- Prompt phrase: "pouring honey in a slow golden stream with one hand, other hand hovering near the result, knowing smirk locked on camera, one eyebrow raised as if saying 'keep watching', warm golden backlighting catching the pour at peak moment"

Curiosity Gap + Makan Nyeleneh (secondary)
- Modification: Mysterious knowing expression while casually eating -- "I know a secret and I'm making you wait while I eat"
- Prompt phrase: "mid-bite into bread with knowing half-smirk, cheek slightly puffed, one eyebrow raised, eyes locked on camera with amused secrecy, the deliberate casualness making the viewer desperate to know what the secret is"

Relatability + Wrong Context (primary)
- Modification: Relatable frustration/joy expression placed in absurd wrong setting -- creator in pajamas at a formal event, or working from a hammock. Expression stays authentic, setting is wrong
- Prompt phrase: "wearing casual loungewear sitting at a formal conference table, soft relatable smile with genuine warmth in eyes, completely unbothered by the absurd context, one hand holding coffee mug, posture relaxed and comfortable despite wrong setting"

Relatability + Mundane Zen (secondary)
- Modification: Calm peer expression against chaotic background -- creator is the calm center of relatable chaos
- Prompt phrase: "sitting cross-legged in meditation pose with soft warm smile, serene relatable expression, while background shows chaos of notification popups, scattered papers, buzzing devices -- the eye of the storm of modern life"

Speed & Value + Props Overflow (primary)
- Modification: Confident authority expression while surrounded by proof -- the abundance of tools/products validates the authority claim
- Prompt phrase: "sitting confidently at center of a cascade of relevant tools and products, chin up with direct authoritative gaze, hands confidently presenting the setup, surrounded but not overwhelmed -- commanding the abundance"

Speed & Value + Extreme Close-Up (secondary)
- Modification: Authority compressed into intimate macro framing -- the confidence reads even stronger at extreme proximity
- Prompt phrase: "extreme tight close-up of confident direct eyes and bridge of nose filling the frame, every pore visible, authoritative steady gaze unwavering, one hand visible at edge of frame holding up a number gesture"

Curiosity Gap + Era Clash (primary for new category)
- Modification: Knowing "I see the future" expression while committed to ancient warrior role -- the anachronism is played completely straight
- Pose override: Full ancient warrior pose (shield raised, sword drawn, battle stance) while face shows hook category expression
- Prompt phrase: "fully committed to ancient roman gladiator warrior stance, raising a battle-scarred bronze shield against incoming modern assault rifle fire, sparks flying on impact with shell casings bouncing, screaming battle cry with eyes squeezed shut, veins visible on neck -- the clash between ancient armor and modern bullets is the cognitive dissonance hook"

Visual Shock + Riding Absurd (primary for new category)
- Modification: Maximum shock expression amplified by physical impossibility -- genuine terror of the ride, body language shows real wind resistance and grip
- Pose override: Both hands gripping the vehicle/object, body leaning into wind, physical reaction to speed/height
- Prompt phrase: "physically mounted on top of a missile mid-flight through clouds, military flight suit flapping in wind, hair/wig flying off behind, one hand gripping desperately while other reaches for escaping glasses, eyes wide with genuine shock, mouth open screaming into wind, body leaning forward against air resistance"

Negative Bias + Physical Impossibility (primary for new category)
- Modification: Warning seriousness while performing impossible feat -- played completely straight, no humor on face. The impossibility reinforces the gravity of the warning
- Prompt phrase: "catching a speeding bullet between two fingers with deadpan serious expression, slight frown of concentration, veins visible on forearm, ground cracking beneath feet from the force -- treats the impossible as completely routine, making the warning feel even more authoritative"

Negative Bias + Danger Zone (primary for new category)
- Modification: Calm warning authority in the center of chaos -- the danger is AROUND the creator, but they deliver the warning message unflinchingly
- Prompt phrase: "standing calmly at the center of massive explosions and flying debris, torn jacket and dust-covered but expression steady with grave seriousness, one hand raised in warning gesture, the environmental chaos emphasizes the urgency of the warning"

Synergy Rules (For Non-Primary Pairings)

When combining any visual action with any hook category not listed above:
1. Pose/body/hands -> comes from the Visual Action prompt fragment (hook-science)
2. Eyes and mouth -> comes from the hook category Expression Library (Section 1-2 above)
3. Head position -> follows the visual action (eating = slight forward lean, drinking = chin up, destruction = aggressive forward, satisfying process = slight tilt watching the action)
4. Emotion keyword -> combine both: "[category emotion] while [action qualifier]"
   - Example: "intense protective warning while casually mid-bite" (Negative Bias + Makan Nyeleneh)
   - Example: "genuine price-discovery amazement while holding absurd oversized product" (Unbeatable Value + Scale Absurd)
5. Lighting -> always from the hook CATEGORY preset (Section 3), not the visual action
6. Camera -> always from the hook CATEGORY camera bank (Section 4), not the visual action

---

Section 7: Anti-Repetition Variation System

When generating MULTIPLE carousels for the same topic category, rotate through variant sets to ensure visual variety.

Rotation Rules
1. First carousel on a topic -> Variant A (default)
2. Second carousel on same topic in session -> Variant B
3. Third carousel -> Variant C
4. Fourth+ -> cycle back to A but switch to secondary Visual Action from Topic mapping
5. If unsure which variant was used before -> always pick B (it's the middle-ground variant most different from the expected default)

Visual Shock Variants

| Variant | Camera | Lighting Modifier | Environment Modifier | Expression Intensity |
|---------|--------|-------------------|---------------------|---------------------|
| A: Classic Impact | CU 85mm, eye-level | Standard 4:1 Rembrandt | Dark disrupted, warm-cool clash | Peak shock -- full frozen recoil |
| B: Dynamic Angle | MCU 50mm, low angle | 3:1 with strong cool rim | Industrial/concrete texture, blue-teal accent | Aggressive shock -- leaning INTO the surprise |
| C: Intimate Disbelief | CU extreme 135mm, dutch tilt | 5:1 with single hard spotlight | Near-black void, single dramatic light source | Quiet internal shock -- wide eyes, closed mouth, stunned silence |

Negative Bias Variants

| Variant | Camera | Lighting Modifier | Environment Modifier | Expression Intensity |
|---------|--------|-------------------|---------------------|---------------------|
| A: Direct Warning | MCU 85mm, eye-level | Standard 3:1 underlit | Dark minimal, exposed brick | Firm confrontational -- stop gesture |
| B: Authority Concern | MCU 50mm, high angle | 2:1 with warm overhead | Dark wood office, single desk lamp | Worried mentor -- pointing at viewer with concern |
| C: Full-Body Stop | MS 35mm, eye-level | 3:1 with red accent from side | Deep black with danger-red side light | Physical urgency -- full body leaning forward, both hands engaged |

Curiosity Gap Variants

| Variant | Camera | Lighting Modifier | Environment Modifier | Expression Intensity |
|---------|--------|-------------------|---------------------|---------------------|
| A: Classic Mystery | MCU 85mm, slight angle | Standard 4:1 warm Rembrandt | Warm library/golden interior | Standard knowing smirk |
| B: Intimate Secret | CU 135mm, low angle | 3:1 with warm amber key only | Near-dark with candle-quality single source | Intense whisper -- lips near "shush" position |
| C: Tease Reveal | MS 50mm, centered | 2:1 with bright warm key | Atmospheric room with blurred reveal object prominent | Excited anticipation -- barely holding back the reveal |

Relatability & Identity Variants

| Variant | Camera | Lighting Modifier | Environment Modifier | Expression Intensity |
|---------|--------|-------------------|---------------------|---------------------|
| A: Cafe Conversation | MCU 50mm, slight offset | Standard 2:1 soft loop | Cafe/desk with coffee and laptop | Warm recognition -- "oh you too?" |
| B: Bedroom Real | MCU 85mm, high angle | 1.5:1 ultra-soft window light | Bedroom/couch with string lights | Vulnerable honesty -- genuine micro-expressions |
| C: On-the-Go | MS 35mm, eye-level | 2:1 with golden hour backlight | Outdoor urban casual setting | Casual confident -- walking toward camera energy |

Speed & Value Variants

| Variant | Camera | Lighting Modifier | Environment Modifier | Expression Intensity |
|---------|--------|-------------------|---------------------|---------------------|
| A: Studio Authority | MCU 85mm, centered | Standard 2:1 butterfly | Clean professional studio | Calm confident -- direct unwavering |
| B: Proof Setup | MS 50mm, low angle | 2:1 with cool backlight | Workspace with screens and tools visible | Active teaching -- mid-explanation energy |
| C: Intimate Expertise | MCU 35mm, eye-level | 2:1 with warm side key | Home setup with real tools around | Approachable expert -- close and personal competence |

---

Section 8: Performance Benchmarks by Hook Category

Category-level engagement data mapped from research sources already cited in hook-science.

5 Hook Category Performance

| Category | Save Rate | Share Rate | Comment Rate | Dwell Time | Best Platform | Source |
|----------|-----------|-----------|-------------|------------|--------------|--------|
| Visual Shock | Medium | High (surprise = share) | Medium | +131% attention retention | TikTok, IG Reels | TokPortal Q2-2025 |
| Negative Bias | Highest (reference saves) | High (controversy shares) | Highest (debate comments) | +48% retention | IG Feed, LinkedIn | Nike Q2-2025, Outbrain |
| Curiosity Gap | High (mystery = revisit) | Medium | High (FOMO comments) | +41% watch time | TikTok, IG | Sephora May-2025, Virvid |
| Relatability | Medium | Highest (tag friends) | High (shared experience) | +31% vs polished | IG, Threads | OpusClip 2026, Virvid |
| Speed & Value | Highest (utility saves) | High (helpful shares) | Medium | 85% muted-compatible | IG Feed, LinkedIn | Virvid 2026, DriveEditor |

8 Formula Category Performance

| Category | Primary Engagement Signal | Conversion Strength | Best For | Source |
|----------|--------------------------|---------------------|----------|--------|
| Unbeatable Value | Saves (price reference) | High -- drives purchase intent | Budget tips, tool comparison | Ariely price anchoring research |
| Problem-Solver | Saves (solution reference) + Comments (pain discussion) | Highest -- 2:1 outperforms generic | Tutorials, how-to, workflow fixes | Virvid 2026 |
| Plot Twist | Shares (surprise = share trigger) | Medium-high -- +400% dopamine spike | Myth-busting, contrarian opinion | Copenhagen neuro studies |
| FOMO & Urgency | Comments (urgency drives action) | High -- +83% comment rate | Trend alerts, deadline content | Virvid 2026 |
| Social Proof | Saves (data = reference material) | Medium -- list hooks 2.5x more saved | Stats-based, trending topic | Virvid 2026 |
| Comparison & Authority | Comments (debate trigger) + Shares | High -- +63% CTR with negative framing | Old vs new, method challenge | Outbrain 65K headlines |
| Hyper-Targeted | Shares (tag friends) + DM shares | Highest -- +91.7% engagement from call-out | Niche audience, community identity | Virvid direct call-out hooks |
| Curiosity & Teaser | Dwell time + Completion rate | Medium -- +41% watch time with reveal format | Series content, step-by-step | Sephora May-2025 |

Per-Formula Notable Performance (Where Data Exists)

- Formula #1 (Problem-Solver: "Akhirnya gue nemu X yang gak gampang Y") -- Discovery framing triggers curiosity gap + pain resolution dual signal. High save rate
- Formula #12 (Hyper-Targeted: "Kesal gak sih kalau X?") -- High-arousal negative emotion drives 2x more sharing than low-arousal (Kahneman)
- Formula #21 (FOMO: "Jangan beli X karena kalian bakal Y") -- Reverse psychology = highest curiosity driver. Pattern interrupt through contradiction
- Formula #47 (Curiosity: "Ini part # X") -- Series hook triggers completionist behavior. Each part drives return visits
- Formula #13 (Plot Twist: "gue kira bakal Y tapi ternyata Z") -- Vulnerability + surprise = Narrative Transport (Green & Brock). Highest trust-building formula

---

Section 10: Costume/Wardrobe Library

Topic-based costume profiles with prompt-ready descriptions. Agent reads topic -> picks matching costume -> inserts at [Wardrobe] slot in hook template.

Selection Rule (Scene-Override Priority)

Costume selection follows a 3-level priority chain. Scene context from the Visual Hook Idea overrides topic category.

Priority Chain:
1. User override (always wins) -- if user explicitly specifies wardrobe -> use that, skip everything below
2. Visual Hook Idea scene context -- if the hook scene implies a specific environment, costume MUST match the scene (see Scene -> Costume Override Table below)
3. Topic category (fallback) -- ONLY used when scene is neutral/studio/generic. Match topic to closest category below

Scene -> Costume Override Table:

| Scene Context | Costume Override | Why |
|--------------|-----------------|-----|
| Night market / street food stall | casual streetwear tee or open flannel, shorts or relaxed jeans | blazer at pasar malam = uncanny |
| Beach / waterfront | tank top or open linen shirt, board shorts or rolled-up pants | formal at beach = absurd (wrong kind) |
| Kitchen / cooking scene | apron over casual tee, sleeves rolled up | clean and practical |
| Gym / sports arena | athletic wear, compression shirt or tank | matches physical setting |
| Lab / science facility | lab coat over smart casual, safety goggles on forehead | institutional context |
| Construction / industrial site | high-vis vest over casual shirt, hard hat optional | safety context |
| Formal event / stage / podium | full suit or blazer + dress shirt | formal setting matches formal wear |
| Classroom / lecture hall | smart casual -- button-up or polo, no blazer | approachable academic |
| Home / living room | relaxed hoodie or casual tee, comfortable pants | domestic context |
| Neutral studio / plain background | Use topic category below (fallback) | no scene context to override |

Rule: If the hook visual places the creator in a night market holding giant cockroach skewers, the costume is casual streetwear -- NOT a finance blazer, even if the topic is investment-related. The scene always wins over the topic.

Costume descriptions are prompt-ready -- copy the Prompt Phrase directly into the [Wardrobe] slot.

Finance / Investment

| Element | Spec |
|---------|------|
| Top | fitted dark navy blazer over crisp white open-collar dress shirt |
| Bottom | dark tailored trousers, slim fit |
| Accessories | subtle leather-strap watch on wrist, thin silver ring optional |
| Texture | smooth wool blazer, crisp cotton shirt, natural fabric grain visible under warm light |
| Color palette | navy, white, charcoal, muted gold accents |
| Prompt phrase | wearing a fitted dark navy blazer over a crisp white open-collar shirt, dark tailored trousers, subtle leather watch visible on wrist, smooth wool and cotton textures catching warm side light |

Tech / AI

| Element | Spec |
|---------|------|
| Top | clean fitted tech hoodie or minimal crewneck sweatshirt in dark charcoal or black |
| Bottom | dark slim joggers or clean dark jeans |
| Accessories | wireless earbuds visible in one ear, minimal smart watch |
| Texture | soft premium fleece or knit, matte fabric, clean modern lines |
| Color palette | charcoal, black, dark gray, subtle neon accent edge optional |
| Prompt phrase | wearing a clean fitted dark charcoal tech hoodie with minimal design, dark slim joggers, wireless earbud visible in one ear, soft premium fleece fabric with matte texture |

Health / Fitness

| Element | Spec |
|---------|------|
| Top | fitted athletic tank top or dry-fit performance tee in deep color |
| Bottom | athletic shorts or fitted training pants |
| Accessories | fitness tracker on wrist, towel draped over one shoulder optional |
| Texture | moisture-wicking fabric with subtle mesh panels, compression fit |
| Color palette | deep navy, forest green, black, bright accent stripe optional |
| Prompt phrase | wearing a fitted deep navy athletic performance tee with subtle mesh panels, fitted training pants, fitness tracker on wrist, moisture-wicking fabric texture visible under gym lighting |

Food / Cooking

| Element | Spec |
|---------|------|
| Top | casual tee or henley with a canvas cooking apron layered over it |
| Bottom | relaxed jeans or chinos, slightly flour-dusted optional |
| Accessories | rolled sleeves to forearm, kitchen towel tucked in apron string |
| Texture | canvas apron with visible weave, soft cotton underneath, natural kitchen wear |
| Color palette | cream apron, warm earth tones, natural whites and tans |
| Prompt phrase | wearing a canvas cooking apron over a relaxed cream henley with sleeves rolled to forearms, kitchen towel tucked in apron string, natural canvas weave and soft cotton textures visible |

Education / Tutorial

| Element | Spec |
|---------|------|
| Top | smart casual button-up shirt with top button open, or clean fitted polo |
| Bottom | dark chinos or clean jeans |
| Accessories | reading glasses pushed up on head or worn optional, pen in shirt pocket optional |
| Texture | crisp cotton or oxford cloth, slightly lived-in but polished |
| Color palette | light blue, white, soft gray, warm khaki |
| Prompt phrase | wearing a smart casual light blue oxford button-up with top button open and sleeves casually rolled, dark chinos, crisp cotton fabric with natural texture, approachable teacher energy |

Business / Startup

| Element | Spec |
|---------|------|
| Top | crisp fitted button-up shirt in white or light color, no tie, top two buttons open |
| Bottom | tailored dark trousers or clean dark jeans |
| Accessories | leather notebook or phone in hand optional, minimal silver cufflinks optional |
| Texture | premium cotton poplin, sharp press, professional but not corporate |
| Color palette | white, light gray, navy, clean neutrals |
| Prompt phrase | wearing a crisp white fitted button-up shirt with top two buttons open, tailored dark trousers, premium cotton with sharp press, startup founder energy -- professional but not corporate |

Lifestyle / Travel

| Element | Spec |
|---------|------|
| Top | relaxed linen shirt or lightweight casual jacket, open front |
| Bottom | comfortable chinos or relaxed cotton pants |
| Accessories | sunglasses pushed up on head, leather bracelet or travel watch |
| Texture | natural linen with gentle creases, lightweight breathable fabric |
| Color palette | warm sand, olive, cream, faded indigo, earth tones |
| Prompt phrase | wearing a relaxed olive linen shirt with open front over a simple white tee, comfortable sand chinos, natural linen creases catching warm golden light, travel-ready effortless style |

Productivity / Tools

| Element | Spec |
|---------|------|
| Top | clean minimalist crewneck or fitted long-sleeve tee in solid neutral |
| Bottom | clean dark slim jeans or technical pants |
| Accessories | smart watch, single stud earring optional, minimal aesthetic |
| Texture | smooth cotton or technical knit, clean lines, no logos or prints |
| Color palette | black, white, gray, navy -- monochrome minimal |
| Prompt phrase | wearing a clean minimalist black crewneck in smooth cotton, dark slim jeans, smart watch on wrist, intentionally minimal and functional -- the wardrobe itself is optimized |

Creative / Design

| Element | Spec |
|---------|------|
| Top | artistic layered outfit -- oversized graphic tee under an open denim or workwear jacket |
| Bottom | relaxed wide-leg pants or paint-stained jeans |
| Accessories | visible tattoos optional, chunky rings, colored scarf or bandana, artsy earrings |
| Texture | mixed textures -- denim over soft cotton, canvas patches, artistic intentional imperfection |
| Color palette | bold accent color against neutrals, one statement piece stands out |
| Prompt phrase | wearing an oversized graphic tee under an open raw denim workwear jacket, relaxed wide-leg pants, chunky silver rings on fingers, mixed textures of denim and soft cotton, artsy layered creative energy |

News / Current Events

| Element | Spec |
|---------|------|
| Top | clean professional blazer or structured jacket over fitted dark turtleneck or crew |
| Bottom | dark tailored trousers |
| Accessories | minimal -- clean professional appearance, no distracting elements |
| Texture | structured wool or blend jacket, smooth dark knit underneath, anchor-desk polished |
| Color palette | black, charcoal, deep navy, muted tones -- serious and credible |
| Prompt phrase | wearing a structured dark charcoal blazer over a fitted black turtleneck, dark tailored trousers, smooth structured wool and knit textures, news anchor polished -- serious and credible authority |

Default / Smart Casual (Fallback)

Use when topic doesn't clearly match any category above.

| Element | Spec |
|---------|------|
| Top | clean fitted button-up or henley in neutral color, sleeves rolled to forearms |
| Bottom | dark clean jeans |
| Accessories | simple watch, minimal jewelry |
| Texture | clean cotton or linen, natural fabric grain |
| Color palette | white, gray, navy, warm neutrals |
| Prompt phrase | wearing a clean fitted white button-up with sleeves rolled to forearms, dark clean jeans, simple watch on wrist, natural cotton fabric catching warm ambient light |

---

Section 11: Prop/Tool Interaction System

Systematic prop selection based on topic x hook category x visual action. Replaces generic props ("bread," "rubber duck") with topic-aware or strategically absurd objects.

11a. Topic -> Prop Bank

For each topic, Topic-Related props visually signal the subject matter. Random Absurd props have zero connection -- pure WTF factor.

Finance / Investment
Topic-Related: golden coin, stock chart printout, calculator with numbers on screen, credit card, bundled cash stack
Random Absurd: raw whole fish, rubber duck, traffic cone

Tech / AI
Topic-Related: tangled USB cables, circuit board, vintage floppy disk, robot figurine, oversized computer mouse
Random Absurd: pineapple, garden gnome, kitchen whisk

Health / Fitness
Topic-Related: dumbbell, protein shaker bottle, yoga mat rolled up, measuring tape, green smoothie in glass
Random Absurd: cactus pot, flip-flop sandal, alarm clock

Food / Cooking
Topic-Related: fresh durian cut open, chef knife, wooden cutting board with ingredients, steaming pot, spice jars
Random Absurd: laptop computer, necktie, phone charger cable

Education / Tutorial
Topic-Related: stack of heavy textbooks, oversized magnifying glass, chalkboard eraser, graduation cap, notebook with sticky notes
Random Absurd: rubber chicken, boxing glove, watering can

Business / Startup
Topic-Related: whiteboard marker, pitch deck printout, sticky note wall, business card stack, trophy/award
Random Absurd: pool noodle, oven mitt, snow globe

Lifestyle / Travel
Topic-Related: passport, vintage suitcase, world map, polaroid camera, plane ticket
Random Absurd: fire extinguisher, toilet plunger, disco ball

Productivity / Tools
Topic-Related: hourglass, stacked planners, multiple phone screens, keyboard, cable management clips
Random Absurd: banana, garden hose, rubber stamp

Creative / Design
Topic-Related: paint-splattered palette, oversized pencil, color swatch fan deck, camera lens, sketchbook
Random Absurd: iron (clothes), fish bowl, umbrella

News / Current Events
Topic-Related: rolled newspaper, microphone, press badge, breaking news printout, red folder marked confidential
Random Absurd: teddy bear, beach ball, toilet paper roll

11b. Prop x Visual Action Interaction Matrix

How each Visual Action modifies prop usage. The interaction column tells the agent exactly HOW the creator physically engages with the selected prop.

| Visual Action | Prop Source | Physical Interaction | Prompt Detail |
|---|---|---|---|
| Makan Nyeleneh | Topic-Related OR Absurd | Creator BITES/EATS the prop | "mid-bite into [prop], teeth making contact with surface, crumbs or fragments visible, the absurd act of eating [prop] contrasts with the serious headline" |
| Minum Dramatic | Topic-Related OR Absurd | Creator DRINKS from/with prop | "holding [prop] at lip level as if sipping from it, steam or condensation optional, eyes locked on camera over the [prop], intense knowing stare" |
| Objek Absurd | Random Absurd ONLY | Creator HOLDS with deadpan | "holding [absurd prop] at chest height with completely flat serious expression, dead-pan stare at camera, the object has zero connection to the headline topic" |
| Destruction | Topic-Related preferred | Creator RIPS/BREAKS/SMASHES | "mid-action tearing apart [prop], fragments and pieces visible in the air, aggressive confident energy, the physical destruction of [prop] mirrors dismantling the old belief" |
| Satisfying Process | Topic-Related preferred | Creator performs SATISFYING action with prop | "slow deliberate [pouring/slicing/peeling/unboxing] of [prop], captured at the peak satisfying moment, warm backlighting catching the texture and detail" |
| Scale Absurd | Topic-Related preferred | Creator dwarfed by OVERSIZED prop | "standing next to an absurdly oversized version of [prop], looking up at it with genuine amazement, one hand reaching toward it, the extreme scale difference creates immediate visual shock" |
| Wrong Context | Topic-Related | Prop NORMAL but SETTING is absurd | "using [prop] as if completely normal while sitting in [absurd setting -- beach, jungle, rooftop edge, laundromat], relaxed unbothered expression despite the environmental mismatch" |
| Frozen Mid-Action | Topic-Related OR Absurd | Creator FROZEN mid-interaction | "captured at the peak moment of [throwing/catching/dropping/juggling] [prop], body suspended in dynamic pose, hair and clothing showing motion blur, the [prop] frozen mid-trajectory" |
| Extreme Close-Up | Topic-Related preferred | MACRO shot of prop interaction | "extreme tight close-up of hands [gripping/slicing/pressing/opening] [prop], filling most of the frame, every texture hyper-visible -- surface detail, skin pores, material grain -- uncomfortably intimate" |
| Props Overflow | Topic-Related ONLY | Creator BURIED in many props | "sitting at center surrounded by an overwhelming abundance of [topic props from 11a], slightly buried under the pile, expression of knowing confidence or overwhelmed excitement amid the chaos" |
| Contradiction Pose | Topic-Related | Emotional MISMATCH with prop | "smiling warmly and laughing while casually holding [serious/warning topic prop], or maintaining stone-faced seriousness while surrounded by [fun/playful topic props], the emotional mismatch forces curiosity" |
| Mundane Zen | Topic-Related as background chaos | Props create CHAOS behind calm creator | "creator in serene meditation pose or calmly sipping tea, peaceful half-lidded eyes, while behind them [topic props] are scattered chaotically -- [props] flying, falling, stacked precariously, creating visible disorder" |

11c. Hook Category -> Prop Selection Rule

Which prop type the agent picks based on the selected hook category.

| Hook Category | Prop Type | Why | Example (Finance topic) |
|---|---|---|---|
| Visual Shock | Random Absurd | Maximum WTF pattern interrupt -- topic only visible from headline text | Creator biting raw fish while headline says "RAHASIA INVESTASI" |
| Negative Bias | Topic-Related | Warning object reinforces the "danger" message -- prop IS the threat | Creator ripping stock chart while headline warns about financial mistake |
| Curiosity Gap | Topic-Related | Visual clue teases the topic -- viewer connects prop + headline for partial reveal | Creator holding golden coin with knowing smirk -- "what does he know?" |
| Relatability | Topic-Related | Recognizable everyday object = "gue juga punya itu" identification | Creator holding phone showing calculator app -- relatable daily tool |
| Speed & Value | Topic-Related | Tool/product shown = immediate value association -- "I need that tool" | Creator confidently presenting calculator with visible numbers |

11d. Prop Selection Decision Tree

When generating a hook slide, follow this sequence:

1. Identify topic -> find matching Topic Category in Section 11a
   (If no match -> use closest category or Default props: pen, notebook, coffee mug, phone, whiteboard)

2. Read hook category (from MANDATORY selection in prompt-formulas)
   -> Check Section 11c for prop type: Topic-Related or Random Absurd

3. Read visual action (from Visual Action Hook Bank in hook-science)
   -> Check Section 11b for physical interaction style

4. Pick a specific prop from the bank that works with the interaction:
   - If prop type = Topic-Related -> pick from Topic-Related list in 11a
   - If prop type = Random Absurd -> pick from Random Absurd list in 11a
   - Prefer props that physically work with the action (e.g., Makan = something bite-able)

5. Write into prompt:
   - Costume: [Wardrobe] slot from Section 10
   - Prop + interaction: [Action/pose] slot using interaction phrase from 11b

---

Quick Reference: Category Visual Fingerprint

Use this table to verify each category produces a VISUALLY DISTINCT image:

| Category | Face Signature | Lighting Signature | Color Signature | Energy | Prop Type |
|----------|---------------|-------------------|----------------|--------|-----------|
| Visual Shock | Wide eyes, dropped jaw, recoil | Hard 4:1, strong rim, deep shadows | Warm-cool clash, high contrast | Explosive, sudden | Random Absurd |
| Negative Bias | Furrowed brows, tight lips, stop gesture | Moody 3:1, underlit, red accent | Dark warm browns, deep blacks | Intense, confrontational | Topic-Related |
| Curiosity Gap | Asymmetric smirk, one raised brow | Warm 4:1 Rembrandt, golden mystery | Warm ambers and deep golds | Mysterious, conspiratorial | Topic-Related |
| Relatability | Soft smile, gentle eye contact, nod | Soft 2:1, natural window light | Warm naturals, cream and wood | Warm, intimate, peer | Topic-Related |
| Speed & Value | Steady gaze, chin up, number gesture | Clean 2:1 butterfly, professional | Clean neutrals, professional warmth | Confident, authoritative | Topic-Related |

If two hook slides from different categories look similar, something is wrong. Re-read the category profiles above.
`;
