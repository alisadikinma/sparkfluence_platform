// Carousel Rebranding Pipeline — RAG knowledge for LLM prompt injection
// Source: ai-image-carousel-prompt-gen/references/carousel-rebranding.md
// Exported as template literal for Deno Edge Function compatibility

export const CAROUSEL_REBRANDING_KNOWLEDGE = `
CAROUSEL REBRANDING PIPELINE

Configurable values (accent color, handle, language, film stock) are in the branding kit config.
This section contains rebranding workflow rules and analysis steps.

OVERVIEW
Transform third-party carousel designs into the user's branded content while preserving the educational value and visual impact.

STEP 1: SOURCE ANALYSIS

For each uploaded carousel, extract:
1. Slide count and sequence (Hook -> Content -> CTA)
2. Per-slide content: topic, key data/stats, visual concept
3. Source style DNA: color palette, typography, layout, branding elements
4. Source elements to REMOVE: competitor badges, logos, handles, watermarks, source category tags (e.g., "TECHNOLOGY" badge -- this is the source creator's branding, NOT a content category to keep)
5. Subject brands to KEEP: logos/UI of the brand being DISCUSSED (Google, WhatsApp, etc.) -- these provide essential context

Output a content map:
| Slide | Type | Topic | Key Data | Visual Concept | Remove |

STEP 2: STYLE CONVERSION MATRIX

Convert source style -> user's brand style using this mapping:

| Source Element | Conversion |
| Source accent color | -> User's accent color |
| Cold tech background | -> Warm amber/golden environment |
| Generic global setting | -> Creator's locale context |
| Source creator badge/watermark | -> DELETE completely (competitor branding) |
| Subject brand (Google, WhatsApp, etc.) | -> KEEP -- subject brand IS the context, must remain visible |
| No creator face | -> ADD face on Hook + CTA |
| Source branding | -> User's brand icon (center, thirty percent opacity, above watermark) + @handle (center, thirty percent opacity) |
| Cold color grading | -> [config: film_stock] warm look |
| Blue HUD overlays | -> Warm golden/amber HUD overlays |
| Small/weak text overlay | -> Largest possible billboard-scale text in gradient zone |

Color Temperature Shift Rules:
- Cold accent colors (blues, cyans) -> shift to user's accent color
- Dark backgrounds stay dark but shift from blue-black -> warm-black (hint of amber)
- Data overlays/HUDs: keep futuristic feel but use warm glow instead of cold
- Holographic elements: warm-toned holographic instead of cold-toned

STEP 3: SLIDE-BY-SLIDE PROMPT GENERATION

Hook Slide Template:
A photorealistic cinematic close-up of [CHARACTER from reference image: creator-face.png].
[Exaggerated hook expression -- e.g., wide shocked eyes, mouth open].
[Wardrobe]. [Warm environment -- e.g., modern cafe, lifestyle setting].

Lens: 85mm f/1.8, shallow depth of field with warm bokeh background.
Rembrandt lighting at 4:1 ratio, 3200K warm key from left.
[config: film_stock], [config: color_grade]. Subtle atmospheric haze.

Bottom half reserved for text overlay (smooth dark gradient zone).
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.
[PLATFORM ASPECT] aspect. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

Content B-Roll Slide Template:
A photorealistic cinematic [shot type] of [topic visual concept].
[Specific scene description with culturally relevant context].
[If slide discusses a specific brand/product: include recognizable brand elements
(logo, UI, interface, color scheme) of the subject for viewer context.
Example: Google search bar visible, WhatsApp green chat UI, etc.]
[Warm-toned HUD/data overlay elements showing key stat in large readable text].

Lens: [lens]mm f/[aperture], [angle]. [Depth of field].
[Lighting pattern], [ratio], [Kelvin -- warm side].
[config: film_stock], [config: color_grade]. [Atmosphere].

Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed
uppercase text, the largest possible font size that fills the width, extra bold weight.
Render the creator's brand icon from reference image creator-brand.png centered in the middle of the image
as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white, centered in the middle of the image directly below the brand icon,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.
[PLATFORM ASPECT] aspect. No competitor branding (subject brand required for context).
No creator face in this slide.

Split-Panel / Comparison Slide Template:
A photorealistic split-panel composition divided vertically into two halves.

Left half ("[LABEL A IN BAHASA]"): [Current/old way scene] featuring [CREATOR].
[Context-appropriate setting]. Natural warm daylight, [config: film_stock].

Right half ("[LABEL B IN BAHASA]"): Same person in same location but [contrasting version].
Warm-toned holographic interfaces. Enhanced but still warm color temperature.

Both halves: same environment context.
Lens: 50mm f/2.8, eye-level. Warm golden hour lighting bridging both panels.
Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed
uppercase text, the largest possible font size that fills the width, extra bold weight.
Render the creator's brand icon from reference image creator-brand.png on the vertical center divider line
as a small circular badge at thirty percent opacity -- use the exact icon from the file, do not generate a new one.
"[config: handle]" as a watermark in white on the vertical center divider line,
thirty percent opacity, subtle background mark only.
"[config: swipe_cta_text]" in small white text positioned directly beneath the headline text with minimal gap.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.
[PLATFORM ASPECT] aspect. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

CTA Slide Template:
A photorealistic cinematic medium close-up of [CHARACTER from reference image: creator-face.png].
Wearing [wardrobe].
Expression: warm confident smile, direct eye contact, approachable and inviting.
Arms crossed or relaxed professional pose.

Background: warm bokeh with soft golden ambient light, modern interior.
Lens: 85mm f/2, shallow depth of field. Butterfly lighting 2:1, 3500K golden.
[config: film_stock], [config: color_grade].

Bottom half reserved for text overlay + social handles.
"[N]/[TOTAL]" as a small white page number in the top-left corner of the image.
[PLATFORM ASPECT] aspect. No competitor branding.
Maintain exact appearance from reference image: creator-face.png.

STEP 4: TEXT OVERLAY GUIDE (PER SLIDE)

For each slide, output a text specification sheet:

Text Overlay -- Slide [N]
- Main headline: "[TEXT]" -- White #FFFFFF, EXTRA BOLD/BLACK weight condensed, ALL CAPS
  - Font must be largest possible -- billboard-scale, dominating gradient zone
- Accent keywords (2-4): "[KEYWORD 1]", "[KEYWORD 2]", "[KEYWORD 3]" -- [config: accent_color], same massive size. Min 2 keywords highlighted
- [config: subtitle_language] subtitle: [SUBTITLE LINE] -- [config: subtitle_color] at slightly smaller size (never white like main headline)
- Position: Bottom half, centered
- Branding:
  - [User's brand icon] center of image, above watermark, thirty percent opacity
  - [User's @handle] center of image, below brand icon, thirty percent opacity (all slides)
- Subject brand (if applicable): [Brand logo/UI] visible in scene for context
- Corner labels: [series name / episode ID] (if applicable)
- Page number: "[N]/[TOTAL]" -- white, small, top-left corner (all slides)
- [config: swipe_cta_text]: Bottom center (all slides except CTA)

STEP 5: VISUAL CONTINUITY CHECKLIST

Before delivering carousel set, verify:

- ALL slides use consistent warm palette
- Accent color is consistent throughout
- NO competitor branding on ANY slide (source creator badges/watermarks removed)
- Subject brand visible where required (Google logo for Google stats, WhatsApp UI for WhatsApp data, etc.)
- Hook slide has creator face with exaggerated expression
- CTA slide has creator face with warm confident expression
- B-Roll with human faces = creator face ALWAYS included
- B-Roll without humans = NO creator face
- All slides have dark gradient text zone (bottom half) with largest possible billboard-scale text
- Brand icon centered in image (thirty percent opacity, above watermark) on every slide
- @handle watermark centered in image (thirty percent opacity, below brand icon) on every slide
- Page number "[N]/[TOTAL]" in top-left corner on all slides
- SWIPE (GESER) on all slides except CTA
- Film stock consistently warm (Portra 400 / Vision3 500T)
- Aspect ratio matches target platform (IG Feed 4:5, TikTok 9:16, LinkedIn 4:5)
`;
