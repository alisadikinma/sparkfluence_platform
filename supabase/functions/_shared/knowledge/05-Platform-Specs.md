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

## Sora 2 (Video Generation)

### Model Variants

| Parameter | sora-2 | sora-2-pro |
|-----------|--------|------------|
| Resolution | 720×1280 | 1024×1792 |
| Duration | 4s, 8s, 12s | Up to 20s |
| Cost | ~$0.10/s | ~$0.30-0.50/s |
| Best For | Iteration | Cinematic |

### Critical Constraints

- Reference image = **first-frame anchor**
- Image must **exactly match** target resolution
- **4s clips > 8s clips** for quality
- **ONE camera move + ONE action** per shot
- Blocks human face uploads (enterprise only)

### Beat-Based Timing

```
- Subject turns (0-2s)
- Pauses, expression changes (2-3s)
- Completes gesture (3-4s)
```

### Physics Rules

Always describe forces explicitly:
- "Water pours downward, creating ripples"
- "Fabric billows in gentle breeze"
- "Object falls with realistic weight"

---

## Platform Decision Matrix

```
Use VEO 3.1 when:
├─ Segment ≤ 8 seconds
├─ Critical lip-sync (dialogue-heavy)
├─ 4K deliverable needed
└─ Single-shot, high-quality

Use Sora 2 when:
├─ Segment > 8 seconds (up to 20s)
├─ Multi-shot narrative
├─ Complex physics/motion
├─ Extended camera movements
└─ Budget exploration
```

**Default:** VEO 3.1 (better audio, proven workflow)

---

## Comparison Table

| Capability | DALL-E 3 | VEO 3.1 | Sora 2 |
|------------|----------|---------|--------|
| Max Resolution | 1792×1024 | 1080p | 1080p |
| Max Duration | — | 8s | 20s |
| Native Audio | — | ✅ Best | ✅ Good |
| Lip-sync | — | ✅ Best | Good |
| Multi-shot | — | Good | ✅ Best |
| Physics | — | Strong | ✅ Best |
| Ref Images | ❌ No | Up to 3 | ✅ Yes |
| Neg Prompts | ❌ No | ✅ Yes | ❌ No |

---

## I2V Workflow Pipeline

```
DALL-E 3 (1024×1792, HD)
    ↓
[Optional: Resize to exact target]
    ↓
VEO 3.1 / Sora 2 (1080p, 9:16)
    ↓
Final Video
```

### Resolution Matching

| Platform | Input Requirement |
|----------|-------------------|
| VEO 3.1 | 720p+ (auto-resize) |
| Sora 2 | **Exact match** required |

For Sora 2: Resize DALL-E output (1024×1792) to target (720×1280 or 1024×1792).

---

*End of Platform Specs*
