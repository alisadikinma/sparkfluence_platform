// Prompt Formulas -- Nano Banana Pro — RAG knowledge for LLM prompt injection
// Source: ai-image-carousel-prompt-gen/references/prompt-formulas.md
// Exported as template literal for Deno Edge Function compatibility

export const PROMPT_FORMULAS_KNOWLEDGE = `
PROMPT FORMULAS -- NANO BANANA PRO

GOLDEN RULE
Treat every prompt like a Creative Director brief -- natural language, NOT keyword spam.
- Use: "Maintain exact appearance from reference image" for character consistency
- Text rendered IN-IMAGE -- all headlines, accents, branding, and labels are part of the prompt
- Default language: Per branding kit Language section (bilingual by default). Single language on user request

---

PROMPT BODY RENDERING RULES (NANO BANANA PRO)

Nano Banana Pro renders ALL text in the prompt as visible image content. To prevent unwanted text artifacts in generated images, follow these rules strictly when writing the actual prompt body:

| Rule | Wrong (renders as text) | Correct |
| Only in-image text in ALL CAPS | "Text must be ULTRA MASSIVE" | "the text uses the largest possible font size" |
| No instruction caps | "MANDATORY: render the icon" | "render the icon" |
| No // separators | "120 TB/DETIK // KECEPATAN: CAHAYA" | "120 TB/DETIK" (core data only) |
| No raw percentages | "30% opacity" | "thirty percent opacity, subtle background mark only" |
| No raw filenames in body | "creator-brand.png rendered in corner" | "render the creator's brand icon from reference image creator-brand.png as a small circular badge" |
| No "Shot on" prefix | "Shot on 85mm f/1.8" | "Lens: 85mm f/1.8" |
| No category tags | '"TEKNOLOGI" badge above headline' | (remove entirely) |
| No metadata labels in HUD | "THROUGHPUT: 120 TB/DETIK" | "120 TB/DETIK" |
| Sizing via description | "MASSIVE billboard-scale" | "the largest possible font size that fills the width, extra bold weight" |
| Positioning lowercase | "CENTERED in the middle" | "centered in the middle" |
| Negations lowercase | "NOT cold blue" | "not cold blue" |

What MAY be ALL CAPS in prompt body (actual in-image text):
- Headline text: "INSANE -- THIS IS WHAT HAPPENS IN 1 SECOND ON EARTH"
- HUD display data: "120 TB/SEC"
- CTA text: "[config: swipe_cta_text]"
- Power words within headlines: "INSANE"
- Watermark handle: "[config: handle]"

---

PROMPT FORMATTING RULE (MANDATORY)

Every prompt MUST use paragraph breaks between these sections:
1. Subject + expression + wardrobe + action (paragraph 1)
2. Scene/environment + spatial layers (paragraph 2)
3. Lens + lighting + film stock + atmosphere + texture (paragraph 3)
4. Text overlay block (paragraph 4)
5. Aspect ratio + constraints (paragraph 5)

Single-block prompts = REJECTED. Paragraph structure improves AI model comprehension and makes prompts auditable.

---

CAMERA SPECS FORMAT (MANDATORY)

Camera specifications MUST start with "lens:" prefix on its own line/section:
lens: [focal]mm f/[aperture], [angle], [depth of field].
Do NOT embed lens specs inside scene description prose.

---

TEXT OVERLAY ENFORCEMENT (MANDATORY)

Every text overlay block MUST include ALL three of these rules -- omitting any one causes rendering failures:

1. Remaining text in white -- after specifying accent-colored keywords, explicitly state "remaining text in white"
2. Not crammed at the very bottom -- include "positioned starting from the vertical center of the image extending downward, not crammed at the very bottom"
3. Subtitle must not be white -- include "subtitle must not be white" after the subtitle line specification

Missing any of these three = REJECTED. These are the top causes of bad text hierarchy in generated images.

---

NANO BANANA PRO -- STRUCTURE (8-ELEMENT PRIORITY ORDER)
1. Subject (who/what) -- always first
2. Action/pose
3. Setting/location
4. Camera/composition (shot type, angle)
5. Lighting/atmosphere (MUST include lighting pattern, ratio, Kelvin)
6. Style/medium (MUST include film stock, color grade)
7. Texture/cinematic detail (MUST include texture realism + DP reference)
8. In-image text rendering (headline, accent words, branding, labels)

All 8 elements are MANDATORY in every prompt. No exceptions.

---

TEXT RENDERING -- IN-IMAGE (NOT POST-PRODUCTION)

All user-facing text is rendered directly in the AI-generated image. The prompt MUST describe:

Text Elements to Include:
| Element | Where | Rule |
| Main headline | Bottom gradient zone | White bold condensed ALL CAPS (per config headline_color) |
| Subtitle | Below main headline | Translation in [config: subtitle_language]. [config: subtitle_color] at 70-80% size of main headline. NEVER same white as main headline -- must create visual hierarchy |
| Accent keywords (2-4) | Within headline | 2-4 emotionally impactful keywords in [config: accent_color]. Hook: power word at 120% size + 1-3 more. Never highlight just 1 word |
| Brand icon | Center of image, above watermark | From reference file, thirty percent opacity, every slide. In prompt body: "thirty percent opacity" -- NEVER "30%" |
| @handle watermark | Center of image, below brand icon | White, thirty percent opacity on ALL slides. In prompt body: "thirty percent opacity" -- NEVER "30%" |
| [config: swipe_cta_text] | Bottom center | White small text, all slides EXCEPT CTA |
| Page number | Top-left corner | "N/TOTAL" format (e.g., "1/10"), small white text, ALL slides. Helps viewers track progress and simplifies posting order |

Default Language:
See branding kit Language section for current defaults. Override: user specifies single language -> use that language, no subtitle. Prompt instructions (scene description) = ALWAYS English (AI model instruction).

Text Rendering Syntax in Prompt:
Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HEADLINE IN [config: main_headline_language]]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line reading "[SUBTITLE TRANSLATION]" in [config: subtitle_color] at slightly smaller size,
creating clear visual hierarchy -- the subtitle must NOT be white like the main headline.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
["[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap. | omit for CTA slide]
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

Subject Brand Context in Prompt:
When a slide discusses a specific company/product/service, the prompt MUST include:
[Subject brand logo/UI/interface] clearly visible in the scene, establishing context
for the informational claim. Example: Google search interface visible on phone screen,
WhatsApp chat UI with green accent, etc.
Without subject brand context, factual claims about that brand are meaningless to viewers.

---

SUGGESTED FILENAME CONVENTION (PER SLIDE)

Every slide output includes a suggested filename for the generated image. SEO-optimized filenames improve discoverability in Google Images, Pinterest, portfolio sites, and content management workflows.

Naming Pattern:
{number}-{topic-keywords}-{brand-handle}-{slide-type}.png

Rules:
| Rule | Detail |
| Separator | Hyphens only (-). Google treats hyphens as word separators |
| Case | All lowercase. Prevents duplicate URL issues |
| Word count | 5-8 words total (including number, brand, type) |
| Topic keywords | 2-3 descriptive words per slide -- slide-specific, not carousel-level |
| Brand handle | [config: handle_no_at] -- handle without @ |
| Numeric prefix | Sequential: 1-, 2-, 3-... for easy posting order |
| Slide type suffix | hook, foreshadow, body, cta, thumb |
| Extension | .png default (Nano Banana Pro output) |
| No keyword stuffing | Natural, descriptive -- not SEO spam |
| No special characters | No @, #, spaces, underscores |

Slide Type Suffixes:
| Slide Type | Suffix |
| Hook (Slide 1) | hook |
| Foreshadow (Slide 2) | foreshadow |
| Body / Content | body |
| CTA (Last slide) | cta |
| Thumbnail | thumb |

Example (Topic: "5 AI Tools yang Bikin Kerjaan 10x Lebih Cepat"):
| Slide | Suggested Filename |
| 1 (Hook) | 1-ai-tools-kerja-cepat-alisadikinma-hook.png |
| 2 (Foreshadow) | 2-ai-tools-skip-rugi-alisadikinma-foreshadow.png |
| 3 (Body) | 3-chatgpt-prompt-tips-alisadikinma-body.png |
| 4 (Body) | 4-midjourney-visual-design-alisadikinma-body.png |
| 5 (Body) | 5-notion-ai-productivity-alisadikinma-body.png |
| 6 (Body) | 6-claude-code-automation-alisadikinma-body.png |
| 7 (Body) | 7-canva-ai-content-alisadikinma-body.png |
| 8 (CTA) | 8-ai-tools-productivity-alisadikinma-cta.png |

Why Slide-Level Keywords:
Each body slide covers a different subtopic. Slide-specific keywords make each image independently discoverable in Google Image Search, Pinterest, and portfolio pages -- rather than all slides sharing the same generic carousel-level keywords.

Note: Instagram and TikTok rename files on upload. Filenames still matter for: website embeds, Pinterest repins, Google Image Search indexing, portfolio/blog posts, and content management/archiving.

---

SUBJECT REFERENCE IMAGE SYSTEM (PRE-GENERATION)

When the topic involves specific objects that need visual consistency across slides (products, animals, devices, branded items, food items), the agent MUST plan reference images BEFORE generating any slide prompt.

Naming Convention:
| Type | Filename Pattern | Example |
| Creator face | creator-face.png | Always -- standard |
| Creator brand | creator-brand.png | Always -- standard |
| Company/brand logo | ref-{company}-logo.png | ref-apple-logo.png, ref-whatsapp-logo.png |
| Specific product | ref-{product-model}.png | ref-iphone-16-pro-titanium.png |
| Source/publication logo | ref-source-{publication}-logo.png | ref-source-sipri-logo.png, ref-source-janes-defence-logo.png |
| Subject reference | ref-{object-description}.png | ref-cyborg-cockroach-teal-casing.png |
| Subject variant | ref-{object-variant}.png | ref-sate-kecoa-skewer-with-sauce.png |

Rules:
- Filenames: lowercase, hyphens only, descriptive (2-5 words), .png extension
- Agent assigns ALL filenames BEFORE any prompt generation
- Same filename used in ALL slide prompts that reference that object
- All stored in ref/ folder inside topic folder

Auto-Detection Categories (Mandatory):
The agent MUST scan the topic for these 4 categories and plan reference images for ALL matches:

| Category | Detection Trigger | Why Reference Needed | Example |
| Specific product | Named model/series/version (iPhone 16, Galaxy S25, Tesla Model Y, PS5 Pro) | AI generates wrong product design, wrong color, wrong shape | ref-iphone-16-pro-titanium.png |
| Company/brand logo | Topic discusses or mentions a specific company (Google, Apple, WhatsApp, Toyota) | AI generates wrong logo -- wrong colors, wrong shape, extra elements | ref-apple-logo.png, ref-google-logo.png |
| Source/publication logo | Fact verification identifies a trusted source with a recognizable logo (SIPRI, Jane's Defence, Reuters, WHO) | Source logo rendered in-image for credibility. AI generates wrong publication logos | ref-source-sipri-logo.png, ref-source-janes-defence-logo.png |
| Unique object | Custom/niche item not widely known (cyborg cockroach, specific food dish, prototype device) | AI has no training data for this specific object | ref-cyborg-cockroach-teal-casing.png |

Detection is MANDATORY -- if the topic mentions ANY named product model, company, or uses data from a named publication, the agent MUST plan reference images. Do not assume the AI "knows" what an iPhone 16 Pro or a SIPRI logo looks like.

Workflow:
1. Identify -- Agent analyzes topic, scans for all 4 auto-detection categories (specific products, company logos, source logos, unique objects)
2. Name -- Agent assigns descriptive filenames for each reference (e.g., ref-cyborg-cockroach-teal-casing.png, ref-apple-logo.png, ref-source-sipri-logo.png)
3. Present -- Agent shows user the planned reference list with filenames and descriptions
4. Upload (MANDATORY) -- Agent requests user to upload reference images. Upload is WAJIB -- agent does NOT proceed to prompt generation until user confirms all refs are in ref/ folder.
5. Fallback -- If user cannot provide source photos for specific items: generate reference image prompts (isolated, white background). Warn user: "AI-generated reference = lower accuracy for product/logo details. Upload foto asli kalau bisa."
6. Use -- ALL subsequent slide prompts reference the exact filenames: [from reference image: ref-xxx.png]

Reference Image Prompt Template:
A [config: image_style] product/object reference image on a clean white background.
[Detailed description of the object -- shape, color, material, distinctive features, scale context].
Studio lighting, soft even illumination, no harsh shadows. Sharp focus on every detail.
No text, no branding, no background elements -- isolated object only.
4K resolution, reference quality for visual consistency across multiple images.

Usage in Slide Prompts:
When a subject reference exists, insert in the relevant slide prompt:
[Object/creature rendered from reference image: ref-{filename}.png -- maintain exact visual details: color, shape, texture, markings]

Source Credibility In-Image (Factual Slides):
When a slide contains verified factual claims from a named source, the source attribution MUST be rendered in-image:

In-Image Format:
- Small text in bottom gradient zone (below headline, above SWIPE): "Source: [Publication Name], [Year]"
- If source has a recognizable logo AND user uploaded ref-source-{publication}-logo.png: render logo as small icon (similar size to page number) next to source text
- Text style: small, [config: subtitle_color], not dominant -- informational, not decorative
- Multiple sources on one slide: list side by side or stack vertically

In-Caption Format:
- ALL 4 platform captions include: "Data: [Publication Name], [Year]" or "Source: [Publication Name]"
- Placed after body text, before CTA line
- Multiple sources: most authoritative first

Example:
- In-image: "Source: SIPRI, 2025" with SIPRI logo icon from ref-source-sipri-logo.png
- In caption: "Data: Stockholm International Peace Research Institute (SIPRI), 2025"

---

HOOK HEADLINE FORMULA (SLIDE 1 -- MANDATORY)

The hook headline is the single most important text in the entire carousel. It determines whether the viewer swipes or scrolls past. A generic headline = dead carousel.

Headline Structure (Mandatory for Hook Slides):
[POWER WORD in caps] + [curiosity gap / number / negative frame] + [unrevealed payoff]

Rules:
1. Score FIRST, prompt SECOND -- headline MUST score minimum 3/5 on Hook Scoring Checklist BEFORE entering the image prompt
2. Billboard rule -- maximum 8-12 words total. Must be readable in under 1 second at phone-scroll speed
3. Open loop mandatory -- headline MUST create a question/itch that can ONLY be answered by swiping to the next slide. If the hook reveals the answer, it fails
4. Power word amplification -- the power word is rendered in accent color AND at 120% size relative to the rest of the headline (visually dominant within the text)
5. No generic headlines -- "Fakta Menarik Tentang AI" = REJECTED. Must trigger emotional response

Hook Scoring Gate (Pre-Generation):
Before generating the hook image prompt, verify the headline scores 3/5:

| # | Feature | Check |
| 1 | Contains a question (?) | |
| 2 | Contains a number/digit | |
| 3 | Contains POWER WORD in caps (GILA, PARAH, RAHASIA, FATAL, BAHAYA, GRATIS, WAJIB, TERLARANG) | |
| 4 | Uses negative frame (JANGAN, STOP, SALAH, GAGAL, KESALAHAN) | |
| 5 | Payoff NOT revealed in headline (open loop) | |

If score < 3/5: REWRITE headline before generating prompt.

Hook Headline Bank (Ready-to-Adapt, 3 Per Category):

Visual Shock:
1. "GILA -- Ini yang Terjadi dalam [N] Detik" -> power word + number + unrevealed payoff
2. "Lo NGGAK SIAP Lihat Ini" -> negative frame + unrevealed payoff + power word
3. "[N] Hal yang TERLARANG Tapi Semua Orang Lakuin" -> number + power word + curiosity gap

Negative Bias:
1. "STOP Lakuin Ini -- Lo Keliatan AMATIR" -> power word + negative frame + unrevealed payoff
2. "KESALAHAN FATAL yang [N]% Orang Gak Sadar" -> power word + number + negative frame
3. "Kenapa [Topik] Lo GAGAL? Ini Alasannya" -> question + power word + negative frame

Curiosity Gap:
1. "Gue Nemu RAHASIA di Balik [Topik]" -> power word + unrevealed payoff
2. "Ini Mungkin ILEGAL untuk Diketahui" -> power word + curiosity gap + unrevealed payoff
3. "[N] Hari Coba [Hal Sulit] -- Hasilnya GILA" -> number + unrevealed payoff + power word

Relatability:
1. "Kalau Lo [Job/Situasi], Lo Dalam BAHAYA" -> negative frame + power word + identity
2. "POV: Akhirnya Ngerti [Topik] Tanpa [Pain]" -> curiosity gap + unrevealed payoff
3. "Buat yang Baca Ini Jam 2 Pagi..." -> identity + curiosity gap + open loop

Speed & Value:
1. "Kasih Gue 30 Detik -- Gue Hemat [N] Jam Kerja Lo" -> number + unrevealed payoff
2. "CURI Strategi Gue Buat [Result]" -> power word + unrevealed payoff
3. "[N] Langkah WAJIB (Tanpa Basa-Basi)" -> number + power word + speed promise

Hook Category -> Visual Direction Mapping:
The hook headline category MUST match the visual composition and creator expression:

| Hook Category | Creator Expression | Scene Direction | Lighting | Camera Default |
| Visual Shock | Eyes blown wide, full iris visible, dropped jaw in small O, head tilted back, hand raised in shock gesture -- "frozen visceral 'wait WHAT' reaction" | Disrupted environment, warm-cool clash, motion elements, single dramatic element | Hard Rembrandt 4:1, 3200K tungsten key, strong cool 5600K rim, deep dramatic shadows | CU 85mm f/1.8 eye-level |
| Negative Bias | Intense stare through narrowed lids, brows furrowed deeply, tight lips pulled down, chin lowered looking up through brows, palm-out stop gesture -- "protective warning urgency" | Dark minimal, shadow-dominant, exposed brick/dark void, faint red-amber accent glow | Short-side Rembrandt 3:1, 3800K neutral-warm, cool fill from below, thin warm rim | MCU 85mm f/1.8 eye-level |
| Curiosity Gap | One eyebrow raised creating asymmetric intrigue, closed-lip smirk one corner lifted, head tilted ten degrees, hand near mouth as if whispering -- "smug insider confidence" | Warm atmospheric with depth, golden practicals, partially hidden/blurred tease element | Rembrandt 4:1, 3200K warm golden key, warm ambient fill, subtle warm halo rim | MCU 85mm f/1.8 slight angle |
| Relatability | Soft warm eye contact with raised brows of recognition, natural smile hint of teeth, slight forward nod, hands wrapped around coffee mug -- "the 'oh you TOO?' face" | Authentic lifestyle (cafe, desk, bedroom), warm naturals, recognizable everyday objects | Soft loop 2:1, 3500K warm natural daylight, large soft fill, barely visible rim | MCU 50mm f/2.0 slight offset |
| Speed & Value | Direct unwavering gaze, steady confident brows, closed-lip half-smile, chin up three degrees with authoritative nod, hand showing number gesture -- "calm unshakeable competence" | Clean professional (studio, organized desk), neutral warmth, competence signals (screens, tools) | Butterfly 2:1, 4000K neutral-warm, even controlled fill, subtle professional rim | MCU 85mm f/1.8 centered |

Full expression libraries (eyes, mouth, head, hands, body per category), 3 camera variants (A/B/C), environment palettes, and synergy matrix -> see hook-visual-library knowledge.

Headline-Visual Independence Rule (MANDATORY):
Hook headline and hook visual are INDEPENDENT systems working together via cognitive dissonance:

| System | Purpose | Source |
| Visual hook | Absurd pattern interrupt -- grabs eyeballs | Visual Action Hook Bank (hook-science) |
| Hook headline | Topic-professional promise -- delivers the content value | Hook Headline Formula (above) |

The Rule: Headline describes the TOPIC, never the visual action. The absurd visual grabs attention; the serious headline converts it to curiosity.

MANDATORY CHECK before generating hook prompt:
"Does this headline describe the TOPIC or the VISUAL?"
If it describes the visual -> REWRITE immediately.

Anti-Pattern Examples:
| | Headline | Why |
| BAD | "GILA -- GUE MAU MAKAN KECOAK INI" | Describes the visual action (eating cockroach), not the topic |
| BAD | "PARAH -- NAIK RUDAL SAMBIL BAWA LAPTOP" | Describes the visual (riding missile), not the topic |
| GOOD | "NGERI -- KECOAK HIDUP DIJADIKAN DRONE MATA-MATA MILITER" | Describes the topic (military drone cockroach), visual is independent |
| GOOD | "FATAL -- AI SEKARANG BISA KONTROL SENJATA TANPA MANUSIA" | Describes the topic (autonomous weapons AI), visual grabs attention separately |

How it works together:
- Viewer sees: creator eating cockroach at night market (ABSURD -- scroll stops)
- Viewer reads: "KECOAK HIDUP DIJADIKAN DRONE MATA-MATA MILITER" (TOPIC -- curiosity activated)
- Brain: "Wait, cockroaches are actually military drones?!" -> SWIPE

Multi-Keyword Highlighting in Prompt (All Slides):
Every headline must highlight 2-4 emotionally impactful keywords in accent color -- not just 1 power word. Single-word highlighting looks weak and fails to create visual rhythm across the headline.

Keyword Selection Rules:
1. Power words -- 30+ options in 6 categories (see expanded Power Words Bank in hook-science knowledge). Anti-repetition: never same opener in 5 consecutive carousels
2. Emotional triggers -- words that provoke fear, curiosity, or urgency (COLLECTED, KNOWS, NEVER, STOP, RUGI)
3. Numbers/stats -- concrete data points that add credibility ("10x", "30 DETIK", "99%")
4. Identity words -- words the viewer self-identifies with (YOU, YOUR, LO, GUE)
5. Minimum 2 keywords highlighted per headline -- 1 keyword = weak visual impact. 3-4 keywords = optimal rhythm

Example headline analysis:
- "SKIP THIS AND YOU'LL NEVER KNOW WHAT THEY'VE COLLECTED" -> highlight: SKIP, NEVER, COLLECTED (3 keywords)
- "INSANE -- WHAT YOUR PHONE KNOWS ABOUT YOU RIGHT NOW" -> highlight: INSANE, YOUR PHONE, KNOWS, RIGHT NOW (4 keywords)
- "GILA -- 5 HAL TERLARANG yang Semua Orang Lakuin" -> highlight: GILA, 5, TERLARANG (3 keywords)

Hook slide: Power word at 120% size + additional 1-3 keywords in accent color at normal size.
All other slides: 2-4 keywords in accent color (no size difference needed).

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[FULL HEADLINE]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The word "[POWER WORD]" in slightly larger size, visually dominant within the headline. Remaining text in white.
The text uses the largest possible font size that fills the width, extra bold weight, dominating the gradient zone.

---

TEMPLATES

Template -- Hook Slide (Slide 1):

MANDATORY -- Hook Category Selection (USER-CONFIRMED):
1. Identify topic from the Topic -> Hook Category Mapping in hook-science knowledge
2. Present 3 options to user: PRIMARY + sample headline + vibe, SECONDARY + headline + vibe, WILDCARD (random non-Avoid) + headline + vibe
3. User picks A/B/C or provides custom hook/category
4. If custom -> validate against Avoid list for this topic -- e.g., Education -> Avoid: Visual Shock
5. Read the visual profile for the confirmed category from hook-visual-library knowledge
6. State the confirmed category explicitly: "Hook Category: [X] (user-confirmed)"

Pre-generation: Score headline 3/5 on Hook Scoring Gate (see Hook Headline Formula above). If < 3/5, rewrite before proceeding.

Headline Independence Check (MANDATORY): Verify headline describes the TOPIC, not the visual action. See Headline-Visual Independence Rule above. If headline describes what the creator is DOING in the image -> REWRITE to describe the TOPIC instead.

Costume selection (Scene-Override Priority): Check the confirmed Visual Hook Idea scene context FIRST -> match against Scene -> Costume Override Table in hook-visual-library Section 10. If scene has a specific environment (night market, beach, gym, etc.), use the scene-appropriate costume -- NOT the topic costume. Only use topic -> costume mapping for neutral/studio/unspecified scenes. Copy the prompt phrase into the [Wardrobe] slot. User override always wins.

Visual Hook Idea (USER-CONFIRMED): After hook category is confirmed, present 3 vivid scene concepts -- absurd, funny, eye-catching scenarios (2-3 sentence creative pitches, NOT technical component lists). Each idea built from hook-science Visual Action Bank + hook-visual-library Sections 4-5, 10, 11. The scene should be ABSURD but RELEVANT -- humor/shock from contrast between serious headline and ridiculous visual. User picks A/B/C, modifies, or provides own idea. The confirmed visual concept drives the prompt.

Anti-repetition: If this topic has been used before this session, select a different camera variant (A/B/C) from hook-visual-library Section 5. Check the synergy matrix (Section 7) for expression modifications when combining category + visual action.

A [config: image_style] cinematic [shot type -- from hook-visual-library Camera Angle Bank, variant A/B/C] of [CHARACTER from reference image: creator-face.png].
[Expression from hook-visual-library Expression Library -- use FULL prompt phrases for eyes, mouth, head, hands, body, emotion. NOT generic "shocked face"].
[Wardrobe -- from hook-visual-library Section 10 Costume Library, matched to topic category].
[Action/pose from Visual Action Hook Bank + prop from Section 11 with interaction detail from Section 11b -- e.g., mid-bite into golden coin, holding raw fish with deadpan].

[Scene with pattern interrupt -- use the contrast/context from the Visual Action prompt fragment.
The mundane action contrasts with the serious headline, creating cognitive dissonance.
Match Hook Category -> Scene Direction mapping. The scene must feel wrong or surprising at first glance.]
[Foreground element] + [subject] + [background with bokeh/depth -- 3 distinct layers].

Lens: [lens]mm f/[aperture], [angle], [depth of field].
[Lighting pattern from Hook Category -> Lighting mapping] at [ratio] ratio, [Kelvin]K [key direction].
[Film stock], [color grade]. [Atmosphere/particles -- haze, volumetric, bokeh].
[Texture detail: natural skin texture with visible pores, fabric weave].
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HOOK HEADLINE -- scored 3/5+]" with the words "[POWER WORD]", "[KEYWORD 2]", and "[KEYWORD 3]"
in [config: accent_color]. The word "[POWER WORD]" in slightly larger size, visually dominant. Remaining text in white.
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

Template -- Creator Shot (CTA):
See "Template -- CTA Slide" section below for the 4 CTA visual types.

Template -- Creator Shot (General -- Non-Hook, Non-CTA):
A [config: image_style] cinematic [shot type] of [CHARACTER from reference image: creator-face.png].
[Expression keywords from cinematography-lut]. [Wardrobe]. [Action/pose].

[Setting/environment with specific details].
[Foreground element] + [subject] + [background with bokeh/depth].

Lens: [lens]mm f/[aperture], [angle], [depth of field].
[Lighting pattern] at [ratio] ratio, [Kelvin]K [key direction].
[Film stock], [color grade]. [Atmosphere/particles].
[Texture detail: natural skin texture with visible pores, fabric weave].
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HEADLINE IN BAHASA]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

Template -- Foreshadow Slide (Slide 2 -- MANDATORY):

Purpose: Bridge the hook to the body. Instagram re-serves carousel from slide 2 if user didn't engage on slide 1 -- this is your SECOND CHANCE to capture attention. Slide 2 must create FOMO: "If you skip this, you'll miss [consequence]."

CRITICAL -- Visual Continuity from Hook:
The foreshadow MUST visually connect to the hook's absurd scene concept. If the hook shows "creator riding a missile," the foreshadow can't suddenly be a generic studio shot -- it breaks immersion. Use one of these continuity strategies:

| Strategy | How It Works | Example (hook = "riding missile") |
| Aftermath | Show the scene AFTER the hook moment | Creator landed/crashed, dusting off rubble, looking at camera with "that was only the beginning" expression |
| Zoom Shift | Same scene, different angle/zoom | MCU of creator's face still on the missile, now with concerned look -- camera pulled back to show where it's heading |
| Narrative Continue | Next beat of the same story | Creator standing next to the landed missile, pointing at the "AI GUIDANCE SYSTEM" label with urgent expression |
| Context Reveal | Pull back to reveal more context | Wider shot showing the missile was actually a desk prop -- creator at desk surrounded by military tech articles |

The foreshadow should feel like swiping to the next panel of a comic book, not jumping to a different movie.

Foreshadow Type Selection:
| Type | When to Use | Headline Formula | Visual Direction |
| Steps Tease | Listicle, tutorial, how-to | "Ada [N] cara, dan yang ke-[N] bikin gue berhenti [activity]" | Numbered list visual with LAST ITEM blurred/hidden. Items 1-3 visible, item N = blur overlay with "?" -- scene elements from hook still visible in background |
| Fear Urgency | Education, finance, business, health | "Kalau lo skip ini, lo terus [negative consequence]" | Creator with concerned/urgent expression, subtle red warning accent -- same wardrobe/setting as hook, shifted mood |
| Quiz/Choice | Comparison, opinion, debate topics | "Mana yang lebih [adjective] -- [A] atau [B]? Jawabannya MENGEJUTKAN" | Split composition showing A vs B -- hook prop or context element visible as connective thread |
| Visual Tease | Story, reveal, transformation, case study | "[Preview of reveal] -- tapi tunggu sampai slide [N]..." | Partial/blurred preview of climax -- hook's absurd element in background, energy shifting from chaos to curiosity |

A [config: image_style] cinematic MCU of [CHARACTER from reference image: creator-face.png].
[Expression: concerned urgency or teasing "I know something" smirk -- matching foreshadow type].
[Same wardrobe as hook slide -- visual continuity]. [Pose: leaning slightly forward, creating intimacy and urgency].

[VISUAL CONTINUITY from hook -- pick ONE strategy:]
[Aftermath: scene shows what happened AFTER the hook moment -- creator recovering/reacting]
[Zoom Shift: same scene, different camera angle -- MCU of creator's face, new perspective on the action]
[Narrative Continue: next story beat -- creator now doing/showing the consequence of the hook action]
[Context Reveal: pull back to reveal hook's absurd element in background while creator addresses camera]

[PLUS foreshadow type visual:]
[For Steps Tease: floating numbered cards/list items, items 1-3 crisp,
last item heavily blurred with glowing "?" overlay -- hook elements still in background]
[For Fear Urgency: warning-toned environment, subtle red/amber accent lighting,
visual tension -- same setting as hook but mood shifted to urgency]
[For Quiz/Choice: split background showing option A and option B,
both partially visible, hook prop or context element as connective thread]
[For Visual Tease: blurred/partially revealed climax content,
hook's absurd element visible in background, energy shifting from chaos to curiosity]

[Foreground element] + [creator subject] + [foreshadow background -- 3 depth layers].

Lens: 85mm f/2, eye-level to slight low angle (authority), shallow depth of field.
Loop lighting at 3:1 ratio, 3200K warm key. Slightly muted palette compared to hook
(tension build, not peak energy -- save that for later slides).
[Film stock], [warm but restrained grade]. [Subtle atmosphere: light haze, minimal particles].
Natural skin texture with visible pores, fabric weave detail.
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[FORESHADOW HEADLINE -- creates FOMO/urgency to keep swiping]"
with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.
Use the generated hook slide (slide 1) as scene reference for visual continuity --
same wardrobe, connected setting, consistent lighting temperature.

Hook -> Foreshadow reference: When generating foreshadow, use the hook image as a scene reference input in Nano Banana Pro. This ensures the AI maintains wardrobe, setting elements, and visual style across slides 1->2 without the agent having to describe every detail again.

Foreshadow Headline Bank:
- Steps Tease: "Ada 7 Cara, yang ke-7 GILA" / "[N] Langkah -- Tapi yang Terakhir Bikin Kaget"
- Fear Urgency: "Kalau Lo Skip, Lo Terus Buang [Amount] Tanpa Sadar" / "BAHAYA -- Dan Lo Mungkin Lagi Lakuin Ini"
- Quiz/Choice: "Mana yang Benar -- [A] atau [B]?" / "Lo Pasti Salah Pilih"
- Visual Tease: "Tunggu Sampai Lo Lihat Slide [N]..." / "Ini Baru Awalnya"

Template -- B-Roll / Topic Visual (No Creator Face):
A [config: image_style] cinematic [shot type] of [subject/scene].
[Detailed scene description]. [Context-specific elements].
[If slide discusses a specific brand/product: include recognizable brand elements
(logo, UI, interface, color scheme) of the subject being discussed for viewer context.]
[Foreground element] + [main subject] + [background depth layer].

Lens: [lens]mm f/[aperture], [angle]. [Depth of field].
[Lighting pattern] at [ratio] ratio, [Kelvin]K.
[Film stock], [color grade]. [Atmosphere: haze/particles/volumetric].
[Texture detail: surface materials, environmental textures].
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HEADLINE IN BAHASA]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding (subject brand is required for context).

Template -- B-Roll with Human Figure (Creator Face ALWAYS):
A [config: image_style] cinematic [shot type] of [CHARACTER from reference image: creator-face.png] as a prominent figure in [scene].
[Context-appropriate expression]. [Profession-specific wardrobe or creator default wardrobe].
[Scene description with creator clearly identifiable among other figures.
For crowd scenes: creator in center-foreground, slightly closer to camera, clearly the most recognizable face.
For single/few person scenes: creator is the primary subject.]
[Foreground element] + [subject] + [background depth layer].

Lens: [lens]mm f/[aperture], [angle]. [Depth of field].
[Lighting pattern] at [ratio] ratio, [Kelvin]K.
[Film stock], [color grade]. [Atmosphere].
[Texture detail]. [Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HEADLINE IN BAHASA]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight,
positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding (subject brand is required for context).
Maintain exact appearance from reference image: creator-face.png.

NOTE: B-Roll with ANY visible human figures = creator face ALWAYS included (no need to ask). Creator must be the most prominent/identifiable figure. Only pure object/landscape B-Roll has no creator face.

Template -- Thumbnail:
A [config: image_style] cinematic thumbnail composition:

Primary subject: [CHARACTER from reference image: creator-face.png], [exaggerated hook expression].
Expression: [specific exaggerated emotion] -- wide eyes, raised brows,
[mouth position], energy that screams "KAMU HARUS LIHAT INI".
Position: face occupies majority of frame, positioned [left/right/center].

Secondary element: [topic visual] -- [description of topic element visible
in background or beside creator, e.g., AI interface, data visualization].
[Foreground detail] + [creator subject] + [topic visual background layer].

Lens: 85mm f/1.8, eye-level, slight dutch tilt for dynamic energy.
Rembrandt or Split lighting, 4:1-6:1 ratio, mixed warm face / cool topic element.
Strong rim light separating creator from background.
Kodak Vision3 500T, high saturation, boosted contrast, vibrant teal-orange.
Natural skin texture with visible pores, fabric weave detail.
[Cinematic DP reference].

Bottom third of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[JUDUL THUMBNAIL DALAM BAHASA]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.

[PLATFORM ASPECT] aspect ratio. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

Note: Thumbnails typically don't need page numbers since they are standalone images, not part of the carousel sequence. Omit "[N]/[TOTAL]" for thumbnails.

Template -- Split-Panel:
A [config: image_style] split-panel composition divided vertically into two halves.

Left half ("[LABEL A IN BAHASA]"): [Scene A] featuring [CREATOR].
[Context-appropriate setting]. Natural warm daylight, [config: film_stock].
[Texture: natural skin, fabric detail]. [DP reference].

Right half ("[LABEL B IN BAHASA]"): Same person in same location but [contrasting version].
[Contrasting visual elements]. Enhanced but still warm color temperature.
[Foreground + subject + background depth layers in each half].

Both halves: same environment context.
Lens: 50mm f/2.8, eye-level. Warm golden hour lighting bridging both panels.
[Atmosphere: haze, particles, or environmental effect].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[HEADLINE IN BAHASA]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight, dominating the gradient zone.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
[If comparison (A vs B): brand icon + watermark on divider:]
Render the creator's brand icon from reference image creator-brand.png on the vertical center divider line
between the two panels as a small circular badge at thirty percent opacity -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white on the vertical center divider line,
thirty percent opacity, subtle background mark only.
[If non-comparison: brand icon + watermark centered:]
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

Template -- Video Source Overlay (Source MP4/Video Content):

Use when a body slide references source video content (e.g., news footage, product demo, original clip). The upper portion stays transparent/minimal so the video plays behind when posted; the lower portion has the standard gradient + headline + branding.

When to use: Source material is MP4/video, not static image. The slide serves as a "branded frame" over the video content.

Layout:
- Upper 60-70%: Minimal transparent area -- light dark vignette edges only, no text, no heavy overlay. Video content visible behind
- Lower 30-40%: Standard gradient zone with headline, subtitle, branding (same as other templates)
- Source video branding REMOVED (competitor branding rule -- no watermarks, handles, or badges from source)

A cinematic frame overlay for video content. The upper two-thirds of the image is mostly transparent
with only a subtle dark vignette at the edges, allowing video to show through clearly.

The lower third transitions into a smooth dark gradient zone. Extremely large, bold, impactful condensed
uppercase text reading "[HEADLINE]" with the words "[KEYWORD 1]", "[KEYWORD 2]", and "[KEYWORD 3]"
in [config: accent_color]. Remaining text in white.
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

No source branding -- all original watermarks, handles, channel names, and badges removed.
[PLATFORM ASPECT] aspect ratio.

Key differences from standard B-Roll template:
- Upper area is intentionally sparse/transparent (video shows through)
- No scene description in upper area (video IS the scene)
- Gradient starts lower (bottom 30-40% vs bottom half)
- No creator face (video content is the subject)
- Source branding explicitly removed

Template -- CTA Slide (Last Slide -- 4 Visual Types):

The CTA slide must CONVERT attention into action. A generic "follow me" composition = wasted opportunity. Select the CTA visual type that best matches the carousel's engagement goal.

CTA Type Selection Guide:
| Topic Type | Best CTA | Why |
| Debate / opinion / comparison | Polarize | Creates comment war -> highest comment volume |
| Listicle / ranking / choice | Question | Low-friction engagement -> "pick one" is easy |
| Relatable / community / friends | Identity Tag | Triggers share/tag -> highest reach amplification |
| Tutorial / how-to / resource | Engagement Reward | Comment keyword -> DM funnel -> lead generation |

CTA Lighting (All Types): Butterfly lighting, 2:1 ratio, 3500K -- warmer and more intimate than body slides. This signals "conversation" not "lecture."

CTA Type 1: Polarize ("Menurut lo A atau B?")
Goal: Drive comments through debate. Two sides = everyone has an opinion.
Best stat: Debate-driven CTAs generate highest comment volume per impression.

A [config: image_style] cinematic MS of [CHARACTER from reference image: creator-face.png].
Expression: confident, playful challenge -- one eyebrow raised, slight smirk,
"I want to hear your take" energy. Arms open, gesturing to both sides.
[Wardrobe: default creator wardrobe].

Background split into two zones: left side shows [option A visual],
right side shows [option B visual]. Both options clearly visible and distinct.
Creator positioned center between both options, acting as the referee.
[Foreground element] + [creator center] + [split background with options].

Lens: 50mm f/2.8, eye-level, centered composition.
Butterfly lighting at 2:1 ratio, 3500K warm key, soft fill.
[config: film_stock], [config: color_grade]. Soft haze, warm bokeh.
Natural skin texture with visible pores, fabric weave.
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "MENURUT LO [A] ATAU [B]?" with "[A]" and "[B]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
Three small social media icons (Instagram logo, TikTok logo, LinkedIn logo) arranged in a single horizontal row with "[config: handle]" in white text beside the icons row.
Below the icons row, "[config: portfolio_url]" in white text at slightly smaller size.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding. No "SWIPE (GESER)" on CTA.
Maintain exact appearance from reference image: creator-face.png.

CTA Type 2: Question ("Lo yang mana?")
Goal: Low-friction engagement. Simple choice = easy to comment.
Best stat: "Which one?" CTAs get +25% more comments than open-ended questions.

A [config: image_style] cinematic CU of [CHARACTER from reference image: creator-face.png].
Expression: warm curiosity, direct eye contact, slight head tilt --
"I'm genuinely asking you" energy. One hand near chin (thinking pose)
or pointing directly at camera (breaking fourth wall).
[Wardrobe: default creator wardrobe].

Background: clean, warm, minimal distraction -- soft bokeh environment
that keeps all attention on creator's face and the question.
[Foreground element: subtle] + [creator face dominant] + [warm bokeh background].

Lens: 85mm f/1.8, eye-level, tight framing -- face fills majority of frame.
Butterfly lighting at 2:1 ratio, 3500K warm intimate key.
[config: film_stock], [config: color_grade]. Gentle atmosphere, minimal particles.
Natural skin texture with visible pores, fabric weave detail.
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "[SIMPLE CHOICE QUESTION IN BAHASA]?" with the words "[KEYWORD 1]" and "[KEYWORD 2]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
Three small social media icons (Instagram logo, TikTok logo, LinkedIn logo) arranged in a single horizontal row with "[config: handle]" in white text beside the icons row.
Below the icons row, "[config: portfolio_url]" in white text at slightly smaller size.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding. No "SWIPE (GESER)" on CTA.
Maintain exact appearance from reference image: creator-face.png.

CTA Type 3: Identity Tag ("Tag temen yang BUTUH ini")
Goal: Trigger share/tag behavior. Highest reach amplification via DM/tag shares.
Best stat: IG DM shares = 3-5x heavier algorithm weight than likes.

A [config: image_style] cinematic MWS of [CHARACTER from reference image: creator-face.png]
with a second person (friend/colleague energy -- similar age, casual interaction).
Expression: both laughing/smiling warmly, creator nudging/pointing at the other person
as if saying "this is for you." Natural, candid friendship moment.
[Wardrobe: casual, approachable for both figures].

Setting: warm lifestyle environment -- coffee shop, co-working space, or casual hangout.
Natural warm light streaming in. Feeling of genuine connection between two people.
[Foreground element: table/coffee] + [two subjects] + [warm interior bokeh background].

Lens: 50mm f/2, eye-level, slightly wider to fit both subjects.
Loop lighting at 2:1 ratio, 3500K natural warm key.
[config: film_stock], [config: color_grade]. Soft atmospheric haze.
Natural skin texture with visible pores on both subjects, fabric detail.
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "TAG TEMEN YANG BUTUH INI" with "BUTUH" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
Three small social media icons (Instagram logo, TikTok logo, LinkedIn logo) arranged in a single horizontal row with "[config: handle]" in white text beside the icons row.
Below the icons row, "[config: portfolio_url]" in white text at slightly smaller size.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding. No "SWIPE (GESER)" on CTA.
Maintain exact appearance from reference image: creator-face.png.

CTA Type 4: Engagement Reward ("Comment KEYWORD buat dapetin...")
Goal: Comment keyword -> DM automation funnel -> lead generation.
Best stat: Comment-to-DM funnels can generate 1,000+ leads/month.

A [config: image_style] cinematic MCU of [CHARACTER from reference image: creator-face.png].
Expression: generous, excited to give -- bright smile, eyes lit up,
one hand extended toward camera holding/presenting [reward visual:
a glowing guide/book/template/phone showing the resource].
The gift object is the visual focal point alongside the creator's face.
[Wardrobe: default creator wardrobe].

Setting: warm, professional but inviting environment.
[Reward object] in foreground, slightly glowing with accent color light.
[Creator subject] + [reward in hand] + [warm professional bokeh background].

Lens: 85mm f/2, eye-level, medium-close framing.
Butterfly lighting at 2:1 ratio, 3500K warm key.
Accent color rim light on the reward object (making it glow and stand out).
[config: film_stock], [config: color_grade]. Subtle golden particles floating.
Natural skin texture with visible pores, fabric weave detail.
[Cinematic DP reference].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text
reading "COMMENT '[KEYWORD]' BUAT DAPETIN [REWARD]" with "[KEYWORD]" in [config: accent_color].
The text uses the largest possible font size that fills the width, extra bold weight.
Below the main headline, a [config: subtitle_language] subtitle line in [config: subtitle_color] at slightly smaller size -- subtitle must not be white.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
Three small social media icons (Instagram logo, TikTok logo, LinkedIn logo) arranged in a single horizontal row with "[config: handle]" in white text beside the icons row.
Below the icons row, "[config: portfolio_url]" in white text at slightly smaller size.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.

[PLATFORM ASPECT] aspect ratio. No competitor branding. No "SWIPE (GESER)" on CTA.
Maintain exact appearance from reference image: creator-face.png.

CTA Headline Bank:
- Polarize: "Menurut Lo [A] atau [B]?" / "Setuju atau Nggak? Tulis di Komentar"
- Question: "Lo yang Mana? Tulis 1, 2, atau 3!" / "Pilih yang Paling Lo Relate"
- Identity Tag: "Tag Temen yang BUTUH Ini" / "Share ke Temen Lo yang [situation]"
- Engagement Reward: "Comment 'TEMPLATE' Buat Dapetin GRATIS" / "Comment 'GUIDE' dan Gue DM"

---

EMOTIONAL ARC VISUAL MAP (MANDATORY PRE-GENERATION STEP)

Before generating individual slide prompts, PLOT the emotional arc for the entire carousel. Each slide gets an emotional beat and intensity tag. This ensures the carousel feels like a JOURNEY, not a flat sequence.

The Roller Coaster Pattern:
6/6 HOOK --------+
5/6              |                              +-- CLIMAX
4/6              |              +-- MINI-HOOK --+
3/6              +-- FORESHADOW-+
2/6                             +-- BUILD ------+
1/6                                                  WARM (CTA)
    ---------------------------------------------------------------
    Slide 1   Slide 2    Slide 3-4    Slide 5-7    Slide 8+   Last

Beat -> Visual Treatment Mapping:
| Beat | Slides | Intensity | Visual Treatment | Camera | Lighting | Color |
| HIGH | 1 (Hook) | 6/6 | Extreme CU, pattern interrupt scene, creator's most exaggerated expression | CU/MCU, 85mm f/1.8, slight dutch tilt | High contrast 4:1, dramatic key | Peak saturation, strong accent color on power word |
| DIP | 2 (Foreshadow) | 3/6 | Pull back to MCU/MS, tension build composition, partially hidden/blurred elements | MCU/MS, 85mm f/2, eye-level | 3:1, slightly muted key | Restrained palette -- warm but held back, building anticipation |
| BUILD | 3-5 (Body) | 2->4/6 | Progressive escalation: each slide slightly more saturated, tighter framing as value increases | Varies, progressively tighter | Progressively brighter, 3:1->2:1 | Gradual saturation increase slide-over-slide |
| MINI-HOOK | 5-7 | 5/6 | Sudden change -- split panel, extreme angle, color temperature shift, or unexpected composition. "Tapi tunggu..." energy | Extreme angle or split panel or dramatic zoom | Sudden shift -- if previous slides were warm, add cool accent | Color temperature disruption -- introduce unexpected contrast |
| CLIMAX | 8+ (Reveal) | 6/6 | Widest establishing shot or most intimate close-up (contrast with body), peak saturation, biggest text, most shareable insight | Widest or tightest (contrast with body slides) | Peak drama, 4:1, rim light dominant | Peak saturation, accent color dominant, full visual impact |
| WARM | Last (CTA) | 1/6 | Softest, warmest, most intimate -- direct eye contact, inviting expression, connection energy | MCU, 85mm f/2, direct eye-level | Butterfly 2:1, warmest Kelvin (3500K), soft fill | Warmest tone, golden, gentle -- "come closer" feeling |

Emotional Intensity Scale:
6/6 = Maximum impact (hook, climax) -- highest contrast, saturation, drama
5/6 = High impact (mini-hook) -- sudden change, surprise element
4/6 = Rising energy (late body slides) -- building toward reveal
3/6 = Tension build (foreshadow, early body) -- restrained but anticipatory
2/6 = Foundation (early body slides) -- establishing value, steady build
1/6 = Intimate warmth (CTA) -- softest, connection-focused

Output Tag Format:
Every slide in the output MUST include the emotional beat tag:
## Slide N: [TYPE] -- [Topic] | Emotion: [BEAT] ([intensity]/6)

Examples:
- Slide 1: HOOK -- 7 Tools AI | Emotion: HIGH (6/6)
- Slide 2: FORESHADOW -- Tease | Emotion: DIP (3/6)
- Slide 5: CONTENT -- Surprise Reveal | Emotion: MINI-HOOK (5/6)
- Slide 8: CTA -- Follow | Emotion: WARM (1/6)

Mini-Hook Placement Rule:
Place a mini-hook at slides 5-7 to prevent mid-carousel drop-off. Exit rates stabilize at 12-15% per slide after slide 4. A mid-carousel surprise re-engages committed swipers.

Mini-hook triggers:
- Sudden split-panel composition (if body was single-frame)
- Extreme camera angle change (dutch tilt, bird's eye, worm's eye)
- Color temperature shift (warm -> cool accent -> back to warm)
- "Tapi..." or "Plot twist:" headline prefix
- Visual contradiction or unexpected scale comparison

---

CREATIVE DIRECTION SUMMARY TEMPLATE (MANDATORY -- TOP OF FILE)

Every carousel prompt output MUST open with a Creative Direction block before slide prompts:

Creative Direction:
1. Concept -- 2-3 sentence creative pitch (what is this carousel about, what makes it compelling)
2. Visual DNA -- color palette per slide type (hook: [colors], body: [colors], CTA: [colors]), recurring visual motifs
3. Style -- hyperrealistic + micro-imperfection mandate
4. Data Pattern -- if applicable (descending counts, timeline progression, comparison structure, etc.)
5. Face Rules -- who appears where (creator vs public figure allocation per slide)
6. Hook/CTA Type -- confirmed hook category + CTA visual type from creative clarification

Missing Creative Direction block = REJECTED. This block ensures visual consistency across all slides.

---

QUALITY CHECKLISTS

WOW Output Format (MANDATORY):
Each WOW element MUST include parenthetical detail explaining WHERE in the prompt it's fulfilled. One-line checklist without parenthetical detail = REJECTED.

WOW: [score]/8
- Lighting Drama (what pattern, what ratio, what Kelvin, what accent)
- Depth Layers (what foreground + what mid + what background)
- Atmosphere (what particles/haze/volumetric)
- Color Contrast (what warm vs cool tension)
- Emotional Peak (what expression keywords or scene emotion)
- Camera Intention (what lens, aperture, angle, why)
- Texture Realism (what textures -- skin, fabric, surface)
- Cinematic Ref (what film stock + what DP reference)

Image Prompt Checklist (All 8 WOW Elements):
Before finalizing each image prompt, verify ALL 8 are present:
- Lighting Drama -- Lighting pattern named (Rembrandt, Loop, etc.) + ratio (2:1, 4:1) + Kelvin
- Depth Layers -- Foreground element + subject + background (3 distinct layers)
- Atmosphere -- Haze, particles, volumetric, fog, bokeh, or environmental effect
- Color Contrast -- Warm-cool tension, accent color highlights, or complementary palette
- Emotional Peak -- Expression keywords (if creator) or scene emotion (if B-Roll)
- Camera Intention -- Shot type + lens + aperture + angle with purpose
- Texture Realism -- Pores, fabric weave, surface materials, or environmental textures
- Cinematic Ref -- Film stock named + color grade + optional DP reference

Text Rendering Checklist:
- Main headline in [config: main_headline_language], subtitle in [config: subtitle_language] + [config: subtitle_color] (or single language if user-requested)
- Accent words identified and color specified
- Brand icon filename + position specified
- @handle watermark + opacity specified
- SWIPE FOR MORE present (or omitted for CTA)
- Gradient zone matches slide type (bottom half, bottom third for thumbnail)

Thumbnail Checklist:
- Creator face from reference image, 50-60% of frame
- Topic visual included (background/side element)
- Text overlay rendered in image (title in gradient zone)
- Expression EXAGGERATED (readable at 100x100px)
- High contrast, saturated colors
- Curiosity gap created -- "What does he know?"
- Aspect ratio matches target platform
- All 8 WOW elements present

---

VIDEO HANDOVER BRIEF TEMPLATE

Auto-generated alongside carousel prompts as a video handover brief in the same output. Provides downstream video agent with full creative context for image-to-video conversion.

Purpose: The carousel image agent generates static prompts. A separate video agent converts selected images to video. The handover brief ensures the video agent understands the storyline, emotional arc, and creative decisions -- without re-reading all carousel prompts.

Output Template:

Video Handover Brief -- [Carousel Topic]

Generated: [date]
Source carousel: carousel prompts
Platform: [target platform] | Slides: [N] | Aspect: [ratio]

Storyline Summary:
[1-2 paragraphs describing the carousel narrative arc -- what the carousel is about, the key message, the emotional journey from hook to CTA. Written as a creative brief, not a technical description.]

Hook Visual Concept (DETAILED -- for video animation):
Visual Action Category: [e.g., Era Clash / Riding Absurd / Makan Nyeleneh]
Scene Description: [Full vivid description of the hook image -- what creator is wearing, what they're doing, their expression, the environment, the absurd element, the comedy detail. This MUST be detailed enough for a video agent to understand exactly what to animate.]
Key Motion Opportunities: [What could move/animate in this scene -- e.g., "bullets hitting shield with sparks, creator straining against impact, background explosions, shell casings falling"]
Comedy Detail: [The specific unexpected comedy element -- e.g., "wig flying off", "glasses sliding down nose", "bullet stuck in shield like a dart"]

Per-Slide Scene Descriptions:
| Slide | Type | Scene Description | Mood/Energy | Key Visual Elements |
| 1 | Hook | [Visual setting, what's happening, atmosphere -- NOT the prompt] | [e.g., Chaotic, high-energy] | [e.g., Night market, cockroach on skewer, neon lights] |
| 2 | Foreshadow | [Scene description] | [Mood] | [Key elements] |
| ... | ... | ... | ... | ... |
| N | CTA | [Scene description] | [Mood] | [Key elements] |

Emotional Arc:
[Slide 1: HIGH (6/6)] -> [Slide 2: DIP (3/6)] -> [Slide 3: BUILD (2/6)] -> ... -> [Slide N: WARM (1/6)]

Text Elements (Must Stay Readable in Video):
Every slide contains these text elements that must remain sharp and readable if animated:
- Headline (ALL CAPS, bottom gradient zone)
- Subtitle ([config: subtitle_language], below headline)
- Brand icon (center, thirty percent opacity)
- @handle watermark (center, below brand icon)
- Page number (top-left corner)
- SWIPE (GESER) > (below headline, all slides except CTA)
- CTA-specific: social icons + handle (CTA slide only)

Reference Images Used:
| Filename | Description | Used In Slides |
| creator-face.png | Creator face reference | 1, 2, N (all creator-facing slides) |
| creator-brand.png | Brand icon/logo | All slides |
| ref-{name}.png | [Object description] | [Which slides use it] |

Creative Context:
- Hook category: [confirmed category from creative clarification]
- Visual hook idea: [confirmed scene concept]
- Target audience: [inferred from topic + platform]
- Tone: [e.g., Gen-Z Bahasa, educational but entertaining]
- Key message: [1 sentence -- what the viewer should remember]

Source Material:
- Source URL: [if provided, otherwise "Original content"]
- Source type: [Instagram post / TikTok / LinkedIn / Original]
- Notes: [any relevant context from source extraction]

---

KEY RULES
- Natural language, NOT keyword spam
- 80-200 words optimal (up to 250 for complex compositions with text)
- Negative constraints at END: "no third-party branding"
- Always specify reference image filename for creator shots
- All 8 WOW elements MANDATORY -- minimum score 6/8
- Text rendered IN-IMAGE -- no separate post-production section
- Default: Per branding kit Language section (bilingual by default)
- API: response_modalities=['TEXT', 'IMAGE'], image_size="4K" (uppercase K)
- Aspect ratio set per target platform
`;
