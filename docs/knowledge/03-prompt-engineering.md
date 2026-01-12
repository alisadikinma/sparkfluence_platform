# Prompt Engineering Guide

## Emotion → Expression → Lighting

| Emotion | Expression | Lighting |
|---------|------------|----------|
| **Shock** | Wide eyes, raised brows, open mouth | 8:1 harsh |
| **Curiosity** | Bright eyes, raised brows, lean in | 4:1 soft |
| **Authority** | Steady gaze, knowing smile, arms crossed | Rembrandt 4:1 |
| **Tension** | Furrowed brow, fixed gaze, rigid | Chiaroscuro 8:1+ |
| **Confidence** | Relaxed brow, steady gaze, squared shoulders | Balanced 3200K |
| **Excitement** | Bright eyes, genuine smile, animated | High-key warm |

### Expression Prompt Phrases

| Type | Phrase |
|------|--------|
| Curiosity | "engaged bright eyes, slight head tilt, open expression" |
| Authority | "steady unwavering gaze, composed expression, knowing smile" |
| Shock | "wide startled eyes, raised brows, open mouth, frozen posture" |
| Tension | "intense fixed gaze, clenched jaw, rigid shoulders" |
| Confidence | "steady direct gaze, subtle assured smile, squared shoulders" |

---

## Lighting Reference

### Patterns

| Pattern | Position | Mood | Prompt |
|---------|----------|------|--------|
| **Rembrandt** | 45° side, above | Dramatic | "Rembrandt lighting, triangle shadow" |
| **Butterfly** | Above, on-axis | Glamorous | "Butterfly lighting, glamorous" |
| **Split** | 90° side | Intense | "Split lighting, half-face shadow" |
| **Loop** | 30-45° | Natural | "Soft loop lighting, flattering" |
| **Rim** | Behind | Separation | "Strong rim light, edge separation" |

### Ratios & Temperature

| Ratio | Use | Kelvin | Character |
|-------|-----|--------|-----------|
| 2:1 | Beauty | 3200K | Warm |
| 4:1 | Drama | 3500K | Golden hour |
| 8:1 | Thriller | 5600K | Neutral |
| 16:1 | Horror | 6500K+ | Cool |

---

## Camera Reference

### Shot Sizes

| Shot | Frame | Lens | Purpose |
|------|-------|------|---------|
| **CU** | Face fills | 85mm f/1.8 | Strong emotion |
| **MCU** | Head+shoulders | 50-85mm | Dialogue |
| **MS** | Waist up | 50mm | Standard |
| **WS** | Full body | 24-35mm | Context |

### Angles

| Angle | Psychology |
|-------|------------|
| Eye-level | Neutral |
| Low angle | Powerful |
| High angle | Vulnerable |
| Dutch | Tension |

### Camera Movements (VEO-Verified)

| Movement | Effect | VEO Term |
|----------|--------|----------|
| Push in | Intimacy | "smooth dolly push-in" |
| Pull back | Reveal | "gentle dolly pull-back" |
| Track | Following | "tracking shot following subject" |
| Pan | Horizontal | "slow pan left/right" |
| Orbit | Tension | "orbit shot circling subject" |
| Static | Stability | "static locked-off shot" |

---

## Film Stocks & Color

| Stock | Character | Best For |
|-------|-----------|----------|
| **Vision3 500T** | Hollywood, 3200K | Drama |
| **Portra 400** | Warm skin | Portraits |
| **CineStill 800T** | Halation, neon | Night, noir |

| Grade | Mood |
|-------|------|
| Teal-Orange | Blockbuster |
| Bleach Bypass | Gritty |
| Golden Hour | Romantic |
| Muted | Somber |

---

## CREATOR Shot Template (fal.ai nano-banana-pro)

```
A photorealistic cinematic [shot_type] of [character_description].

Expression: [from emotion table]
Pose: [action/gesture]
Wardrobe: [costume]

Camera: [CU/MCU/MS], [85/50mm] f/[1.8/2.8], [eye-level/slight low]
Composition: [rule of thirds / centered]

Lighting: [Rembrandt/Loop/Butterfly] lighting, [4:1/2:1] ratio, [3200K/5600K]
Key from [camera left/right], [soft/hard] quality.

Color: [Vision3 500T / Portra 400], [teal-orange / natural] grade
Atmosphere: [light haze / clean]

Environment: [setting description]
Background: [deep bokeh / moderate blur]

Style: Cinematic photorealistic, natural skin texture, Hollywood production.
Technical: Portrait 1024×1792, high quality.
Clean frame, no text overlays, no watermarks.
```

---

## B-ROLL Visual Extraction Pipeline

### Problem
Script langsung → Image prompt = generic/irrelevant visuals

### Solution: Visual Brief

```typescript
interface VisualBrief {
  topic_keywords: string[]        // Concrete nouns from script
  abstract_concepts: string[]     // Terms needing metaphor
  emotional_tone: string          // tense, hopeful, urgent, calm
  
  primary_subject: {
    element: string               // Main visual focus
    attributes: string[]          // 2-3 modifiers
    action: string                // What it's doing
  }
  secondary_elements: string[]
  environment: {
    setting: string
    lighting: string
    atmosphere: string
  }
  
  image_prompt: string            // Final cinematic prompt
  negative_prompt: string         // Elements to exclude
}
```

### Abstract → Metaphor Lookup

#### Technology

| Abstract | Visual Metaphors |
|----------|------------------|
| **Security** | Padlock, shield, vault door, fingerprint |
| **Password** | Key and lock, digital keypad, encrypted text |
| **Encryption** | Lock with binary, scrambled data, secure tunnel |
| **Data** | Flowing light streams, server racks, holographic |
| **AI/Algorithm** | Neural network nodes, brain with circuits |
| **Cloud** | Server farm, floating data cubes, nodes |
| **Hacking** | Red warning, skull icon, dark terminal |
| **Privacy** | Eye with shield, masked figure, curtain |

#### Finance

| Abstract | Visual Metaphors |
|----------|------------------|
| **Cryptocurrency** | Bitcoin coin, blockchain, mining rig |
| **Investment** | Growing plant with coins, upward graph |
| **Profit/Growth** | Rising chart, stacking coins, sunrise |
| **Loss/Risk** | Falling graph, cracking ice, storm clouds |
| **Trading** | Candlestick charts, dual monitors |
| **Wealth** | Gold bars, overflowing chest |

#### Concepts

| Abstract | Visual Metaphors |
|----------|------------------|
| **Innovation** | Light bulb, gears, rocket launch |
| **Success** | Mountain peak, trophy, finish line |
| **Time** | Hourglass, clock gears, calendar pages |
| **Speed** | Motion blur, lightning bolt |
| **Connection** | Bridge, handshake silhouette, network |
| **Problem** | Tangled knots, maze, roadblock |
| **Solution** | Key in lock, clear path, completed puzzle |

### B-ROLL Template (fal.ai wan/v2.6)

```
prompt: "Cinematic [shot_type] of [subject/scene]. 
[Visual details - lighting, atmosphere].
[Camera specs - lens, angle, composition].
[Film look - stock, grade, mood].
Professional cinematography, 8K quality, no humans visible."

negative_prompt: "blurry, low quality, distorted, artifacts, 
human face, person, text, watermark, logo, cartoon, anime, 
illustration, painting, oversaturated, underexposed"
```

### B-ROLL Validation

| Check | Rule |
|-------|------|
| Concrete subject? | NOT "concept" or "idea" |
| No humans? | No face, person, people |
| Topic match? | Keywords in prompt |

---

## VEO Video Prompt Template

```
Duration: ~[N]s (max 8s)
Resolution: 1080p
Aspect: 9:16 vertical

CAMERA MOTION
Movement: [VEO-verified term]
Speed: [slow/medium/fast]

SUBJECT MOTION
[Micro-movements: blinks, breathing, gestures]
[Expression shift if any]

AMBIENT MOTION
[Particles, environmental, light shifts]

AUDIO
Ambient: [environmental sound]
Dialogue: [Character] says: "[max 14 words for 8s]"
Exclude: no subtitles, no audience sounds

TRANSITION
[End instruction: hold/fade/push-in]

NEGATIVE
No blurry elements, no distortion, no artifacts.
```

---

## Sora 2 Video Prompt Template

```
Duration: ~[N]s (max 15s/25s)
Resolution: 1080p
Aspect: 9:16

SCENE ACTION
[What happens - MOTION only, not appearance]

CINEMATOGRAPHY
Camera: [framing + single movement]
Lens: [focal length + DOF]
Lighting: [key source, fill, temp]

ACTIONS (beat-based)
- Beat 1: [action] (0-2s)
- Beat 2: [action] (2-4s)
- Beat 3: [action] (4-6s)

AUDIO
Ambient: [environmental sound]
Dialogue: "[Character]: [lines within word limit]"

EXCLUSIONS
No text on screen, no morphing, no artifacts.
```

---

## Thumbnail Template

```
PRIMARY SUBJECT (50-60% of frame):
[Character description]
Expression: [EXAGGERATED emotion] – wide eyes, raised brows
Position: Face positioned [left/right/center]

SECONDARY ELEMENT:
[Topic visual in background/side]

Camera: Tight close-up, 85mm f/1.8, slight dutch tilt (5-10°)
Lighting: High-contrast (Rembrandt/Split), 4:1-6:1 ratio
Color: HIGH SATURATION, teal-orange, Vision3 500T

TEXT ZONES: Reserve [area] for title – keep clear
Technical: Portrait 1024×1792, HD quality, vivid style.
Clean, no text rendered, no watermarks.
```

---

## Content Type Defaults

| Type | Shot | Lens | Lighting |
|------|------|------|----------|
| **HOOK** | CU | 85mm | Rembrandt 4:1 |
| **Explanation** | MCU | 50mm | Loop 2:1 |
| **CTA** | CU | 85mm | Butterfly 2:1 |
| **B-roll** | Various | 50-100mm | Soft |

---

## Audio Templates

| Environment | Audio Prompt |
|-------------|--------------|
| **Office** | "Quiet office – soft HVAC hum, distant typing. No music, no subtitles." |
| **Home** | "Home – soft room tone, distant traffic. No music, no subtitles." |
| **Studio** | "Clean studio – minimal room tone, professional." |
| **Tech** | "Data center – server fan hum, electronic ambient." |
