# Platform Specs — Quick Reference
## DALL-E 3 + VEO 3.1 + Sora 2

---

## Fixed Project Specs (Non-Negotiable)

| Parameter | Value |
|-----------|-------|
| Aspect Ratio | **9:16 vertical** |
| Video Resolution | **1080p** |
| Image Resolution | **1024×1792** (DALL-E 3) |
| Frame Rate | 24fps |

---

## DALL-E 3 (Image Generation)

### API Settings

| Parameter | Value |
|-----------|-------|
| Model | `dall-e-3` |
| Quality | `hd` (always for video input) |
| Style | `vivid` (cinematic) or `natural` |
| Size | `1024×1792` (portrait) |
| Max Prompt | 4,000 characters |
| Images/Call | 1 (enforced) |
| Response Format | `b64_json` (URLs expire 60min) |

### Pricing

| Size | Standard | HD |
|------|----------|-----|
| 1024×1024 | $0.04 | $0.08 |
| 1792×1024 | $0.08 | $0.12 |
| 1024×1792 | $0.08 | $0.12 |

### Critical Constraints

- **No reference image support** → use Character Bible approach
- **No negative prompts** → use positive framing only
- **Auto prompt rewrite** → prefix with "My prompt has full detail so no need to add more:"
- **Rate limit** → 4+ seconds between calls

### Positive Framing Examples

| ❌ Negative | ✅ Positive |
|------------|------------|
| "no blur" | "crystal-clear sharp focus" |
| "no text" | "clean frame without overlays" |
| "no people" | "isolated subject, empty environment" |

---

## VEO 3.1 (Video Generation)

### Core Specs

| Parameter | Value |
|-----------|-------|
| Resolution | 720p (default), **1080p** (8s only) |
| Aspect Ratios | 16:9, **9:16** |
| Duration | 4, 6, **8 seconds** |
| Frame Rate | 24fps (fixed) |
| Max Tokens | 1,024 (optimal: 100-150 words) |
| Reference Images | Up to 3 |
| Extensions | +7s per hop, max 20 (~148s) |

### Audio Constraints (CRITICAL)

| Parameter | Constraint |
|-----------|------------|
| Dialogue/8s | **12-15 words MAX** |
| Syllables/8s | 20-25 MAX |
| Format | `[Character] says: "[dialogue]"` |
| Required | "no subtitles, no audience sounds" |

⚠️ **Always specify audio** — unspecified causes random sounds.

### Pricing

| Quality | With Audio | Without |
|---------|------------|---------|
| Standard | $0.40/s | $0.20/s |
| Fast | $0.15/s | $0.10/s |

### Extension Rules

- Resolution **720p only** (1080p cannot extend)
- Source must be VEO-generated
- Uses final 24 frames (1s) for context
- End with "anchor moment" (hold pose 0.5s)

---

## Sora 2.0 (Video Generation) — DEFAULT PLATFORM

### Model Variants

| Parameter | sora-2 | sora-2-pro |
|-----------|--------|------------|
| Resolution | 720×1280 | 1024×1792 |
| Duration | **10s, 15s** (recommended) | Up to 20s |
| Cost | ~$0.10/s | ~$0.30-0.50/s |
| Best For | Standard production | Cinematic |

### Sparkfluence Segment Durations

| Segment Type | Duration | Rationale |
|--------------|----------|------------|
| **HOOK** | **5s (FIXED)** | Scroll-stopper, non-negotiable |
| FORE | 10s | Tease + retention lock |
| BODY-X | 10s or 15s | Content density |
| PEAK | 15s | Payoff moment |
| CTA | 10s | Closing impact |

### Dialogue Limits by Duration

| Duration | Max Words | Max Syllables |
|----------|-----------|---------------|
| 10s | 20-25 words | 30-35 |
| 15s | 30-35 words | 45-50 |

### Critical Constraints

- Reference image = **first-frame anchor**
- Image must **exactly match** target resolution
- **10s clips = best quality/cost balance**
- **ONE camera move + ONE action** per shot
- Built-in voiceover (no separate TTS needed)

### Beat-Based Timing (10s example)

```
- Subject intro, expression (0-3s)
- Main action/delivery (3-7s)
- Reaction, gesture completion (7-10s)
```

### Physics Rules

Always describe forces explicitly:
- "Water pours downward, creating ripples"
- "Fabric billows in gentle breeze"
- "Object falls with realistic weight"

---

## Platform Decision Matrix

```
Use Sora 2.0 (DEFAULT):
├─ Standard production (10s, 15s segments)
├─ Built-in voiceover capability
├─ Multi-shot narrative
├─ Complex physics/motion
└─ Cost-effective at scale

Use VEO 3.1 when:
├─ Segment ≤ 8 seconds only
├─ Critical lip-sync (dialogue-heavy)
└─ Legacy workflow compatibility
```

**Default:** Sora 2.0 (10s/15s segments, built-in voiceover)

---

## Comparison Table

| Capability | DALL-E 3 | VEO 3.1 | Sora 2.0 |
|------------|----------|---------|----------|
| Max Resolution | 1792×1024 | 1080p | 1080p |
| Max Duration | — | 8s | **10s, 15s** (rec) |
| Native Audio | — | ✅ Best | ✅ Built-in VO |
| Lip-sync | — | ✅ Best | Good |
| Multi-shot | — | Good | ✅ Best |
| Physics | — | Strong | ✅ Best |
| Ref Images | ❌ No | Up to 3 | ✅ Yes |
| Sparkfluence Default | Images | Legacy | **✅ Primary** |

---

## I2V Workflow Pipeline (Sora 2.0 Default)

```
DALL-E 3 (1024×1792, HD)
    ↓
[Resize to exact 1024×1792]
    ↓
Sora 2.0 (10s or 15s, built-in VO)
    ↓
FFmpeg Combine (transitions + subtitles)
    ↓
Final Video
```

### Resolution Matching

| Platform | Input Requirement | Notes |
|----------|-------------------|-------|
| Sora 2.0 | **1024×1792** exact | Primary workflow |
| VEO 3.1 | 720p+ (auto-resize) | Legacy fallback |

---

*End of Platform Specs*
