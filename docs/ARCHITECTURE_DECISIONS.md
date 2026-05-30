# Architecture Decision Records (ADR)

## Overview
This document records important architectural decisions made for Sparkfluence v2.0, including rationale and trade-offs.

---

## ADR-001: Video Generation Model Selection (Jan 2026)

### Context
Need to generate videos with voiceover for CREATOR and B-ROLL segments. Multiple AI video providers available with different capabilities and pricing.

### Decision
**Use fal.ai (Wan 2.5 + Kling 2.5) instead of VEO 3.1 or Sora 2**

### Rationale

#### Cost Comparison:

| Provider | Native Voice | Cost per Video | Audio Quality |
|----------|--------------|----------------|---------------|
| **VEO 3.1** | ✅ Yes (from prompt) | $0.20+ | Excellent lip-sync |
| **Sora 2** | ✅ Yes (from prompt) | $0.20+ | Good voice |
| **Wan 2.5 + TTS** | ❌ No (external audio) | $0.15 | Good (via Chatterbox) |
| **Kling 2.5** | ❌ No | $0.15 | Silent only |

#### Cost Breakdown (per segment):
```
VEO/Sora Approach:
- Video with native voice: $0.20
- Total: $0.20 per CREATOR segment

Wan 2.5 Approach:
- TTS (Chatterbox Turbo): $0.05
- Video with audio_url: $0.10
- Total: $0.15 per CREATOR segment

Savings: $0.05 per segment (25% cheaper)
```

#### Example: 60s Video (8 segments)
```
VEO/Sora Cost:
- 2 CREATOR: 2 × $0.20 = $0.40
- 6 B-ROLL: 6 × $0.20 = $1.20
- Total: $1.60

Wan 2.5 + TTS Cost:
- 2 CREATOR (TTS + video): 2 × $0.15 = $0.30
- 3 B-ROLL with narration: 3 × $0.15 = $0.45
- 3 B-ROLL silent: 3 × $0.10 = $0.30
- Total: $1.05

Savings: $0.55 per video (34% cheaper)
```

### Trade-offs

#### Advantages (Wan 2.5 + TTS):
- ✅ **Cost-effective**: 25-34% cheaper per video
- ✅ **Voice control**: Independent TTS allows voice cloning, temperature control, paralinguistic tags
- ✅ **Flexibility**: Can regenerate voice without regenerating video
- ✅ **Quality TTS**: Chatterbox Turbo has 20+ voices with emotional expression
- ✅ **Fast generation**: TTS completes in ~2s before video starts

#### Disadvantages:
- ❌ **Lip-sync quality**: External audio may not sync perfectly with mouth movement
- ❌ **Extra API call**: Requires TTS generation before video (adds ~2s latency)
- ❌ **Wan 2.5 limitation**: Only supports 5s videos (not 10s)
- ⚠️ **Kling 2.5 limitation**: No audio support (silent B-ROLL only for 10s)

### Mitigation Strategies

**For lip-sync concerns:**
1. Use Wan 2.5's image-to-video which maintains facial consistency
2. Keep CREATOR segments short (5s) for minimal sync issues
3. Rely on viewer tolerance for slight sync offset in short-form content

**For 10s segment needs:**
1. Use Kling 2.5 for silent B-ROLL (no voice needed)
2. Keep narrated segments to 5s (Wan 2.5 with audio)
3. Consider splitting 10s segments into 2×5s if voice needed

### Status
**IMPLEMENTED** ✅

- VEO 3.1 and Sora 2 removed from codebase (Jan 2026)
- Wan 2.5 + TTS integration complete
- Production deployment: lgccaexqwmmvuvxbacic

### Future Considerations

**Upgrade Path (if budget allows):**
- VEO 3.1 for premium tier users (better lip-sync)
- Keep Wan 2.5 + TTS as default tier (cost-effective)

**Potential Future Models:**
- Wan 3.0 (if released with better audio support)
- Kling 3.0 (if adds audio support for 10s)
- VEO 4.0 (if pricing becomes competitive)

---

## ADR-002: TTS Provider Selection (Jan 2026)

### Context
Need text-to-speech for voiceover generation with voice cloning capability.

### Decision
**Use Chatterbox Turbo (fal.ai) for all TTS needs**

### Rationale

#### Provider Comparison:

| Provider | Voices | Voice Cloning | Cost | Speed | Tags |
|----------|--------|---------------|------|-------|------|
| **Chatterbox Turbo** | 20+ | ✅ 5-10s | $0.05 | ~10x | ✅ [laugh], [sigh] |
| **ElevenLabs** | 100+ | ✅ 3min | $0.18 | ~5x | ❌ |
| **OpenAI TTS** | 6 | ❌ No | $0.015 | ~8x | ❌ |
| **Google TTS** | 50+ | ❌ No | $0.016 | ~6x | ❌ |

#### Key Factors:
1. **Cost-effective**: $0.05 per request (2-3x cheaper than ElevenLabs)
2. **Fast voice cloning**: Only needs 5-10s audio (vs 3min for ElevenLabs)
3. **Paralinguistic tags**: Emotional expression ([laugh], [chuckle], [sigh])
4. **Same provider**: Unified fal.ai billing with video models
5. **Speed**: ~10x real-time (10s audio in 1s)

### Trade-offs

#### Advantages:
- ✅ Quick voice cloning (user only records 5-10s)
- ✅ Emotional expression via tags
- ✅ Temperature control for variety
- ✅ Seed support for reproducibility

#### Disadvantages:
- ❌ English only (no multilingual)
- ❌ Fewer preset voices than ElevenLabs
- ⚠️ Quality slightly below ElevenLabs premium

### Status
**IMPLEMENTED** ✅

- Chatterbox Turbo integrated (Phase 13)
- All tests passed (4/4 voices)
- Production: generate-tts Edge Function

---

## ADR-003: Auto-Duration Logic (Jan 2026)

### Context
Videos have different durations (30s, 60s, 90s) with varying segment counts. Need automatic duration assignment.

### Decision
**Implement rule-based auto-duration calculation**

### Rules:
```typescript
// Fixed duration segments (always 5s)
HOOK, FORE, CTA, LOOP-END → 5s

// Variable duration segments
BODY-X, PEAK:
  - 30s video → 5s (tight pacing)
  - 60s/90s video → 10s (standard pacing)
```

### Rationale

#### Advantages:
- ✅ **User-friendly**: No manual duration selection
- ✅ **Consistent**: Predictable total duration
- ✅ **Optimized**: Matches platform best practices
- ✅ **Flexible**: Adapts to video length

#### Example Calculations:
```
30s video: HOOK(5s) + FORE(5s) + 4×BODY(5s) + PEAK(5s) + CTA(5s) = 35s → trim to 30s
60s video: HOOK(5s) + FORE(5s) + 3×BODY(10s) + PEAK(10s) + CTA(5s) + LOOP(5s) = 60s ✅
90s video: HOOK(5s) + FORE(5s) + 5×BODY(10s) + PEAK(10s) + CTA(5s) + LOOP(5s) = 80s → add BODY
```

### Status
**IMPLEMENTED** ✅

- Logic in `src/lib/segmentDuration.ts`
- 23/23 tests passed
- Integrated with ImageGeneration and VideoGeneration

---

## ADR-004: Image Generation Model Strategy (Jan 2026)

### Context
Need different image models for CREATOR (with face) vs B-ROLL (environments).

### Decision
**Use Nano Banana Pro for CREATOR, Wan 2.6 T2I for B-ROLL**

### Rationale

| Use Case | Model | Why |
|----------|-------|-----|
| **CREATOR** | Nano Banana Pro Edit | Face consistency via `image_urls[]` array (up to 14 refs) |
| **B-ROLL** | Wan 2.6 T2I | Cinematic environments, negative prompt support |

#### Key Features:
1. **Nano Banana**: Reference image support → consistent creator face
2. **Wan 2.6**: Negative prompt → exclude humans from B-ROLL
3. **Fallback chain**: Both models available if primary fails

### Status
**IMPLEMENTED** ✅

- Model selection based on shot_type
- Avatar reference integration
- Production ready

---

## ADR-005: Database Schema for Multi-Image Gallery (Jan 2026)

### Context
Users need to generate multiple images per segment and select the best one.

### Decision
**Remove UNIQUE constraint on (session_id, segment_number)**

### Schema:
```sql
CREATE TABLE image_generation_jobs (
  id UUID PRIMARY KEY,
  session_id TEXT,
  segment_number INTEGER,
  generation_number INTEGER,  -- 1, 2, 3, ... (tracks regenerations)
  is_selected BOOLEAN,         -- Only 1 per segment can be true
  source_type TEXT,            -- 'generated' | 'stock' | 'uploaded'
  image_url TEXT,
  -- ... other fields
);

-- NO UNIQUE constraint → allows multiple images per segment
```

### Rationale
- ✅ Multiple regenerations per segment
- ✅ Stock image additions
- ✅ User uploads
- ✅ Selection mechanism (is_selected flag)

### Status
**IMPLEMENTED** ✅

- Migration completed (Phase 1)
- Multi-image gallery UI (Phase 5)
- Stock image search integrated

---

## Summary Table: Cost Optimization Decisions

| Decision | Approach | Cost Savings | Trade-off |
|----------|----------|--------------|-----------|
| **Video Models** | Wan 2.5 + TTS vs VEO | 25-34% | Slight lip-sync quality |
| **TTS Provider** | Chatterbox vs ElevenLabs | 72% | English only |
| **Image Models** | fal.ai vs DALL-E 3 | 80% | Quality gap acceptable |
| **Auto-Duration** | Rule-based vs manual | User time | Less flexibility |

**Overall Strategy: Cost-Effective Quality**
- Target cost: ~$1.00 per 60s video
- Quality tier: "Very Good" (not "Premium")
- User segment: Content creators on budget

---

**Last Updated:** January 2026
**Version:** 1.0
