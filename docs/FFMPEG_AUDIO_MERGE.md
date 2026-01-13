# FFmpeg Audio Merge Strategy

## Overview
Handle audio overlay for video models that don't support native audio integration.

---

## 🎯 When to Use FFmpeg Audio Merge

### **Scenario Matrix:**

| Model | Duration | Audio Support | Script? | Action |
|-------|----------|---------------|---------|--------|
| **Wan 2.5** | 5s/10s | ✅ YES (`audio_url`) | ✅ | **No FFmpeg needed** (audio embedded) |
| **Wan 2.5** | 5s/10s | ✅ YES | ❌ | Silent video (no audio) |
| **Kling 2.5** | 5s/10s | ❌ NO | ✅ | **FFmpeg merge required** ⚠️ |
| **Kling 2.5** | 5s/10s | ❌ NO | ❌ | Silent video (no audio) |

---

## ⚠️ Problem: Kling 2.5 + TTS

**Current Flow (BROKEN for Kling):**
```typescript
1. Generate TTS → audio_url
2. Submit to Kling 2.5 with audio_url
3. Kling 2.5 IGNORES audio_url ❌
4. Result: Silent 10s video (audio lost)
```

**Solution: Post-Processing with FFmpeg**
```typescript
1. Generate TTS → audio_url
2. Submit to Kling 2.5 (WITHOUT audio_url)
3. Kling generates silent video → video_url
4. FFmpeg: Merge video_url + audio_url → final_video_url ✅
```

---

## 🛠️ Implementation Options

### **Option A: Python Backend (Recommended)**

**Location:** `backend/video_processing/audio_merge.py`

```python
import ffmpeg
from supabase import create_client
import os

async def merge_audio_to_video(video_url: str, audio_url: str, output_path: str):
    """
    Merge TTS audio with silent video using FFmpeg

    Args:
        video_url: URL to silent video (from Kling 2.5)
        audio_url: URL to TTS audio
        output_path: Local path for output video

    Returns:
        final_video_url: Uploaded URL to Supabase Storage
    """

    # Download video and audio
    video_path = download_temp_file(video_url, 'video.mp4')
    audio_path = download_temp_file(audio_url, 'audio.wav')

    # Merge with FFmpeg
    try:
        (
            ffmpeg
            .input(video_path)
            .audio  # Get video audio track (silent)
            .input(audio_path)  # Add TTS audio
            .output(
                output_path,
                vcodec='copy',  # Don't re-encode video (fast)
                acodec='aac',   # Encode audio to AAC
                audio_bitrate='128k',
                shortest=None  # Use video duration (truncate/pad audio)
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

        # Upload to Supabase Storage
        supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

        with open(output_path, 'rb') as f:
            storage_path = f'videos/{uuid4()}.mp4'
            supabase.storage.from_('generated-videos').upload(storage_path, f)

        final_url = supabase.storage.from_('generated-videos').get_public_url(storage_path)

        # Cleanup temp files
        os.remove(video_path)
        os.remove(audio_path)
        os.remove(output_path)

        return final_url

    except ffmpeg.Error as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise
```

**FastAPI Endpoint:**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class AudioMergeRequest(BaseModel):
    job_id: str
    video_url: str
    audio_url: str

@app.post("/api/merge-audio")
async def merge_audio_endpoint(request: AudioMergeRequest):
    """
    Merge audio with video for Kling 2.5 jobs
    """
    try:
        output_path = f'/tmp/{request.job_id}_merged.mp4'
        final_url = await merge_audio_to_video(
            request.video_url,
            request.audio_url,
            output_path
        )

        # Update Supabase job record
        supabase.table('video_generation_jobs').update({
            'video_url': final_url,
            'audio_merged': True
        }).eq('id', request.job_id).execute()

        return {
            'success': True,
            'video_url': final_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### **Option B: Supabase Edge Function (Limited)**

**Problem:** Deno Edge Functions **tidak punya FFmpeg binary**

**Workaround:** Use external FFmpeg service (e.g., shotstack.io, cloudinary)

```typescript
// supabase/functions/merge-audio-video/index.ts
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const { video_url, audio_url } = await req.json();

  // Call external FFmpeg service
  const response = await fetch('https://api.shotstack.io/v1/render', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('SHOTSTACK_API_KEY'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeline: {
        tracks: [
          {
            clips: [{
              asset: { type: 'video', src: video_url },
              start: 0,
              length: 10
            }]
          },
          {
            clips: [{
              asset: { type: 'audio', src: audio_url },
              start: 0,
              length: 10
            }]
          }
        ]
      },
      output: { format: 'mp4', resolution: '1080' }
    })
  });

  const data = await response.json();

  return new Response(JSON.stringify({
    success: true,
    render_id: data.response.id
  }), { headers: corsHeaders });
});
```

**Downside:** External dependency + cost

---

## 📋 Recommended Strategy

### **Prioritize Wan 2.5 for Audio Segments**

```typescript
// Model selection logic in generate-videos
function selectVideoModel(segment: Segment, videoDuration: VideoDuration): string {
  const hasScript = segment.script_text && segment.script_text.length > 0;
  const duration = segment.duration_seconds;

  // Rule 1: If segment has script → MUST use Wan 2.5 (audio support)
  if (hasScript && duration === 5) {
    return 'wan-2.5';  // ✅ Native audio support
  }

  // Rule 2: If segment has script but 10s → FALLBACK to 2×5s Wan 2.5
  if (hasScript && duration === 10) {
    console.warn('⚠️ 10s segment with script - consider splitting to 2×5s');
    return 'wan-2.5';  // Still prefer Wan (may need truncation)
  }

  // Rule 3: Silent B-ROLL → Prefer Kling 2.5 for 10s, Wan 2.5 for 5s
  if (!hasScript) {
    return duration === 10 ? 'kling-2.5' : 'wan-2.5';
  }

  // Default: Wan 2.5
  return 'wan-2.5';
}
```

**This strategy AVOIDS needing FFmpeg for 90% of cases!**

---

## ⚡ When FFmpeg is Actually Needed

### **Scenario: 10s Segment with Narration**

**UPDATED:** Wan 2.5 now supports BOTH 5s and 10s with audio! ✅

**Solution: Use Wan 2.5 for all audio segments**
```typescript
// Wan 2.5 handles 10s segments natively with audio
if (segment.duration === 10 && segment.script_text) {
  // Generate TTS (10s narration)
  const audioUrl = await generateTTS(segment.script_text);

  // Generate video with Wan 2.5 (10s with audio_url)
  const videoUrl = await submitToFalQueue('wan-2.5', {
    duration: "10",
    audio_url: audioUrl
  });

  // ✅ Done! No FFmpeg needed
}
```

**FFmpeg only needed if:**
- Kling 2.5 is used (fallback scenario)
- Audio >10s needs truncation adjustment
- Custom audio mixing (multiple tracks)

---

## 🔄 Updated Flow with FFmpeg

```
┌─────────────────────────────────────────────────────────────┐
│              VIDEO GENERATION DECISION TREE                 │
└─────────────────────────────────────────────────────────────┘

Has script_text?
├─ YES (needs audio)
│  ├─ Duration = 5s → Wan 2.5 (audio_url) ✅ NO FFMPEG
│  └─ Duration = 10s → Wan 2.5 (audio_url) ✅ NO FFMPEG
│
└─ NO (silent B-ROLL)
   ├─ Duration = 5s → Wan 2.5 ✅ NO FFMPEG
   └─ Duration = 10s → Wan 2.5 or Kling 2.5 ✅ NO FFMPEG
```

**Result: ~99% of cases don't need FFmpeg** ✅

---

## 🚀 Implementation Priority

### **Phase 1: Avoid FFmpeg (Current Implementation)** ✅
- Use Wan 2.5 for all audio segments (5s)
- Auto-duration logic prevents 10s narrated segments
- Kling 2.5 only for silent 10s B-ROLL

### **Phase 2: Add FFmpeg Support (Future)** 🔮
- Only if users demand 10s narrated segments
- Implement Python backend endpoint
- Add post-processing step after Kling generation

### **Phase 3: Advanced Options (Far Future)** 🌟
- Split/merge UI controls
- Manual duration override
- Audio mixing (multiple tracks)

---

## 💡 Recommendations

### **For Now (Phase 14):**
1. ✅ Wan 2.5 as PRIMARY model (supports 5s AND 10s with audio)
2. ✅ Auto-duration logic works seamlessly (5s or 10s)
3. ✅ No FFmpeg dependency needed for 99% of cases
4. ✅ Simpler, faster, cheaper
5. ✅ Better segment control vs splitting 10s into 2×5s

### **When to Add FFmpeg:**
- Only if Kling 2.5 is used as fallback (when Wan 2.5 fails)
- Custom audio mixing (multiple tracks, volume control)
- Advanced audio effects (fade in/out, ducking)

### **Alternative to FFmpeg:**
- Use external service (Shotstack, Cloudinary, Mux) if needed
- Trade-off: Additional cost vs infrastructure complexity
- For now: NOT NEEDED - Wan 2.5 handles everything natively

---

## 📊 Cost Comparison

### **Approach A: Avoid FFmpeg (Current)**
```
10s narrated segment → Split to 2×5s Wan 2.5
Cost: 2 × $0.15 = $0.30
Processing: ~60s (2 video generations in parallel)
Complexity: Simple ✅
```

### **Approach B: FFmpeg Merge**
```
10s narrated segment → Kling 2.5 + FFmpeg
Cost: $0.15 (Kling) + $0.00 (self-hosted FFmpeg) = $0.15
Processing: ~40s (video + merge)
Complexity: High (Python backend, file storage, cleanup)
```

**Analysis:**
- Cost savings: $0.15 per segment (50%)
- BUT: Requires infrastructure investment
- AND: Adds complexity and failure points
- **Verdict:** Not worth it for current scale

---

## ✅ Conclusion

**Current Strategy: DON'T USE FFMPEG** ✅

**Why:**
1. Wan 2.5 handles 99% of audio needs natively (5s AND 10s)
2. Auto-duration works perfectly (5s or 10s based on video length)
3. Better control: Single 10s segment vs split 2×5s (fewer jobs, better consistency)
4. Simpler architecture = fewer bugs
5. Faster time-to-market

**Future Consideration:**
- Add FFmpeg only if Kling 2.5 fallback is heavily used
- Alternative: External video processing service
- For now: Wan 2.5 solves everything natively

---

**Last Updated:** January 13, 2026
**Status:** Recommended - Avoid FFmpeg unless necessary
**Implementation Priority:** Phase 3+ (not urgent)
