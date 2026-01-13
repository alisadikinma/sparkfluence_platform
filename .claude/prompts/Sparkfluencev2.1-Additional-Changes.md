# VEO 3.1 Migration Plan - Additional Updates

## Overview

Tambahan perubahan untuk Sparkfluence v2.1 Migration Plan berdasarkan request:

1. **Header Video Generation** - Update model selector ke VEO 3.1 Fast / VEO 3.1 HD
2. **Remove Audio Recording** - Hapus form recording di Onboarding & Profile
3. **Remove TTS Flow** - Hapus integrasi TTS dari generate-videos

---

## Phase A: Frontend - Video Model Selector Update

### A.1 Update VideoGeneration.tsx

**File**: `src/screens/VideoGeneration/VideoGeneration.tsx`

**Changes**:

1. **Update VideoSettings interface (Line 42)**:
```typescript
// BEFORE
model?: 'auto' | 'veo31' | 'sora2'; // auto = VEO 3.1 (default)

// AFTER
model?: 'auto' | 'veo-3.1-hd' | 'veo-3.1-fast'; // auto = VEO 3.1 HD (default)
```

2. **Update segmentModelOverrides state type (Line 233)**:
```typescript
// BEFORE
const [segmentModelOverrides, setSegmentModelOverrides] = useState<Record<string, 'veo31' | 'sora2'>>({});

// AFTER
const [segmentModelOverrides, setSegmentModelOverrides] = useState<Record<string, 'veo-3.1-hd' | 'veo-3.1-fast'>>({});
```

3. **Update getEffectiveModel() helper (Line 1514)**:
```typescript
// BEFORE
const getEffectiveModel = (segmentId: string): 'veo31' | 'sora2' => {
  if (segmentModelOverrides[segmentId]) {
    return segmentModelOverrides[segmentId];
  }
  if (videoSettings?.model === 'sora2') return 'sora2';
  return 'veo31';
};

// AFTER
const getEffectiveModel = (segmentId: string): 'veo-3.1-hd' | 'veo-3.1-fast' => {
  if (segmentModelOverrides[segmentId]) {
    return segmentModelOverrides[segmentId];
  }
  if (videoSettings?.model === 'veo-3.1-fast') return 'veo-3.1-fast';
  return 'veo-3.1-hd'; // Default to HD
};
```

4. **Update getModelDisplayName() helper (Line 1526)**:
```typescript
// BEFORE
const getModelDisplayName = (model: 'veo31' | 'sora2'): string => {
  return model === 'sora2' ? 'Sora 2.0' : 'VEO 3.1';
};

// AFTER
const getModelDisplayName = (model: 'veo-3.1-hd' | 'veo-3.1-fast'): string => {
  return model === 'veo-3.1-fast' ? 'VEO 3.1 Fast' : 'VEO 3.1 HD';
};
```

5. **Update model selector dropdown onChange handler (Line 1901)**:
```typescript
// BEFORE
const newModel = e.target.value as 'veo31' | 'sora2';

// AFTER
const newModel = e.target.value as 'veo-3.1-hd' | 'veo-3.1-fast';
```

6. **Update dropdown options (Lines 1909-1910)**:
```typescript
// BEFORE
<option value="veo31">VEO 3.1</option>
<option value="sora2">Sora 2.0</option>

// AFTER
<option value="veo-3.1-hd">VEO 3.1 HD ($0.50)</option>
<option value="veo-3.1-fast">VEO 3.1 Fast ($0.19)</option>
```

---

## Phase B: Remove Audio Recording from Onboarding & Profile

### B.1 Update Onboarding.tsx

**File**: `src/screens/Onboarding/Onboarding.tsx`

**Changes**:

1. **Remove VoiceRecorder import (Line 11)**:
```typescript
// DELETE
import { VoiceRecorder, AudioWaveform } from "../../components/features/VoiceRecorder";
```

2. **Update OnboardingStep type (Line 19)**:
```typescript
// BEFORE
type OnboardingStep = "profile" | "voice" | "preferences";

// AFTER
type OnboardingStep = "profile" | "preferences";
```

3. **Remove voice-related state variables** (search for these):
   - `voiceBlob`
   - `voiceDuration`
   - `uploadingVoice`
   - `existingVoiceUrl`

4. **Remove voice-related functions**:
   - `handleVoiceRecordingComplete`
   - `handleVoiceNext`
   - `handleSkipVoice`
   - `uploadVoice()` logic

5. **Update handleProfileComplete (Line 414-415)**:
```typescript
// BEFORE
setCurrentStep("voice");

// AFTER
setCurrentStep("preferences");
```

6. **Update handlePrevious (Lines 480-481)**:
```typescript
// BEFORE
} else if (currentStep === "voice") {
  setCurrentStep("profile");

// AFTER
// Remove this else if block entirely
```

7. **Update stepNumber calculation (Line 497)**:
```typescript
// BEFORE
const stepNumber = currentStep === "profile" ? 1 : currentStep === "voice" ? 2 : 3;

// AFTER
const stepNumber = currentStep === "profile" ? 1 : 2;
```

8. **Remove entire Voice Recording step (Lines 634-713)**:
```typescript
// DELETE ENTIRE BLOCK
{/* Step 2: Voice Recording */}
{currentStep === "voice" && (
  // ... all voice recording UI ...
)}
```

9. **Update text object** - remove voice-related text keys:
   - `voiceTitle`
   - `voiceSubtitle`
   - `voiceOptional`
   - `voiceHint`
   - `skipVoice`

### B.2 Update Profile.tsx

**File**: `src/screens/Settings/Profile.tsx`

**Changes**:

1. **Remove VoiceRecorder import (Line 27)**:
```typescript
// DELETE
import { VoiceRecorder } from "../../components/features/VoiceRecorder";
```

2. **Remove "voice" from TabType type**:
```typescript
// BEFORE (search for TabType)
type TabType = "info" | "voice" | "content" | "phone" | "password" | "language";

// AFTER
type TabType = "info" | "content" | "phone" | "password" | "language";
```

3. **Remove voice tab from tabs array (Lines 967-970)**:
```typescript
// BEFORE
const tabs = [
  { id: "info" as TabType, label: language === 'id' ? "Info" : "Info", icon: User },
  { id: "voice" as TabType, label: language === 'id' ? "Suara" : "Voice", icon: Mic },
  { id: "content" as TabType, label: language === 'id' ? "Konten" : "Content", icon: Sparkles },
  // ...
];

// AFTER
const tabs = [
  { id: "info" as TabType, label: language === 'id' ? "Info" : "Info", icon: User },
  { id: "content" as TabType, label: language === 'id' ? "Konten" : "Content", icon: Sparkles },
  // ...
];
```

4. **Remove voice-related state variables**:
   - `voiceBlob`
   - `voiceDuration`
   - `uploadingVoice`

5. **Remove voice-related functions**:
   - `handleVoiceRecordingComplete`
   - `saveVoiceRecording`

6. **Remove entire Voice Tab content (Lines 1086-1167)**:
```typescript
// DELETE ENTIRE BLOCK
{/* Voice Tab */}
{activeTab === "voice" && (
  // ... all voice tab content ...
)}
```

7. **Remove Mic icon import if no longer used**

### B.3 Delete VoiceRecorder Component

**Directory**: `src/components/features/VoiceRecorder/`

**Action**: Delete entire folder (3 files):
- `VoiceRecorder.tsx`
- `AudioWaveform.tsx`
- `index.ts`

---

## Phase C: Database Cleanup - Voice References

### C.1 Migration: Remove Voice Columns

**File**: `supabase/migrations/20260115000000_remove_voice_references.sql`

```sql
-- ============================================================================
-- REMOVE VOICE REFERENCE COLUMNS (VEO 3.1 has native audio)
-- ============================================================================

-- Remove voice columns from user_profiles
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS voice_reference_url,
  DROP COLUMN IF EXISTS voice_reference_duration_ms,
  DROP COLUMN IF EXISTS voice_reference_duration_seconds,
  DROP COLUMN IF EXISTS voice_recorded_at;

-- Drop voice_generation_jobs table (no longer needed)
DROP TABLE IF EXISTS voice_generation_jobs CASCADE;

-- Remove audio_url from video_generation_jobs if exists
ALTER TABLE video_generation_jobs
  DROP COLUMN IF EXISTS audio_url,
  DROP COLUMN IF EXISTS voice_url,
  DROP COLUMN IF EXISTS voice_character;
```

### C.2 Storage Cleanup

**Action**: Delete `voice-references` bucket contents
- Can be done via Supabase Dashboard
- Or via migration with storage API

---

## Phase D: Remove TTS Integration from generate-videos

### D.1 Update generate-videos/index.ts

**File**: `supabase/functions/generate-videos/index.ts`

**Changes**:

1. **Remove audioUrl parameter from submitToFalQueue() (Lines 235-242)**:
```typescript
// BEFORE
async function submitToFalQueue(
  modelSpecs: any,
  videoPrompt: string,
  imageUrl: string,
  duration: number,
  falApiKey: string,
  audioUrl?: string  // NEW: Optional TTS audio URL
): Promise<{ request_id: string; status_url: string }> {

// AFTER
async function submitToFalQueue(
  modelSpecs: any,
  videoPrompt: string,
  imageUrl: string,
  duration: number,
  falApiKey: string
): Promise<{ request_id: string; status_url: string }> {
```

2. **Remove audio handling in submitToFalQueue() (Lines 257-265)**:
```typescript
// DELETE THIS BLOCK:
// Audio handling (Wan 2.5 supports audio_url, Kling 2.5 doesn't)
if (audioUrl && modelSpecs.key === 'wan-2.5') {
  requestBody.audio_url = audioUrl;
  console.log(`[FAL_SUBMIT] Adding TTS audio: ${audioUrl}`);
} else if (audioUrl && modelSpecs.key === 'kling-2.5') {
  console.warn(`[FAL_SUBMIT] ⚠️ Kling 2.5 doesn't support audio, TTS will be ignored`);
}

console.log(`[FAL_SUBMIT] Endpoint: ${endpoint}, Duration: ${duration}s, Model: ${modelSpecs.key}${audioUrl ? ', Audio: YES' : ''}`)

// REPLACE WITH:
console.log(`[FAL_SUBMIT] Endpoint: ${endpoint}, Duration: ${duration}s, Model: ${modelSpecs.key}`)
```

3. **Delete entire TTS generation block (Lines 870-906)**:
```typescript
// DELETE THIS ENTIRE BLOCK:
// ========================================================================
// TTS GENERATION (for segments with script_text)
// ========================================================================
let audioUrl: string | undefined;

if (job.script_text && job.script_text.trim().length > 0) {
  // Any segment with script needs TTS (CREATOR or B-ROLL with narration)
  console.log(`[PROCESS_SINGLE] Generating TTS audio for segment...`);

  try {
    const { data: ttsData, error: ttsError } = await supabase.functions.invoke('generate-tts', {
      body: {
        text: job.script_text,
        voice: job.voice_preference || 'aaron',
        audio_url: job.voice_clone_url,
        temperature: 0.8,
        model: 'chatterbox-turbo'
      }
    });

    if (ttsError || !ttsData?.success) {
      console.warn(`[PROCESS_SINGLE] ⚠️ TTS failed, continuing without audio:`, ttsError || ttsData?.error);
    } else {
      audioUrl = ttsData.data.audio_url;
      console.log(`[PROCESS_SINGLE] ✅ TTS generated: ${audioUrl}`);

      await supabase
        .from('video_generation_jobs')
        .update({ audio_url: audioUrl })
        .eq('id', job.id);
    }
  } catch (ttsError) {
    console.error(`[PROCESS_SINGLE] ⚠️ TTS error:`, ttsError);
  }
}
```

4. **Update console log (Line 923)**:
```typescript
// BEFORE
console.log(`[PROCESS_SINGLE] Using fal.ai: ${modelSpecs.key}${audioUrl ? ' (with audio)' : ' (silent)'}`)

// AFTER
console.log(`[PROCESS_SINGLE] Using fal.ai: ${modelSpecs.key}`)
```

5. **Remove audioUrl from submitToFalQueue call (Lines 925-932)**:
```typescript
// BEFORE
const { request_id, status_url } = await submitToFalQueue(
  modelSpecs,
  videoPrompt,
  job.image_url,
  actualDuration,
  falApiKey,
  audioUrl  // Pass TTS audio URL if available
)

// AFTER
const { request_id, status_url } = await submitToFalQueue(
  modelSpecs,
  videoPrompt,
  job.image_url,
  actualDuration,
  falApiKey
)
```

### D.2 Keep generate-tts Edge Function (Deprecated)

**File**: `supabase/functions/generate-tts/index.ts`

**Status**: Keep but mark as deprecated
- May be useful for future features (standalone TTS, voiceover for B-roll)
- Add deprecation comment at top of file:

```typescript
/**
 * @deprecated This function is no longer called from generate-videos.
 * VEO 3.1 HD has native audio generation.
 * Kept for potential future use (standalone TTS, custom voiceovers).
 */
```

---

## Phase E: Music Integration in Final Video (FFmpeg)

### E.1 Current State Analysis

**Existing Implementation**: `backend/main.py` already has `add_background_music()` function (Lines 834-867)

```python
async def add_background_music(
    video_file: Path,
    bgm_url: str,
    volume: float,
    work_dir: Path
) -> Path
```

**Current FFmpeg Command**:
```bash
ffmpeg -y -i video.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.15[a1];[0:a][a1]amix=inputs=2:normalize=1" \
  -c:v copy -shortest output.mp4
```

### E.2 Required Changes

#### A. Update combine-final-video-v2 API Request Schema

**File**: `backend/main.py`

**Add music parameters to request model**:
```python
class CombineRequestV2(BaseModel):
    # ... existing fields ...

    # NEW: Music integration
    bgm_url: Optional[str] = None          # URL to background music file
    bgm_volume: float = 0.15               # BGM volume (0.0 - 1.0)
    preserve_native_audio: bool = True     # Keep VEO 3.1 native audio
    audio_duck_during_speech: bool = True  # Lower BGM when speech detected
```

#### B. Update FFmpeg Audio Mixing for VEO 3.1 Native Audio

**Challenge**: VEO 3.1 HD generates video WITH native audio (speech + ambient). We need to:
1. Keep native audio as primary
2. Add BGM as secondary layer
3. Optionally duck BGM during speech

**Updated add_background_music() function**:

```python
async def add_background_music_v2(
    video_file: Path,
    bgm_url: str,
    volume: float,
    work_dir: Path,
    duck_during_speech: bool = True
) -> Path:
    """
    Mix background music with video's native audio (VEO 3.1).

    Args:
        video_file: Input video with native audio
        bgm_url: URL to background music
        volume: BGM base volume (0.0-1.0)
        work_dir: Working directory
        duck_during_speech: Lower BGM when speech detected (sidechaincompress)
    """
    bgm_file = work_dir / "bgm_temp.mp3"
    await download_file(bgm_url, bgm_file)

    output_file = work_dir / f"final_with_bgm_{uuid.uuid4().hex[:8]}.mp4"

    if duck_during_speech:
        # Audio ducking: BGM volume drops when native audio is loud (speech)
        filter_complex = (
            f"[1:a]volume={volume}[bgm];"
            f"[bgm][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=500[ducked_bgm];"
            f"[0:a][ducked_bgm]amix=inputs=2:duration=first:normalize=0"
        )
    else:
        # Simple mixing without ducking
        filter_complex = (
            f"[1:a]volume={volume}[bgm];"
            f"[0:a][bgm]amix=inputs=2:duration=first:normalize=0"
        )

    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_file),
        '-i', str(bgm_file),
        '-filter_complex', filter_complex,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        str(output_file)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg error: {result.stderr}")

    return output_file
```

#### C. Update Video Combining Workflow

**File**: `backend/ffmpeg/combiner.py`

**Add music mixing step after subtitle burning**:

```python
async def combine(self, segments, output_path, config, whisper_data, progress_callback):
    # ... existing steps 1-5 ...

    # Step 6: Add Background Music (NEW)
    if config.bgm_url:
        progress_callback(75, "Adding background music...")
        current_video = await add_background_music_v2(
            video_file=current_video,
            bgm_url=config.bgm_url,
            volume=config.bgm_volume or 0.15,
            work_dir=job_dir,
            duck_during_speech=config.audio_duck_during_speech
        )

    # Step 7: Upload to Storage (was Step 6)
    progress_callback(90, "Uploading final video...")
    # ...
```

### E.3 Frontend Integration (Optional)

**File**: `src/screens/CombineVideo/CombineVideo.tsx` (or equivalent)

**Add music selection UI**:
```typescript
// Music selection state
const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
const [bgmVolume, setBgmVolume] = useState(0.15);

// In combine request
const combineRequest = {
  // ... existing fields ...
  bgm_url: selectedMusic,
  bgm_volume: bgmVolume,
  preserve_native_audio: true,
  audio_duck_during_speech: true
};
```

### E.4 Audio Ducking Explained

**sidechaincompress filter** lowers BGM when speech is detected:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `threshold` | 0.02 | Trigger level (low = sensitive) |
| `ratio` | 4 | Compression ratio (4:1 = moderate ducking) |
| `attack` | 50ms | How fast BGM ducks down |
| `release` | 500ms | How fast BGM comes back up |

**Result**: BGM volume automatically drops during dialogue, rises during silent/ambient parts.

---

## Phase F: Auto Retry Mechanism for Video Generation

### F.1 Overview

**Requirements**:
- Auto retry saat video generation gagal
- Jeda 1 menit antar retry
- Maximum 3x retry otomatis
- Setelah 3x gagal → user harus manual retry

### F.2 Database Schema Update

**File**: `supabase/migrations/20260115000001_add_retry_columns.sql`

```sql
-- Add retry tracking columns to video_generation_jobs
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Index for retry scheduler
CREATE INDEX IF NOT EXISTS idx_video_jobs_next_retry
  ON video_generation_jobs(next_retry_at)
  WHERE status = 3 AND retry_count < 3;

COMMENT ON COLUMN video_generation_jobs.retry_count IS 'Number of retry attempts (max 3)';
COMMENT ON COLUMN video_generation_jobs.next_retry_at IS 'Scheduled time for next retry attempt';
```

### F.3 Webhook Handler - Auto Retry Logic

**File**: `backend/webhook_handler.py`

```python
from datetime import datetime, timedelta
import asyncio

# Constants
MAX_RETRIES = 3
RETRY_DELAY_MINUTES = 1

@router.post("/webhook")
async def geminigen_webhook(request: Request):
    payload = await request.json()

    event = payload.get("event")
    veo_uuid = payload.get("uuid")
    data = payload.get("data", {})

    supabase = get_supabase()

    # Find job by uuid
    job_result = supabase.table("video_generation_jobs") \
        .select("*") \
        .eq("veo_uuid", veo_uuid) \
        .execute()

    if not job_result.data:
        logger.warning(f"[WEBHOOK] No job found for uuid: {veo_uuid}")
        return {"status": "error", "message": "Job not found"}

    job = job_result.data[0]
    job_id = job["id"]

    # Log webhook event
    supabase.table("webhook_events").insert({
        "job_id": job_id,
        "event_type": event,
        "payload": payload,
        "received_at": datetime.utcnow().isoformat()
    }).execute()

    if event == "VIDEO_GENERATION_COMPLETED":
        video_url = data.get("media_url")

        if not video_url:
            logger.error(f"[WEBHOOK] Completed but no media_url for job {job_id}")
            return {"status": "error", "message": "No video URL"}

        # SUCCESS - Reset retry count, update status
        supabase.table("video_generation_jobs").update({
            "status": 2,  # COMPLETED
            "video_url": video_url,
            "webhook_received_at": datetime.utcnow().isoformat(),
            "retry_count": 0,  # Reset on success
            "next_retry_at": None,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

        logger.info(f"[WEBHOOK] ✅ Job {job_id} completed: {video_url}")

        # Check if all jobs in session are done
        await check_and_notify_completion(supabase, job)

    elif event == "VIDEO_GENERATION_FAILED":
        error_msg = data.get("error_message", "Video generation failed")
        retry_count = job.get("retry_count", 0)

        if retry_count < MAX_RETRIES:
            # Schedule auto retry after 1 minute
            next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)

            supabase.table("video_generation_jobs").update({
                "status": 0,  # PENDING (ready for retry)
                "retry_count": retry_count + 1,
                "last_retry_at": datetime.utcnow().isoformat(),
                "next_retry_at": next_retry.isoformat(),
                "error_message": f"Retry {retry_count + 1}/{MAX_RETRIES}: {error_msg}",
                "veo_uuid": None,  # Clear old UUID for new submission
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", job_id).execute()

            logger.warning(f"[WEBHOOK] ⚠️ Job {job_id} failed, scheduled retry {retry_count + 1}/{MAX_RETRIES} at {next_retry}")

            # Schedule the retry task
            asyncio.create_task(schedule_retry(job_id, RETRY_DELAY_MINUTES * 60))

        else:
            # MAX RETRIES REACHED - Mark as permanently failed
            supabase.table("video_generation_jobs").update({
                "status": 3,  # FAILED (permanent)
                "error_message": f"Failed after {MAX_RETRIES} retries: {error_msg}",
                "next_retry_at": None,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", job_id).execute()

            logger.error(f"[WEBHOOK] ❌ Job {job_id} failed permanently after {MAX_RETRIES} retries")

            # Notify user about permanent failure
            await notify_permanent_failure(supabase, job)

    return {"status": "ok"}


async def schedule_retry(job_id: str, delay_seconds: int):
    """
    Wait and then trigger retry for a failed job.
    """
    await asyncio.sleep(delay_seconds)

    supabase = get_supabase()

    # Check if job is still pending retry (user might have manually retried)
    job_result = supabase.table("video_generation_jobs") \
        .select("status, retry_count, next_retry_at") \
        .eq("id", job_id) \
        .execute()

    if not job_result.data:
        return

    job = job_result.data[0]

    # Only retry if still in PENDING status and has next_retry_at set
    if job["status"] == 0 and job.get("next_retry_at"):
        logger.info(f"[RETRY] 🔄 Auto-retrying job {job_id} (attempt {job['retry_count']})")

        # Trigger resubmission via Edge Function
        # This calls the generate-videos function with action: 'process_single'
        await trigger_video_resubmission(job_id)


async def trigger_video_resubmission(job_id: str):
    """
    Call Supabase Edge Function to resubmit the job to GeminiGen.
    """
    import httpx

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{supabase_url}/functions/v1/generate-videos",
            json={
                "action": "process_single",
                "job_id": job_id,
                "is_retry": True
            },
            headers={
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )

        if response.status_code != 200:
            logger.error(f"[RETRY] Failed to resubmit job {job_id}: {response.text}")


async def notify_permanent_failure(supabase, job: dict):
    """
    Send notification when job fails permanently after max retries.
    """
    user_id = job.get("user_id")
    session_id = job.get("session_id")
    segment_number = job.get("segment_number", 0)

    if not user_id:
        return

    supabase.table("notifications").insert({
        "user_id": user_id,
        "type": "video_generation_failed",
        "title": "⚠️ Video Generation Failed",
        "message": f"Segment {segment_number} gagal setelah 3x retry. Silakan coba manual retry.",
        "data": {
            "session_id": session_id,
            "job_id": job["id"],
            "segment_number": segment_number,
            "action": "manual_retry"
        },
        "is_read": False
    }).execute()
```

### F.4 Frontend - Manual Retry Button

**File**: `src/screens/VideoGeneration/VideoGeneration.tsx`

**Add manual retry functionality for permanently failed jobs**:

```typescript
// Add retry handler
const handleManualRetry = async (segmentId: string, jobId: string) => {
  try {
    setSegments(prev => prev.map(seg =>
      seg.id === segmentId
        ? { ...seg, isGeneratingVideo: true, videoError: null }
        : seg
    ));

    const { data, error } = await supabase.functions.invoke('generate-videos', {
      body: {
        action: 'process_single',
        job_id: jobId,
        is_retry: true,
        force_retry: true  // Bypass retry count check
      }
    });

    if (error) throw error;

    // Reset retry count in DB (done by Edge Function)
    console.log(`[RETRY] Manual retry initiated for job ${jobId}`);

  } catch (err) {
    console.error('[RETRY] Manual retry failed:', err);
    setSegments(prev => prev.map(seg =>
      seg.id === segmentId
        ? { ...seg, isGeneratingVideo: false, videoError: 'Retry failed' }
        : seg
    ));
  }
};

// In segment card, show retry button for failed jobs
{segment.videoError && segment.jobId && (
  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
    <p className="text-red-400 text-xs mb-2">{segment.videoError}</p>
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleManualRetry(segment.id, segment.jobId!)}
      className="text-xs border-red-500/50 text-red-400 hover:bg-red-500/10"
    >
      <RefreshCw className="w-3 h-3 mr-1" />
      Retry Video Generation
    </Button>
  </div>
)}
```

### F.5 Edge Function - Handle Retry Flag

**File**: `supabase/functions/generate-videos/index.ts`

**Update handleProcessSingle to support retry**:

```typescript
async function handleProcessSingle(supabase: any, requestBody: any) {
  const { job_id, is_retry, force_retry } = requestBody;

  // Get job
  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('id', job_id)
    .single();

  if (jobError || !job) {
    return errorResponse('JOB_NOT_FOUND', 'Job not found');
  }

  // Check retry eligibility
  if (is_retry && !force_retry) {
    const retryCount = job.retry_count || 0;
    if (retryCount >= 3) {
      return errorResponse('MAX_RETRIES', 'Maximum retries reached. Use manual retry.');
    }
  }

  // Reset retry count if force_retry (manual retry)
  if (force_retry) {
    await supabase
      .from('video_generation_jobs')
      .update({
        retry_count: 0,
        next_retry_at: null,
        error_message: null,
        status: 1  // PROCESSING
      })
      .eq('id', job_id);
  }

  // ... rest of video generation logic ...
}
```

### F.6 Retry Flow Diagram

```
VIDEO_GENERATION_FAILED webhook received
              │
              ▼
      ┌───────────────┐
      │ retry_count   │
      │    < 3 ?      │
      └───────┬───────┘
              │
     YES      │      NO
      ▼       │       ▼
┌─────────────┴─────────────┐
│                           │
│  Set status = PENDING     │  Set status = FAILED
│  retry_count++            │  error = "Max retries"
│  next_retry_at = +1min    │  Send notification
│                           │
│  Schedule async retry     │  User sees "Retry" button
│                           │
└─────────────┬─────────────┘
              │
              ▼ (after 1 minute)
┌─────────────────────────────┐
│  Check job still PENDING    │
│  & has next_retry_at        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Call generate-videos       │
│  action: process_single     │
│  is_retry: true             │
└─────────────────────────────┘
              │
              ▼
       Submit to GeminiGen
              │
              ▼
    Wait for webhook...
```

### F.7 Job Status Display

| Status | retry_count | Display |
|--------|-------------|---------|
| PROCESSING | 0 | "Generating..." |
| PROCESSING | 1-3 | "Retrying (1/3)..." |
| FAILED | 3 | "Failed. Click to retry" |

---

## Summary of Files to Modify

| File | Action |
|------|--------|
| `src/screens/VideoGeneration/VideoGeneration.tsx` | Update model selector + add manual retry button |
| `src/screens/Onboarding/Onboarding.tsx` | Remove Voice step entirely |
| `src/screens/Settings/Profile.tsx` | Remove Voice tab |
| `src/components/features/VoiceRecorder/` | Delete entire folder |
| `supabase/functions/generate-videos/index.ts` | Remove TTS + add retry flag handling |
| `supabase/migrations/20260115000000*.sql` | Remove voice columns |
| `supabase/migrations/20260115000001*.sql` | Add retry tracking columns |
| `backend/main.py` | Add `add_background_music_v2()` with audio ducking |
| `backend/ffmpeg/combiner.py` | Add music mixing step in combine workflow |
| `backend/webhook_handler.py` | Add auto retry logic + notification |

## Summary of Database Changes

### Remove (Phase C)
| Table | Columns to Remove |
|-------|-------------------|
| `user_profiles` | voice_reference_url, voice_reference_duration_ms, voice_reference_duration_seconds, voice_recorded_at |
| `video_generation_jobs` | audio_url, voice_url, voice_character |
| `voice_generation_jobs` | DROP TABLE |

### Add (Phase F)
| Table | Columns to Add |
|-------|----------------|
| `video_generation_jobs` | retry_count, last_retry_at, next_retry_at, max_retries |

## Summary of Storage Changes

| Bucket | Action |
|--------|--------|
| `voice-references` | Delete all files, then delete bucket |

---

## Execution Order

1. **Phase A**: Update VideoGeneration model selector (frontend only)
2. **Phase B**: Remove audio recording from Onboarding & Profile (frontend only)
3. **Phase D**: Remove TTS from generate-videos Edge Function (backend)
4. **Phase E**: Add music integration in FFmpeg combine (VPS backend)
5. **Phase F**: Add auto retry mechanism (VPS webhook + Edge Function)
6. **Phase C**: Database migration (**requires permission**)

---

## Verification Steps

### Frontend (Local Testing)
1. [ ] `npm run dev` runs without errors
2. [ ] Video Generation page shows "VEO 3.1 HD ($0.50)" and "VEO 3.1 Fast ($0.19)" in dropdown
3. [ ] Model selector works - can switch between HD and Fast per segment
4. [ ] Onboarding flow: Profile → Preferences (skips Voice step)
5. [ ] Profile settings: No "Suara/Voice" tab in navigation
6. [ ] Failed segment shows "Retry" button

### Backend - Edge Functions (After Deploy)
7. [ ] `supabase functions serve generate-videos --no-verify-jwt` starts without errors
8. [ ] generate-videos does NOT invoke generate-tts
9. [ ] generate-videos handles `is_retry` and `force_retry` flags

### Backend - VPS (After Deploy)
10. [ ] combine-final-video-v2 accepts `bgm_url` parameter
11. [ ] Audio ducking works - BGM lowers during speech
12. [ ] Final video has both native audio + background music
13. [ ] Webhook auto-retries failed jobs after 1 minute
14. [ ] Max 3 retries, then permanent failure + notification

### Database (Requires Permission)
15. [ ] Database migration runs successfully (remove voice + add retry columns)

---

## Notes

- **Phase C (Database)**: Requires explicit permission before running `supabase db push`
- **VoiceRecorder component**: Will be deleted, any imports will cause build errors (intended)
- **generate-tts function**: Kept but deprecated, not deleted

---

## Appendix: GeminiGen.AI Webhook Reference

### Webhook Events for Video Generation

| Event | Description |
|-------|-------------|
| `VIDEO_GENERATION_COMPLETED` | Video successfully generated |
| `VIDEO_GENERATION_FAILED` | Video generation failed |

### Webhook Payload Structure

```json
{
  "event": "VIDEO_GENERATION_COMPLETED",
  "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
  "data": {
    "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
    "model_name": "veo-3.1",
    "input_text": "prompt text...",
    "used_credit": 50,
    "status": "completed",
    "status_percentage": 100,
    "error_message": null,
    "media_url": "https://storage.geminigen.ai/...",
    "thumbnail_url": "https://storage.geminigen.ai/...",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:05:00Z"
  }
}
```

### Key Fields for Webhook Handler

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event type: `VIDEO_GENERATION_COMPLETED` or `VIDEO_GENERATION_FAILED` |
| `uuid` | string | Request UUID (use to find job in DB) |
| `data.media_url` | string | Download URL for generated video |
| `data.status` | string | Status: "completed" / "failed" |
| `data.error_message` | string | Error details if failed |

### Webhook Handler Update (Python)

Update `backend/webhook_handler.py` to use correct payload structure:

```python
@router.post("/webhook")
async def geminigen_webhook(request: Request):
    payload = await request.json()

    # Extract from GeminiGen webhook format
    event = payload.get("event")  # VIDEO_GENERATION_COMPLETED / VIDEO_GENERATION_FAILED
    veo_uuid = payload.get("uuid")
    data = payload.get("data", {})

    # Find job by uuid
    job_result = supabase.table("video_generation_jobs") \
        .select("*") \
        .eq("veo_uuid", veo_uuid) \
        .execute()

    if event == "VIDEO_GENERATION_COMPLETED":
        video_url = data.get("media_url")
        # Update job as completed

    elif event == "VIDEO_GENERATION_FAILED":
        error_msg = data.get("error_message", "Video generation failed")
        # Update job as failed or retry
```

### Signature Verification (Optional but Recommended)

1. Download public key from GeminiGen dashboard
2. Verify `x-signature` header using HMAC-SHA256

```python
from hashlib import md5
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

def verify_webhook_signature(uuid: str, signature: str, public_key_path: str) -> bool:
    # ... verification logic
```

---

**Last Updated**: 2026-01-14
**Version**: 2.1 (Additional Changes for VEO 3.1 Migration)
