> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Ensure all generated videos from HOOK to CTA have consistent voice, correct lip-sync behavior, and speak the same language as the script text. Three enhancements:

1. **Voice Analysis on Upload** — When user uploads/records voice in Profile > Voice tab, analyze audio via LLM to extract voice anchor properties (gender, age, tone, accent, pace) and store in `voice_prompts` table.
2. **Explicit Language Enforcement** — Add top-level `LANGUAGE:` block to every video prompt so VEO 3.1 never switches language mid-video.
3. **Strengthen Voice Anchor + Lip-sync Rules** — Move voice anchor to prompt top, strengthen CREATOR lip-sync and B-ROLL off-screen narration instructions.

## Architecture Context

From CLAUDE.md:
- **Voice storage:** `voice-references` bucket (Supabase Storage), `user_profiles.voice_reference_url`
- **Voice prompts:** `voice_prompts` table (gender, voice_age, voice_accent, voice_tone, voice_pace, voice_prompt_block, is_profile_avatar)
- **Existing edge functions:** `analyze-avatar` (image → voice character), `generate-tts` (Chatterbox Turbo), `generate-videos` (multi-model orchestrator)
- **Audio directives:** `supabase/functions/_shared/prompts/audioDirective.ts` — `getCreatorAudioDirective()`, `getBRollAudioDirective()`
- **Video prompt builder:** `buildCinematicVideoPrompt()` in `generate-videos/index.ts`
- **Grok prompt builders:** `buildGrokCreatorPrompt()`, `buildGrokBrollPrompt()` in `cinematicVideoKnowledge.ts`
- **VoiceRecorder component:** `src/components/features/VoiceRecorder.tsx` — saves audio + calls `onVoiceSaved(url, duration)`
- **Profile Voice tab:** `src/screens/Settings/Profile.tsx` (lines 1264-1289)
- **LLM calls:** Use `callLLM()` from `apiKeyRotation.ts` (OpenRouter primary → Gemini fallback)
- **Design system:** Warm charcoal (#0B0E14) + emerald (#10B981), Shadcn UI components

## Platform Prompt Architecture (CRITICAL CONTEXT)

VEO 3.1 and Grok 3 have fundamentally different prompt architectures:

| Aspect | VEO 3.1 | Grok 3 |
|--------|---------|--------|
| Prompt size | 200-400 words | 50-100 words (max 150) |
| Voice anchor | ✅ Full block with description | ❌ Not supported (word limit) |
| Face anchor | ✅ Full block | ❌ Not supported |
| Language enforcement | ⚠️ Implicit only (to be fixed) | ❌ Not used at all (to be fixed) |
| Lip-sync | Via audio directive section | Via `Speech: [text]` syntax |
| Negative language | ✅ Allowed ("do NOT", "avoid") | ❌ Positive only (hard rule) |
| Prompt structure | Sections with headers/blocks | 4-5 compact sentences |

**Key Grok constraints:**
- First 20-30 words = primary action (front-loaded)
- `Speech:` syntax for creator dialogue (word limits: 10/6s, 15/10s, 25/15s)
- B-ROLL has no `Speech:` → already no lip-sync
- Cannot add long voice anchor blocks — must use compact inline approach
- `buildGrokCreatorPrompt()` and `buildGrokBrollPrompt()` in `cinematicVideoKnowledge.ts` currently ignore `language` and `voiceCharacter` params

## Tech Stack

- Edge Functions: Deno + TypeScript
- Frontend: React 18 + TypeScript + Tailwind + Shadcn UI
- LLM: `callLLM()` with `geminiFirst: true` (fast/cheap voice analysis)
- DB: Supabase PostgreSQL (voice_prompts table, user_profiles table)
- Storage: Supabase Storage (`voice-references` bucket)

---

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Voice audio URL | `user_profiles.voice_reference_url` | Supabase query | Yes | Read after upload |
| Voice analysis results | `voice_prompts` table | Supabase upsert | Yes | Upsert with `is_profile_avatar=true` |
| LLM audio analysis | Gemini multimodal | `callLLM()` with audio | Yes | Use `geminiFirst: true` |
| Voice anchor in VEO prompt | `voice_prompts.voice_prompt_block` | DB query in generate-videos | Yes | Already fetched, enhance prompt placement |
| Language detection | `detectScriptLanguage()` | Function in generate-videos | Yes | Already exists, pass to audio directives |
| Creator audio directive (VEO) | `getCreatorAudioDirective()` | audioDirective.ts | Yes | Add `language` param |
| B-Roll audio directive (VEO) | `getBRollAudioDirective()` | audioDirective.ts | Yes | Add `language` param |
| Grok creator prompt | `buildGrokCreatorPrompt()` | cinematicVideoKnowledge.ts | Yes | Add language to `Speech:` syntax |
| Grok B-Roll prompt | `buildGrokBrollPrompt()` | cinematicVideoKnowledge.ts | Yes | No change needed (no speech) |
| Profile Voice UI | VoiceRecorder component | `onVoiceSaved` callback | Yes | Add analyze-voice call after save |
| Voice analysis display | voice_prompts query | Supabase select | Yes | Show analyzed properties in UI |

---

## Phase A: Add Language Param to Audio Directives

**Estimated time:** 10 minutes

**Files:**
- Modify: `supabase/functions/_shared/prompts/audioDirective.ts`

**Steps:**

1. In `getCreatorAudioDirective()` (line ~417), the `language` param already exists in the signature but is NOT used in the output. Add explicit language enforcement to the returned string:
   ```
   ⚠️ LANGUAGE: ${languageLabel}
   ALL dialogue MUST be spoken in ${languageLabel}. Do NOT switch languages.
   ```

2. In `getBRollAudioDirective()` (line ~469), add `language: string` as the FIRST parameter. Add to the voiceover block:
   ```
   ⚠️ LANGUAGE: ${languageLabel}
   ALL narration MUST be spoken in ${languageLabel}. Do NOT switch languages.
   ```

3. Add a helper `getLanguageLabel(language: string): string` that maps:
   - `'indonesian'` → `'Indonesian (Bahasa Indonesia)'`
   - `'hindi'` → `'Hindi (Hinglish)'`
   - `'english'` → `'English'`
   - `'spanish'` → `'Spanish (Latin American)'`

4. Strengthen lip-sync instructions in `getCreatorAudioDirective()`:
   ```
   Lip-sync: REQUIRED — creator's mouth MUST move matching every word of the dialogue.
   ```

5. Strengthen off-screen narration in `getBRollAudioDirective()`:
   ```
   ZERO visible human speech. Voice is 100% off-camera narration.
   If any person appears on screen, their mouth MUST remain CLOSED.
   ```

**Verification:**
- [ ] `getCreatorAudioDirective()` output includes `LANGUAGE:` line
- [ ] `getBRollAudioDirective()` accepts `language` param and includes `LANGUAGE:` line
- [ ] Lip-sync instruction is explicit for CREATOR
- [ ] Off-screen narration instruction is explicit for B-ROLL
- [ ] No TypeScript errors (`tsc --noEmit` on audioDirective.ts)

---

## Phase B: VEO 3.1 — Add Language Block + Strengthen Voice Anchor

**Estimated time:** 15 minutes

**Files:**
- Modify: `supabase/functions/generate-videos/index.ts`

**Context:** VEO 3.1 prompts are 200-400 words with section headers. We can add full LANGUAGE and VOICE ANCHOR blocks.

**Steps:**

1. In `buildCinematicVideoPrompt()`, AFTER the Grok early-return (line ~2664), add a top-level LANGUAGE block as the FIRST section of the VEO/Sora prompt (before voice anchor, before scene). This block is dynamic based on `detectedLanguage`:
   ```
   ═══════════════════════════════════════
   LANGUAGE: ${languageLabel}
   ALL speech in this video MUST be in ${languageName}.
   Do NOT switch to other languages even if technical terms appear.
   Pronounce technical terms with ${languageName} phonetics.
   ═══════════════════════════════════════
   ```
   Use `getLanguageLabel(detectedLanguage)` from audioDirective.ts. The example shows Indonesian but the output is dynamic per language (English, Hindi, Spanish, etc.).

2. Move VOICE ANCHOR block to immediately after LANGUAGE block (currently it's buried mid-prompt). Strengthen wording:
   ```
   ═══════════════════════════════════════
   VOICE ANCHOR (MANDATORY — identical voice for ALL segments)
   ${voiceAnchor}

   CRITICAL: This EXACT voice must sound IDENTICAL to every other
   segment in this video series. Same pitch, same accent, same age,
   same speaking style. Do NOT vary the voice between segments.
   ═══════════════════════════════════════
   ```

3. Pass `detectedLanguage` to `getCreatorAudioDirective()` call (it's already in the signature but verify it's passed).

4. Pass `detectedLanguage` to `getBRollAudioDirective()` call (new param from Phase A):
   ```typescript
   // Before:
   getBRollAudioDirective(category, emotion, hasVoiceover, scriptText, brollVoiceChar)
   // After:
   getBRollAudioDirective(detectedLanguage, category, emotion, hasVoiceover, scriptText, brollVoiceChar)
   ```

5. Update all other call sites of `getBRollAudioDirective()` in the file (search for all occurrences).

**Verification:**
- [ ] Every VEO/Sora video prompt starts with `LANGUAGE:` block (dynamic, not hardcoded)
- [ ] Voice anchor is the SECOND block (right after language)
- [ ] `detectedLanguage` is passed to both `getCreatorAudioDirective()` and `getBRollAudioDirective()`
- [ ] Grok path (early return) is NOT affected by these changes
- [ ] No TypeScript errors
- [ ] Prompt structure: LANGUAGE → VOICE ANCHOR → FACE ANCHOR → SCENE → CAMERA → AUDIO

---

## Phase B2: Grok 3 — Add Language to Speech Syntax

**Estimated time:** 10 minutes

**Files:**
- Modify: `supabase/functions/_shared/prompts/cinematicVideoKnowledge.ts`

**Context:** Grok prompts are 50-100 words max, positive language only, motion-first. We CANNOT add full blocks. Instead, use compact inline language tag in `Speech:` syntax.

**Steps:**

1. In `buildGrokCreatorPrompt()`, the `language` param is already in `GrokPromptParams` but unused. Use it to tag the `Speech:` line:
   ```typescript
   // Before:
   speechSection = `Speech: ${truncated}.`;
   // After:
   const langTag = getGrokLanguageTag(language);
   speechSection = `Speech (${langTag}): ${truncated}.`;
   ```
   This produces: `Speech (Indonesian): Ini adalah contoh script.` — costs only 1 extra word.

2. Add helper `getGrokLanguageTag(language: string): string` in cinematicVideoKnowledge.ts:
   ```typescript
   function getGrokLanguageTag(language?: string): string {
     const tags: Record<string, string> = {
       'indonesian': 'Indonesian',
       'hindi': 'Hindi',
       'english': 'English',
       'spanish': 'Spanish',
     };
     return tags[language?.toLowerCase() ?? ''] ?? 'English';
   }
   ```

3. `buildGrokBrollPrompt()` — **NO CHANGES NEEDED**. B-Roll has no `Speech:` syntax, so there is no dialogue and no lip-sync. Language enforcement is not applicable for motion-only prompts.

4. Voice anchor for Grok — **NOT FEASIBLE** within 50-100 word limit. Grok voice consistency relies on the model's internal consistency, not prompt instructions. Document this as a known limitation.

**Verification:**
- [ ] `buildGrokCreatorPrompt()` outputs `Speech (Indonesian): ...` format
- [ ] `buildGrokBrollPrompt()` is unchanged (no speech = no language needed)
- [ ] `getGrokLanguageTag()` handles all 4 languages + fallback
- [ ] Total Grok prompt word count stays under 150 words
- [ ] No TypeScript errors
- [ ] Known limitation documented: Grok voice anchor not supported (word limit constraint)

---

## Phase C: Create `analyze-voice` Edge Function

**Estimated time:** 15 minutes

**Files:**
- Create: `supabase/functions/analyze-voice/index.ts`

**Steps:**

1. Scaffold edge function with standard CORS headers + OPTIONS handler + auth check (same pattern as other edge functions).

2. Accept POST body:
   ```typescript
   {
     voice_url: string;    // Public URL from voice-references bucket
     language?: string;     // Optional hint (from user profile settings)
   }
   ```

3. Fetch the audio file from `voice_url` as base64 or blob.

4. Call `callLLM()` with `geminiFirst: true` (Gemini supports audio input). Prompt:
   ```
   Analyze this voice recording and return ONLY a JSON object (no markdown):
   {
     "gender": "male" or "female",
     "age_range": "20-25" or "25-30" or "30-35" or "35-40",
     "tone": descriptive tone (e.g. "warm and friendly", "energetic and enthusiastic"),
     "accent": specific accent (e.g. "Indonesian Jakarta urban", "Hindi Hinglish"),
     "pace": speaking pace (e.g. "medium-fast, 140-160 WPM"),
     "language": detected language ("indonesian", "english", "hindi", "spanish"),
     "distinguishing_features": notable voice qualities (e.g. "slightly raspy", "bright and clear")
   }
   ```

5. Parse JSON response. Build `voice_prompt_block` using `buildVoicePromptBlock()` pattern from `audioDirective.ts` (or inline equivalent).

6. Upsert to `voice_prompts` table:
   ```typescript
   await supabase.from('voice_prompts').upsert({
     user_id,
     is_profile_avatar: true,
     avatar_id: null,
     session_id: null,
     language: analysis.language,
     gender: analysis.gender,
     voice_description: `${analysis.gender} voice, ${analysis.age_range}, ${analysis.tone}, ${analysis.accent}. ${analysis.distinguishing_features}`,
     voice_age: analysis.age_range,
     voice_accent: analysis.accent,
     voice_tone: analysis.tone,
     voice_pace: analysis.pace,
     voice_prompt_block: builtPromptBlock,
   }, {
     onConflict: 'user_id',  // Uses idx_voice_prompts_profile unique index
     ignoreDuplicates: false,
   })
   ```

7. Return response:
   ```typescript
   { success: true, data: { gender, age_range, tone, accent, pace, language, distinguishing_features } }
   ```

**Verification:**
- [ ] Edge function handles OPTIONS + POST
- [ ] Auth check extracts user_id from JWT
- [ ] Uses `callLLM()` from apiKeyRotation.ts (not raw fetch)
- [ ] Parses LLM JSON response with error handling
- [ ] Upserts to `voice_prompts` with `is_profile_avatar: true`
- [ ] Returns analyzed properties in response
- [ ] No hardcoded API keys (uses pool rotation)

---

## Phase D: Frontend — Call analyze-voice After Upload + Show Results

**Estimated time:** 15 minutes

**Files:**
- Modify: `src/screens/Settings/Profile.tsx` (Voice tab section)
- Modify: `src/components/features/VoiceRecorder.tsx` (optional — if callback needs enhancement)

**Steps:**

1. In Profile.tsx Voice tab, after `onVoiceSaved(url, duration)` callback fires, call the `analyze-voice` edge function:
   ```typescript
   const analyzeVoice = async (voiceUrl: string) => {
     setAnalyzing(true);
     const { data, error } = await supabase.functions.invoke('analyze-voice', {
       body: { voice_url: voiceUrl, language: profile?.language }
     });
     if (data?.success) {
       setVoiceAnalysis(data.data);
     }
     setAnalyzing(false);
   };
   ```

2. Add state for analysis results:
   ```typescript
   const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
   const [analyzing, setAnalyzing] = useState(false);
   ```

3. On mount, fetch existing voice analysis from `voice_prompts` table:
   ```typescript
   const { data } = await supabase
     .from('voice_prompts')
     .select('gender, voice_age, voice_accent, voice_tone, voice_pace, voice_description')
     .eq('user_id', userId)
     .eq('is_profile_avatar', true)
     .single();
   ```

4. Display voice analysis results below the VoiceRecorder as badges/pills:
   ```
   ┌──────────────────────────────────────────────┐
   │  🎙️ Voice Anchor (analyzed)                  │
   │                                              │
   │  [Female]  [23-28yo]  [Jakarta Indonesian]   │
   │  [Warm & Friendly]  [Medium-fast pace]       │
   │                                              │
   │  "Bright and clear voice with casual energy" │
   └──────────────────────────────────────────────┘
   ```
   Use design system: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` for badges.

5. Show loading state during analysis: spinner + "Analyzing voice characteristics..."

6. Add "Re-analyze" button in case user wants to re-run analysis after re-recording.

**Verification:**
- [ ] After upload/record, `analyze-voice` is called automatically
- [ ] Analysis results display as badges below recorder
- [ ] Existing analysis loads on mount (no re-analysis needed)
- [ ] Loading state shown during analysis
- [ ] Re-analyze button works
- [ ] Design follows Sparkfluence system (emerald badges on charcoal)
- [ ] No TypeScript errors

---

## Phase E: Integration Test — End-to-End Voice Consistency

**Estimated time:** 10 minutes

**Steps:**

1. Verify the full flow manually:
   - Upload voice in Profile > Voice
   - Check `voice_prompts` table has `is_profile_avatar=true` row with analyzed properties
   - Go to VideoStep, click Generate All
   - Check the generated prompts in `video_generation_jobs.prompt` column
   - Verify each prompt has:
     - `LANGUAGE:` block at top
     - `VOICE ANCHOR` block with profile voice properties
     - CREATOR segments: lip-sync instruction
     - B-ROLL segments: off-screen narration instruction

2. Check `generate-videos` correctly fetches profile voice anchor:
   - In `handleCreateJobs()`, when `avatar_selection === 'use_profile'`, it queries `voice_prompts` where `is_profile_avatar=true`
   - This should now return the LLM-analyzed voice properties instead of auto-generated ones

3. Verify language consistency: if script is in Indonesian, ALL segment prompts should have `LANGUAGE: Indonesian`.

**Verification:**
- [ ] Voice analysis stored in `voice_prompts` table
- [ ] Video prompts contain `LANGUAGE:` block
- [ ] Video prompts contain analyzed `VOICE ANCHOR` block
- [ ] CREATOR segments have lip-sync instruction
- [ ] B-ROLL segments have off-screen narration instruction
- [ ] All segments use same voice anchor properties

---

## Execution Order

```
Phase A (audio directives) → Phase B (VEO prompts) → Phase B2 (Grok prompts) → sequential, B depends on A
Phase C (analyze-voice edge fn) → Phase D (frontend) → sequential, D depends on C
Track 1 (A→B→B2) and Track 2 (C→D) are INDEPENDENT → can run in parallel
Phase E → after all phases complete
```

## Parallel Execution Opportunity

```
Track 1: Phase A → Phase B → Phase B2  (prompt fixes: VEO + Grok)
Track 2: Phase C → Phase D              (voice analysis)
              ↓          ↓
              Phase E (integration test)
```

## Known Limitations

| Platform | Voice Anchor | Language | Lip-sync Control |
|----------|-------------|----------|-----------------|
| VEO 3.1 | ✅ Full block in prompt | ✅ Explicit LANGUAGE block | ✅ Audio directive section |
| Grok 3 | ❌ Not feasible (50-100 word limit) | ✅ Inline `Speech (lang):` tag | ✅ No speech in B-Roll = no lip-sync |
| Sora 2 | ✅ Same as VEO (shares prompt path) | ✅ Same as VEO | ✅ Same as VEO |
| Wan 2.5 | ✅ Same as VEO (shares prompt path) | ✅ Same as VEO | ✅ Same as VEO |
