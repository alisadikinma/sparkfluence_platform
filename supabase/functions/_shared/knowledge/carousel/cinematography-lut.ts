// Cinematography Lookup Tables
// Ported from ai-image-carousel-prompt-gen/references/cinematography-lut.md
// RAG knowledge injected into LLM prompts for carousel image generation

export const CINEMATOGRAPHY_LUT_KNOWLEDGE = `
CINEMATOGRAPHY LOOKUP TABLES

1. EMOTION -> EXPRESSION -> SETUP

| Emotion         | Expression Keywords                              | Lighting                    | Lens              | Camera                      |
|-----------------|--------------------------------------------------|-----------------------------|--------------------|-----------------------------|
| Shock           | Wide eyes, raised brows, open mouth, frozen      | Split 8:1, harsh key        | 85mm CU            | Static or quick push-in     |
| Curiosity       | Bright eyes, head tilt, raised brows             | Soft key 4:1                | 50mm MCU            | Gentle push-in              |
| Confidence      | Steady gaze, subtle smile, squared shoulders     | Rembrandt 4:1, 3200K        | 85mm CU             | Static or slow push-in      |
| Excitement      | Bright eyes, genuine smile, lifted brows         | High-key 2:1, warm          | 50mm MCU            | Tracking or gentle orbit    |
| Tension         | Furrowed brow, tight lips, intense gaze          | Chiaroscuro 8:1+            | 35mm, Dutch         | Slow push-in or handheld    |
| Awe             | Softened eyes, open mouth, relaxed brow          | Rim + volumetric            | 24mm WS             | Crane rise                  |
| Warmth          | Warm smile, soft eyes, relaxed posture           | Butterfly 2:1, 3500K        | 85mm CU             | Gentle approach             |
| Authority       | Steady gaze, knowing smile, steepled hands       | Rembrandt 4:1, 3200K        | 85mm, slight low    | Static                      |
| Contemplation   | Downcast eyes, hand near chin                    | Soft side 4:1               | 50mm MCU            | Static or slow drift        |
| Intrigue        | Slightly narrowed eyes, gentle head tilt, focused gaze | Low-key, mysterious   | 50mm MCU            | Gentle push-in              |
| Resolution      | Relaxed brow, subtle confident smile, steady eye contact | Balanced 3-point, warm 3200K | 50mm MCU    | Static                      |
| Fear/Concern    | Wide eyes, tense lips, raised inner brows        | Underlit, cold 6500K+       | 35mm                | Handheld                    |
| Determination   | Set jaw, focused eyes, slight brow furrow        | Strong key, minimal fill    | 85mm CU             | Static or push-in           |

1b. EXPRESSION KEYWORD PHRASES

POSITIVE STATES:

| State      | Keyword Phrase                                              |
|------------|-------------------------------------------------------------|
| Joy        | "bright genuine smile, crinkled eyes, lifted cheeks"        |
| Confidence | "steady gaze, subtle knowing smile, squared shoulders"      |
| Warmth     | "soft warm smile, gentle open eyes, relaxed brow"           |
| Excitement | "wide bright eyes, open genuine smile, raised brows"        |
| Serenity   | "peaceful closed-lip smile, soft eyes, relaxed features"    |
| Gratitude  | "warm appreciative smile, soft glistening eyes, open expression" |

NEUTRAL STATES:

| State          | Keyword Phrase                                              |
|----------------|-------------------------------------------------------------|
| Contemplation  | "thoughtful downcast eyes, hand near chin, relaxed mouth"   |
| Curiosity      | "bright inquisitive eyes, slight head tilt, parted lips"    |
| Focus          | "narrowed concentrated eyes, set jaw, still posture"        |
| Intrigue       | "slightly narrowed eyes, gentle head tilt, subtle smile"    |
| Resolution     | "calm steady gaze, relaxed brow, confident subtle smile"    |

TENSION STATES:

| State          | Keyword Phrase                                              |
|----------------|-------------------------------------------------------------|
| Tension        | "furrowed brow, tight pressed lips, intense focused gaze"   |
| Fear           | "wide alarmed eyes, tense parted lips, raised inner brows"  |
| Determination  | "set jaw, focused intense eyes, slight brow furrow"         |
| Shock          | "wide frozen eyes, raised brows, open mouth, rigid posture" |
| Anger          | "narrowed eyes, clenched jaw, flared nostrils, tense brow"  |

2. LIGHTING PATTERNS

| Pattern    | Key Position             | Mood               | Prompt Phrase                            |
|------------|--------------------------|---------------------|------------------------------------------|
| Rembrandt  | 45 deg side, above eye   | Dramatic, authority | "Rembrandt lighting, triangle shadow"    |
| Butterfly  | Directly above, on-axis  | Glamorous, beauty   | "Butterfly lighting, glamorous"          |
| Split      | 90 deg direct side       | Intense, duality    | "Split lighting, half-face shadow"       |
| Loop       | 30-45 deg from camera    | Natural, flattering | "Soft loop lighting, flattering"         |
| Rim/Edge   | Behind subject           | Separation, drama   | "Strong rim light, edge separation"      |
| Broad      | Lit side toward camera   | Wider appearance    | "Broad lighting, open"                   |
| Short      | Shadow side toward camera| Slimming, moody     | "Short lighting, sculptural"             |

LIGHTING RATIOS:

| Ratio | Contrast | Use Case                    |
|-------|----------|-----------------------------|
| 2:1   | Subtle   | Beauty, commercial, CTA     |
| 4:1   | Moderate | Standard drama, Hook        |
| 8:1   | High     | Thriller, tension, dramatic |
| 16:1  | Extreme  | Horror, extreme drama       |

3. COLOR TEMPERATURE

| Source          | Kelvin      | Character          | Prompt Phrase                    |
|-----------------|-------------|--------------------|----------------------------------|
| Candlelight     | 1900K       | Deep warm orange   | "candlelit 1900K warm glow"      |
| Tungsten bulb   | 2700K       | Warm amber         | "tungsten 2700K amber"           |
| Tungsten        | 3200K       | Classic warm       | "tungsten 3200K warm"            |
| Golden hour     | 3500K       | Magic gold         | "golden hour 3500K"              |
| Midday          | 5600K       | Neutral            | "daylight 5600K neutral"         |
| Overcast        | 6500K       | Cool soft          | "overcast 6500K diffused"        |
| Shade           | 7500K       | Cool blue          | "open shade 7500K cool"          |
| Blue hour       | 9000-12000K | Twilight blue      | "blue hour 9000K mystery"        |

Default recommendation: 3200-3500K warm range for most social media content.

4. CINEMATOGRAPHER SIGNATURES

| DP                  | Signature Look                         | Key Techniques                                    | Prompt Style                                                  |
|---------------------|----------------------------------------|---------------------------------------------------|---------------------------------------------------------------|
| Roger Deakins       | Natural motivated light, precise composition | Single-source key, subtle fill, practical motivation | "Deakins natural motivated lighting, precise composition, minimal fill" |
| Greig Fraser        | Atmospheric, desaturated, textured     | Mixed media, natural haze, muted palette          | "Fraser atmospheric desaturated texture, natural haze, mixed format" |
| Hoyte Van Hoytema   | Large-format, immersive, organic       | IMAX, natural light preference, minimal filtration | "Van Hoytema large-format organic, immersive natural light"   |
| Bradford Young      | Underexposed, rich shadows, low-key    | Dark skin-tone mastery, motivated practicals      | "Bradford Young underexposed rich shadows, low-key practicals" |
| Emmanuel Lubezki    | Long-take natural light, fluid         | Natural/magic hour, wide-angle close              | "Lubezki natural light fluid, magic hour wide-angle intimate" |

5. CAMERA AND LENS

SHOT TYPES:

| Shot | Frame           | Lens          | Purpose                |
|------|-----------------|---------------|------------------------|
| ECU  | Eyes/detail      | 100mm macro   | Intense detail         |
| CU   | Face fills       | 85mm f/1.8    | Strong emotion, Hook   |
| MCU  | Head+shoulders   | 50-85mm       | Dialogue, CTA          |
| MS   | Waist up         | 50mm          | Standard coverage      |
| MWS  | Knees up         | 35mm          | Cowboy/action          |
| WS   | Full body+env    | 24-35mm       | Context, establishing  |
| EWS  | Landscape dominant | 14-18mm     | Epic scale             |

CAMERA ANGLES:

| Angle       | Psychology        | Prompt                     |
|-------------|-------------------|----------------------------|
| Eye-level   | Neutral, equal    | "eye-level neutral"        |
| Low angle   | Powerful, heroic  | "low angle heroic"         |
| High angle  | Vulnerable        | "high angle vulnerable"    |
| Dutch 15-25 | Tension, unease   | "Dutch angle tension"      |
| Bird's eye  | Directly overhead | "bird's eye omniscient"    |
| Worm's eye  | Ground level up   | "worm's eye maximum power" |

6. FILM STOCKS (WARM PALETTE)

| Stock               | Character              | Best For                    | Prompt                             |
|---------------------|------------------------|-----------------------------|------------------------------------|
| Kodak Portra 400    | Warm skin, natural     | DEFAULT -- portraits, lifestyle | "Kodak Portra 400 warm skin tones" |
| Kodak Vision3 500T  | Hollywood warm         | Dramatic, professional      | "Kodak Vision3 500T tungsten"      |
| Kodak Vision3 250D  | Crisp, accurate        | Daylight                    | "Kodak 250D daylight crisp"        |
| Kodak Ektar 100     | Vivid saturated        | Colorful scenes, outdoors   | "Kodak Ektar 100 saturated vivid"  |
| Kodak Portra 800    | Versatile, slightly more grain | Low light, versatile  | "Portra 800 natural warmth"        |
| Kodak Tri-X 400     | High contrast B&W grain | Black & white drama        | "Tri-X black and white contrasty"  |
| CineStill 800T      | Halation glow          | Night, neon (use warm)      | "CineStill 800T warm halation"     |
| Fujifilm Velvia      | Extreme saturation     | Landscapes                  | "Velvia hyper-saturated"           |

7. COLOR GRADING STYLES

| Style              | Description                                  | Use Case              | Prompt Phrase                                          |
|--------------------|----------------------------------------------|-----------------------|--------------------------------------------------------|
| Teal & Orange      | Complementary color split, warm skin vs cool shadows | Blockbuster, cinematic | "teal and orange color grade, complementary cinematic" |
| Bleach Bypass      | Desaturated, high contrast, silver retained  | Gritty, thriller      | "bleach bypass desaturated high contrast gritty"       |
| Golden Hour        | Warm overall push, lifted shadows            | Romance, lifestyle    | "golden hour warm grade, lifted amber shadows"         |
| Blue Hour          | Cool blue tones, twilight mood               | Mystery, melancholy   | "blue hour cool grade, twilight mood"                  |
| Muted/Desaturated  | Pulled saturation, lifted blacks             | Indie, art house      | "muted desaturated grade, lifted blacks indie"         |
| Cross-Process      | Shifted hues, unexpected color casts         | Experimental, retro   | "cross-process shifted hues experimental retro"        |
| Day for Night      | Blue push, crushed shadows                   | Simulated night       | "day for night blue push, deep crushed shadows"        |

8. ATMOSPHERE ELEMENTS

| Type         | Particle  | Effect            | Prompt Phrase                              |
|--------------|-----------|-------------------|--------------------------------------------|
| Haze         | Fine      | Light rays, depth | "atmospheric haze volumetric rays"         |
| Fog          | Large     | Thick, mysterious | "thick fog mysterious"                     |
| Ground fog   | Heavy, low| Floor mist        | "ground fog low mist"                      |
| Smoke        | Variable  | Noir, dramatic    | "wispy smoke noir atmosphere"              |
| Rain         | Water     | Wet, moody        | "rain backlit streaking"                   |
| Snow         | Flakes    | Cold, soft        | "falling snow soft diffused"               |
| Dust         | Fine      | Golden particles  | "golden dust particles in warm light"      |
| Bokeh        | --        | Subject isolation  | "warm bokeh background, golden circles"    |
| Edison bulbs | --        | Lifestyle warmth   | "Edison bulb warm glow, shallow DOF"       |

8a. VOLUMETRIC LIGHTING SETUPS:

| Setup            | Description                    | Prompt Phrase                                          |
|------------------|--------------------------------|--------------------------------------------------------|
| God rays         | Beams through atmosphere       | "god rays streaming through haze, volumetric beams"    |
| Window blinds    | Patterned light slats          | "light through venetian blinds, striped shadow pattern" |
| Backlit particles| Rim-lit floating dust/haze     | "backlit particles glowing, rim-lit dust atmosphere"   |
| Smoke shafts     | Light cutting through smoke    | "light shafts through smoke, dramatic volumetric"      |

8b. SURFACE EFFECTS:

| Effect             | Description                    | Prompt Phrase                                          |
|--------------------|--------------------------------|--------------------------------------------------------|
| Wet streets        | Reflective, moody ground       | "wet street reflections, rain-slicked pavement glow"   |
| Puddle reflections | Mirror-like ground reflections | "puddle reflections, mirrored city lights"             |
| Frost              | Ice crystal texture            | "frost-covered surface, ice crystal texture cold"      |
| Steam              | Rising vapor, warmth           | "rising steam atmosphere, warm vapor diffusion"        |

9. QUICK COMBOS -- CONTENT TYPE -> SETUP

| Content             | Shot     | Lens         | Lighting              | Film Stock    |
|---------------------|----------|--------------|------------------------|---------------|
| Hook                | CU       | 85mm f/1.8   | Rembrandt 4:1, 3200K   | Portra 400    |
| CTA                 | MCU      | 85mm f/2     | Butterfly 2:1, 3500K   | Portra 400    |
| B-Roll tech         | Various  | 35-50mm      | Soft 2:1, mixed        | Vision3 500T  |
| B-Roll environment  | WS       | 24-35mm      | Natural/golden hour    | Portra 400    |
| Split-panel         | MS       | 50mm f/2.8   | Loop 3:1, 3500K        | Portra 400    |
| Thumbnail           | CU tight | 85mm f/1.8   | Rembrandt 4:1-6:1      | Portra 400    |

9a. MOOD -> COMPLETE SETUP:

| Mood              | Lighting                 | Grade             | Atmosphere          | Framing       |
|-------------------|--------------------------|-------------------|---------------------|---------------|
| Tense thriller    | Split 8:1, cool 5600K    | Bleach bypass      | Heavy haze          | 35mm Dutch    |
| Mystery intrigue  | Low-key 8:1, cool        | Desaturated teal   | Fog                 | 35mm          |
| Epic reveal       | Rim + volumetric         | Teal orange        | Dust, god rays      | 24mm crane    |
| Intimate dialogue | Soft 4:1, warm practical | Portra, natural    | Clean               | 85mm          |
| Urban noir        | Hard 8:1, mixed temp     | CineStill 800T     | Rain, wet streets   | 35mm low      |
| Tech/modern       | Clean 2:1, 5600K         | Neutral, slight teal | Clean, screen glow | 50mm          |
`;
