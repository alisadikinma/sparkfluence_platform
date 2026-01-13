# Phase 14: TTS + Video Integration - Implementation Guide

## ✅ Status: PHASE 14 COMPLETED ✅

### Completed Work:
- ✅ **Phase 12**: fal.ai Video Integration (Wan 2.5, Kling 2.5)
- ✅ **Phase 13**: TTS Integration (Chatterbox Turbo)
- ✅ **Cleanup**: Removed VEO 3.1 and Sora 2 models
- ✅ **Simplified**: All video generation now uses fal.ai only
- ✅ **Phase 14**: TTS + Video Integration (COMPLETED)
  - ✅ Updated `submitToFalQueue()` to accept `audioUrl` parameter
  - ✅ Added TTS generation before video in `handleProcessSingle()`
  - ✅ Wan 2.5 receives `audio_url` parameter for native audio
  - ✅ Deployed to production (lgccaexqwmmvuvxbacic)

---

## 🎯 Phase 14 Objective

**Integrate TTS audio with video generation for seamless CREATOR segment voiceovers.**

---

## 📊 Current Architecture

### Video Models (fal.ai only):

| Model | Duration | Audio Support | Use Case |
|-------|----------|---------------|----------|
| **Wan 2.5** ✅ | 5s | **YES** (`audio_url` param) | CREATOR segments with voiceover |
| **Kling 2.5** | 5s, 10s | NO | Silent B-ROLL only |

### TTS Model:

| Model | Voices | Paralinguistic Tags | Voice Cloning |
|-------|--------|---------------------|---------------|
| **Chatterbox Turbo** | 20+ preset | `[laugh]`, `[sigh]`, `[chuckle]`, etc. | ✅ 5-10s audio |

---

## 🔄 Video Generation Flow (CORRECTED)

### **Scenario 1: CREATOR Segment (HOOK, CTA) - 5s with TTS**

```typescript
// ✅ CORRECT FLOW with Wan 2.5
1. User creates script in /script-lab
   → segment.script_text = "Hey guys! Let me show you..."

2. Generate image for segment
   → segment.image_url

3. Generate TTS audio
   → Call: generate-tts({ text: script_text, voice: 'aaron' })
   → Returns: audio_url

4. Generate video WITH audio
   → Call: Wan 2.5 with {
       prompt: video_prompt,
       image_url: segment.image_url,
       audio_url: tts_audio_url  // ✅ Native audio support
     }
   → Returns: video_url (with synced audio)

5. Video is ready with voiceover ✅
```

---

### **Scenario 2: B-ROLL Segment (FORE, BODY, PEAK) - Silent**

```typescript
// B-ROLL segments don't need voiceover
1. Generate image
2. Generate video (silent)
   → Wan 2.5 or Kling 2.5
   → No audio_url parameter
3. Silent video ready
```

---

### **Scenario 3: 10s B-ROLL Segment - Need Audio Overlay**

```typescript
// For 10s B-ROLL that needs background narration
1. Generate TTS for narration
2. Generate video (Kling 2.5, NO audio support)
3. Post-process with FFmpeg
   → Combine video + audio
   → Returns: final_video_url
```

---

## 🛠️ Implementation Tasks

### Task 1: Update `submitToFalQueue()` for Audio Support

**File:** `supabase/functions/generate-videos/index.ts:235-285`

```typescript
async function submitToFalQueue(
  modelSpecs: any,
  videoPrompt: string,
  imageUrl: string,
  duration: number,
  falApiKey: string,
  audioUrl?: string  // ← NEW PARAMETER
): Promise<{ request_id: string; status_url: string }> {
  const requestBody: any = {
    prompt: videoPrompt,
    image_url: imageUrl,
  };

  // Duration handling (Kling requires duration param)
  if (modelSpecs.key === 'kling-2.5') {
    requestBody.duration = String(duration);
  }

  // ✅ ADD AUDIO SUPPORT for Wan 2.5
  if (audioUrl && modelSpecs.key === 'wan-2.5') {
    requestBody.audio_url = audioUrl;
    console.log(`[FAL_SUBMIT] Adding TTS audio: ${audioUrl}`);
  }

  // ... rest of code
}
```

---

### Task 2: Generate TTS Before Video in `handleProcessSingle()`

**Location:** Before calling `submitToFalQueue()` (around line 880)

```typescript
// ========================================================================
// TTS GENERATION (if CREATOR segment with script)
// ========================================================================
let audioUrl: string | undefined;

if (job.script_text && job.script_text.trim().length > 0) {
  // CREATOR segment with dialogue → generate TTS
  const isFalProvider = modelSpecs.provider === 'fal';
  const supportsAudio = modelSpecs.key === 'wan-2.5';

  if (isFalProvider && supportsAudio) {
    console.log(`[PROCESS_SINGLE] Generating TTS for CREATOR segment...`);

    try {
      const ttsResponse = await supabase.functions.invoke('generate-tts', {
        body: {
          text: job.script_text,
          voice: job.voice_preference || 'aaron',  // From user profile
          audio_url: job.voice_clone_url,          // Custom voice if available
          temperature: 0.8,
          model: 'chatterbox-turbo'
        }
      });

      if (ttsResponse.data?.success) {
        audioUrl = ttsResponse.data.data.audio_url;
        console.log(`[PROCESS_SINGLE] ✅ TTS generated: ${audioUrl}`);

        // Store audio URL in job for reference
        await supabase
          .from('video_generation_jobs')
          .update({ audio_url: audioUrl })
          .eq('id', job.id);
      } else {
        console.warn(`[PROCESS_SINGLE] ⚠️ TTS failed, continuing without audio:`, ttsResponse.data?.error);
      }
    } catch (ttsError) {
      console.error(`[PROCESS_SINGLE] ⚠️ TTS error:`, ttsError);
      // Continue without audio rather than failing entire job
    }
  }
}

// ========================================================================
// SUBMIT VIDEO GENERATION with audio (if available)
// ========================================================================
const { request_id, status_url } = await submitToFalQueue(
  modelSpecs,
  videoPrompt,
  job.image_url,
  actualDuration,
  falApiKey,
  audioUrl  // ← Pass TTS audio URL
);
```

---

### Task 3: Add `audio_url` Column to Database

**Migration SQL:**

```sql
-- Add audio_url column to video_generation_jobs
ALTER TABLE video_generation_jobs
ADD COLUMN IF NOT EXISTS audio_url TEXT;

COMMENT ON COLUMN video_generation_jobs.audio_url IS 'TTS audio URL for CREATOR segments';
```

---

### Task 4: Update Model Selection Logic

**Ensure Wan 2.5 is used for CREATOR segments:**

```typescript
// In create_jobs mode, select model based on segment type
function selectVideoModel(segment: any, videoDuration: VideoDuration): string {
  const hasDialogue = segment.script_text && segment.script_text.trim().length > 0;
  const duration = segment.duration_seconds || 5;

  // CREATOR segment with dialogue → MUST use Wan 2.5 for audio support
  if (hasDialogue && duration === 5) {
    return 'wan-2.5';
  }

  // 10s B-ROLL → Use Kling 2.5
  if (duration === 10) {
    return 'kling-2.5';
  }

  // Default: Wan 2.5 (5s, supports audio)
  return 'wan-2.5';
}
```

---

## 🧪 Testing Plan

### Test 1: CREATOR Segment with TTS

```javascript
// test-tts-video-integration.js
const testCreatorSegment = {
  segment_type: 'HOOK',
  script_text: 'Hey guys! [chuckle] Check out this amazing feature!',
  image_url: 'https://...',
  duration_seconds: 5,
  voice_preference: 'aaron'
};

// Expected flow:
// 1. TTS generates audio (~2s)
// 2. Wan 2.5 generates video with audio (~30s)
// 3. Video has synced voiceover ✅
```

### Test 2: Silent B-ROLL

```javascript
const testBRollSegment = {
  segment_type: 'BODY-1',
  script_text: '',  // No dialogue
  image_url: 'https://...',
  duration_seconds: 5
};

// Expected flow:
// 1. No TTS generation (no script)
// 2. Wan 2.5 generates silent video
// 3. Video has no audio ✅
```

### Test 3: Voice Cloning

```javascript
const testVoiceCloning = {
  script_text: 'This is my custom voice!',
  voice_clone_url: 'https://.../user_voice_reference.wav',  // User's recording
  image_url: 'https://...'
};

// Expected flow:
// 1. TTS uses audio_url for voice cloning
// 2. Video has user's voice ✅
```

---

## 📋 Database Schema Update

```sql
-- video_generation_jobs table
CREATE TABLE IF NOT EXISTS video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  segment_id TEXT,
  segment_number INTEGER,
  segment_type TEXT,  -- HOOK, BODY-1, etc.

  -- Image input
  image_url TEXT,

  -- Script & audio (NEW)
  script_text TEXT,           -- Script for TTS
  audio_url TEXT,             -- Generated TTS audio URL
  voice_preference TEXT,      -- 'aaron', 'lucy', etc.
  voice_clone_url TEXT,       -- Custom voice reference

  -- Video generation
  visual_direction TEXT,      -- Video prompt
  duration_seconds INTEGER,
  platform TEXT,              -- 'wan-2.5', 'kling-2.5'
  veo_uuid TEXT,              -- fal.ai request_id
  video_url TEXT,             -- Final video URL

  -- Status tracking
  status INTEGER,             -- 0=pending, 1=processing, 2=completed, 3=failed
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎬 Final Video Assembly (FFmpeg Stage)

**For videos with multiple segments:**

```typescript
// Python backend: combine_videos_with_audio.py
function combineSegments(segments, backgroundMusicUrl) {
  // All segment videos already have their TTS audio baked in (from Wan 2.5)
  // Just need to add background music at low volume

  ffmpeg
    .concat(segments.map(s => s.video_url))
    .addAudio(backgroundMusicUrl, { volume: 0.2 })  // 20% volume for bg music
    .output('final_video.mp4')
    .run();
}
```

**Note:** CREATOR segments already have TTS audio, so FFmpeg only adds background music, not voiceover.

---

## 💰 Cost Breakdown

| Step | Service | Cost |
|------|---------|------|
| TTS Generation | Chatterbox Turbo | $0.05 per request |
| Video Generation | Wan 2.5 (5s) | $0.10 per video |
| Video Generation | Kling 2.5 (10s) | $0.15 per video |
| **Total per CREATOR segment** | | **$0.15** (TTS + Video) |
| **Total per B-ROLL segment** | | **$0.10-0.15** (Video only) |

---

## 🚀 Deployment Checklist

- [x] Phase 12: Wan 2.5 + Kling 2.5 integration
- [x] Phase 13: Chatterbox Turbo TTS
- [x] Remove VEO/Sora models
- [ ] Add `audio_url` column to DB
- [ ] Update `submitToFalQueue()` for audio support
- [ ] Add TTS generation in `handleProcessSingle()`
- [ ] Update model selection logic
- [ ] Test full CREATOR flow (TTS → Video)
- [ ] Test B-ROLL flow (silent video)
- [ ] Deploy to production

---

## 📝 Next Steps (Phase 15+)

- **Phase 15**: Music Generation (Minimax Music v2)
- **Phase 16**: FFmpeg Final Assembly
- **Phase 17**: Frontend UI for audio settings
- **Phase 18**: Batch processing optimization

---

**Last Updated:** January 2026
**Status:** Ready for Implementation
**Estimated Time:** 3-4 hours
