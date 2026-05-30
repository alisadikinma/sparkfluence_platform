# Ad Studio Knowledge Files - Implementation Guide

## Context

**Sparkfluence** adalah AI video generator platform. Saat ini ada **Creator Lab** (untuk viral content/personal branding). Kita sedang menambahkan **Ad Studio** — fitur baru untuk generate marketing/advertising video scripts.

**Perbedaan utama:**
| Aspect | Creator Lab | Ad Studio |
|--------|-------------|-----------|
| Purpose | Grow followers, edukasi | Lead gen, sales, conversion |
| Metric | Watch time, retention | CTR, conversion rate, ROAS |
| Audience | Gen-Z focused | All demographics (parameterized) |
| Tone | Casual, viral | Varies by target market |

---

## Task: Create Knowledge Files

Buat knowledge files di folder:
```
D:\Projects\sparkfluence_platform\supabase\functions\_shared\knowledge\ad-studio\
```

### File Structure

| File | Content |
|------|---------|
| `01-advertising-psychology.ts` | Cialdini's 6 principles, cognitive biases, emotional vs rational appeals |
| `02-video-ad-frameworks.ts` | AIDA, PAS, BAB, Hook-Story-Offer dengan timing parameters |
| `03-platform-specs.ts` | Facebook, TikTok, Instagram, LinkedIn, YouTube specs & best practices |
| `04-audience-psychology-matrix.ts` | Gen-Z, Millennial, Gen-X, Boomer parameters |
| `05-b2b-vs-b2c-patterns.ts` | Decision cycles, messaging differences, CTA strategies |
| `06-cta-conversion-optimization.ts` | CTA formulas, urgency tactics, placement strategies |
| `07-script-templates.ts` | Parameterized templates with variable lookup tables |

---

## CRITICAL: File Format

**Edge Functions CANNOT import .md files.** Gunakan `.ts` dengan exported template literal:

```typescript
/**
 * [Title]
 * For Deno Edge Function compatibility
 * Last updated: 2026-01-20
 */

export default `
# Content Here

## Section 1
...

## Section 2
...
`;
```

**Naming convention:** `XX-kebab-case-name.ts`

---

## Content Requirements

### 1. Advertising Psychology (`01-advertising-psychology.ts`)

Include:
- Cialdini's 6 principles dengan:
  - Definition
  - Script trigger phrases
  - Best use cases
  - When to avoid
- Cognitive biases: loss aversion, anchoring, framing, bandwagon
- Emotional vs Rational appeal matrix by context
- Attention economics: hook windows by generation

### 2. Video Ad Frameworks (`02-video-ad-frameworks.ts`)

Include:
- AIDA, PAS, BAB, Hook-Story-Offer frameworks
- Timing breakdown untuk 15s, 30s, 60s formats
- Framework selection logic (decision tree)
- Optimal video lengths by platform × objective

### 3. Platform Specs (`03-platform-specs.ts`)

For each platform (Facebook, TikTok, Instagram Reels, LinkedIn, YouTube):
- Technical specs (resolution, aspect ratio, duration)
- Algorithm preferences
- Content best practices
- Sound strategy (muted vs sound-on)
- Hook requirements

### 4. Audience Psychology Matrix (`04-audience-psychology-matrix.ts`)

For each generation (Gen-Z, Millennial, Gen-X, Boomer):
- Attention parameters (hook window, cuts/minute, shot length)
- Trust drivers
- Production style preference
- Humor calibration
- Script language guidelines
- Avoid list

Include comparison table for quick lookup.

### 5. B2B vs B2C Patterns (`05-b2b-vs-b2c-patterns.ts`)

Include:
- Decision cycle differences
- Appeal calibration (emotional vs rational ratio)
- Proof type preferences
- CTA progression by funnel stage
- Messaging framework differences with examples

### 6. CTA & Conversion (`06-cta-conversion-optimization.ts`)

Include:
- High-converting CTA formulas
- CTA templates by objective (lead gen, purchase, trial, signup)
- Urgency & scarcity tactics (ethical application)
- CTA placement strategy by video length
- Conversion statistics for reference

### 7. Script Templates (`07-script-templates.ts`)

Include:
- Master template structure with variables
- Variable definitions
- Pacing configuration by age
- Hook formula selection matrix
- Production style by context
- Parameter lookup tables (framework selection, length calculator, trust elements)

---

## Reference Data

Attached: `ad-studio-research-comprehensive.md` — hasil deep research yang perlu di-distill ke knowledge files.

---

## Validation Checklist

After creating files:
- [ ] All files use `.ts` extension with `export default \`...\``
- [ ] No raw `.md` files in the folder
- [ ] Content is actionable (not just theory)
- [ ] Includes lookup tables for parameterized generation
- [ ] Examples provided where helpful
- [ ] Indonesian context considered (for language files later)

---

## Example Output Structure

```
supabase/functions/_shared/knowledge/ad-studio/
├── 01-advertising-psychology.ts
├── 02-video-ad-frameworks.ts
├── 03-platform-specs.ts
├── 04-audience-psychology-matrix.ts
├── 05-b2b-vs-b2c-patterns.ts
├── 06-cta-conversion-optimization.ts
└── 07-script-templates.ts
```

Each file ~300-500 lines, focused and query-able by the LLM during script generation.
