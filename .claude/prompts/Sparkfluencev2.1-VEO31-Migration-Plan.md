# Sparkfluence v2.1 - VEO 3.1 HD Migration Plan

## Overview

**Tujuan**: Migrasi video generation dari fal.ai (Wan 2.5/Kling 2.5) ke VEO 3.1 HD via geminigen.ai webhook.

**Key Changes**:
| Aspek | v2.0 (Current) | v2.1 (New) |
|-------|----------------|------------|
| Video Provider | fal.ai (Wan 2.5, Kling 2.5) | geminigen.ai (VEO 3.1 HD) |
| API Pattern | Polling (queue → check status) | **Webhook** (async callback) |
| Duration | 5s / 10s | **8s fixed** |
| TTS | Chatterbox Turbo (separate) | **Removed** (native audio) |
| Word Limit | 9w (5s) / 17w (10s) | **14 words** (8s) |
| Cost | $0.10-0.15/video | **$0.50/video** (8s) |
| Lip-sync | TTS + FFmpeg merge | **Native** (VEO 3.1 built-in) |

---

## Phase 1: Database Schema Updates

### 1.1 New Migration: Webhook Support

**File**: `supabase/migrations/20260114000000_veo31_webhook_support.sql`

```sql
-- ============================================================================
-- VEO 3.1 HD WEBHOOK SUPPORT MIGRATION
-- Adds columns for webhook-based video generation tracking
-- ============================================================================

-- Add webhook tracking columns to video_generation_jobs
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS external_request_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'geminigen';

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_external_request_id 
  ON video_generation_jobs(external_request_id);

-- Create webhook_events table for logging
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES video_generation_jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_job_id ON webhook_events(job_id);

-- RLS for webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to webhook events" ON webhook_events;
CREATE POLICY "Service role has full access to webhook events"
    ON webhook_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Comment
COMMENT ON TABLE webhook_events IS 'Logs all webhook callbacks from geminigen.ai for debugging and retry logic';
```

### 1.2 Update Duration Default

```sql
-- Update default duration from 8 to 8 (already correct in current schema)
-- But update existing records if needed
UPDATE video_generation_jobs 
SET duration_seconds = 8 
WHERE duration_seconds IN (5, 10) AND status = 0;
```

---

## Phase 2: Config Updates

### 2.1 Update aiModels.ts

**File**: `supabase/functions/_shared/config/aiModels.ts`

**Changes**:
1. Add VEO 3.1 HD model config
2. Update dialogue limits for 8s
3. Remove/deprecate fal.ai models

```typescript
// ADD this new model config (replace wan-2.5 and kling-2.5 sections)

// ==========================================================================
// VEO 3.1 HD (GEMINIGEN.AI) - 8s fixed, 720p/1080p, WEBHOOK-BASED
// PRIMARY model for ALL segments - Native audio/lip-sync
// ==========================================================================
'veo-3.1-hd': {
  key: 'veo-3.1-hd',
  displayName: 'VEO 3.1 HD (GeminiGen)',
  provider: 'geminigen',
  endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
  apiModelName: 'veo-3.1',
  supportedDurations: [8],  // FIXED 8s only
  defaultDuration: 8,
  maxDuration: 8,
  resolutions: {
    '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
    '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
  },
  aspectRatios: {
    '9:16': { apiValue: '9:16', maxResolution: '720p' },  // Portrait = 720p only
    '16:9': { apiValue: '16:9', maxResolution: '1080p' },
  },
  refImageParam: 'ref_images',
  dialogueLimits: { 8: 14 },  // 14 words max for 8s
  costPerVideo: 0.50,
  strengths: [
    'Native audio generation',
    'Built-in lip-sync',
    'No TTS needed',
    'High-quality 1080p',
    'Webhook-based (no polling)',
  ],
  weaknesses: [
    'Fixed 8s duration',
    'Higher cost ($0.50/video)',
    '9:16 limited to 720p',
  ],
  bestFor: ['ALL segments', 'HOOK with dialogue', 'CTA with dialogue', 'B-ROLL'],
  enabled: true,
  notes: 'PRIMARY model. Native audio = no TTS needed. Uses webhook for completion.',
},

// ==========================================================================
// VEO 3.1 FAST (GEMINIGEN.AI) - 8s fixed, 720p/1080p, WEBHOOK-BASED
// BACKUP/BUDGET model - Faster but slightly lower quality
// ==========================================================================
'veo-3.1-fast': {
  key: 'veo-3.1-fast',
  displayName: 'VEO 3.1 Fast (GeminiGen)',
  provider: 'geminigen',
  endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
  apiModelName: 'veo-3.1-fast',
  supportedDurations: [8],
  defaultDuration: 8,
  maxDuration: 8,
  resolutions: {
    '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
    '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
  },
  aspectRatios: {
    '9:16': { apiValue: '9:16', maxResolution: '720p' },
    '16:9': { apiValue: '16:9', maxResolution: '1080p' },
  },
  refImageParam: 'ref_images',
  dialogueLimits: { 8: 14 },
  costPerVideo: 0.19,  // Cheaper
  strengths: ['Fast generation', 'Lower cost', 'Native audio'],
  weaknesses: ['Slightly lower quality', 'Fixed 8s'],
  bestFor: ['Budget projects', 'Rapid prototyping', 'Testing'],
  enabled: true,
  notes: 'BUDGET model. Use for testing or when cost is priority.',
},
```

### 2.2 Update Word Limit Helper

**File**: `supabase/functions/_shared/config/aiModels.ts`

```typescript
// Update getMaxDialogueWords function
export function getMaxDialogueWords(model: VideoModelConfig, duration: number): number {
  // VEO 3.1 always uses 8s = 14 words
  if (model.key.startsWith('veo-3.1')) {
    return 14;
  }
  
  // Legacy fallback
  return model.dialogueLimits[duration] || 14;
}
```

---

## Phase 3: Edge Function - generate-videos Rewrite

### 3.1 Remove fal.ai Code

**File**: `supabase/functions/generate-videos/index.ts`

**Remove**:
- `submitToFalQueue()` function
- `pollFalStatus()` function
- All fal.ai related imports and code
- TTS generation code (`generate-tts` invoke)

### 3.2 Add GeminiGen.AI Webhook Integration

**New helper functions**:

```typescript
// ============================================================================
// GEMINIGEN.AI HELPER FUNCTIONS (Webhook-based)
// ============================================================================

/**
 * Submit video generation to GeminiGen.AI
 * Returns immediately with request ID - video delivered via webhook
 */
async function submitToGeminiGen(
  prompt: string,
  imageUrl: string,
  aspectRatio: '9:16' | '16:9',
  resolution: '720p' | '1080p',
  jobId: string,
  apiKey: string
): Promise<{ id: number; uuid: string; status: number }> {
  
  // Build webhook URL with job_id for tracking
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/video-webhook?job_id=${jobId}`;
  
  // Build form data (multipart/form-data as per API docs)
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model', 'veo-3.1');  // or 'veo-3.1-fast'
  formData.append('resolution', resolution);
  formData.append('aspect_ratio', aspectRatio);
  
  // Add reference image (URL format)
  formData.append('ref_images', imageUrl);
  
  // Note: webhook_url may not be in current API - check docs
  // If not supported, use polling fallback with get-history API
  
  const response = await fetch('https://api.geminigen.ai/uapi/v1/video-gen/veo', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GeminiGen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  console.log(`[GEMINIGEN] ✅ Submitted: id=${data.id}, uuid=${data.uuid}, status=${data.status}`);
  
  return {
    id: data.id,
    uuid: data.uuid,
    status: data.status  // 1=processing, 2=completed, 3=failed
  };
}

/**
 * Check GeminiGen video status (fallback if webhook not received)
 * Use: https://api.geminigen.ai/uapi/v1/history/{uuid}
 */
async function checkGeminiGenStatus(
  uuid: string,
  apiKey: string
): Promise<{ status: number; video_url?: string; error?: string }> {
  
  const response = await fetch(`https://api.geminigen.ai/uapi/v1/history/${uuid}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    }
  });

  if (!response.ok) {
    throw new Error(`GeminiGen status check failed: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    status: data.status,  // 1=processing, 2=completed, 3=failed
    video_url: data.video_url || data.output_url,
    error: data.error_message
  };
}
```

### 3.3 Update handleProcessSingle()

**Key changes**:
1. Remove TTS generation code
2. Use VEO 3.1 instead of fal.ai
3. Store geminigen UUID for tracking
4. Word limit = 14 (hardcoded for 8s)

```typescript
async function handleProcessSingle(supabase: any, requestBody: any) {
  const { job_id, session_id, user_id } = requestBody;

  const geminiGenApiKey = Deno.env.get('GEMINIGEN_API_KEY');
  if (!geminiGenApiKey) {
    return errorResponse('CONFIG_ERROR', 'GEMINIGEN_API_KEY not configured');
  }

  // ... existing job lookup code ...

  // ========================================================================
  // BUILD VIDEO PROMPT (same as before, but no TTS)
  // ========================================================================
  const videoPrompt = buildCinematicVideoPrompt({
    // ... same params ...
    // NOTE: scriptText is included in prompt for VEO's native audio
  });

  // ========================================================================
  // SUBMIT TO GEMINIGEN.AI (webhook-based)
  // ========================================================================
  try {
    const aspectRatio = job.aspect_ratio || '9:16';
    // Portrait (9:16) = 720p only, Landscape (16:9) = 1080p
    const resolution = aspectRatio === '9:16' ? '720p' : '1080p';
    
    const result = await submitToGeminiGen(
      videoPrompt,
      job.image_url,
      aspectRatio as '9:16' | '16:9',
      resolution,
      job.id,
      geminiGenApiKey
    );

    // Update job with GeminiGen tracking info
    await supabase
      .from('video_generation_jobs')
      .update({
        external_request_id: String(result.id),
        veo_uuid: result.uuid,
        platform: 'veo-3.1-hd',
        prompt: videoPrompt.substring(0, 1000),
        provider: 'geminigen',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    return successResponse({
      job: {
        id: job.id,
        segment_number: job.segment_number,
        segment_type: job.segment_type,
        veo_uuid: result.uuid,
        status: JOB_STATUS.PROCESSING
      },
      message: 'Job submitted to GeminiGen. Video will be delivered via webhook.'
    });

  } catch (err) {
    // ... error handling ...
  }
}
```

### 3.4 Update handleCheckAndUpdate() for GeminiGen

```typescript
async function handleCheckAndUpdate(supabase: any, requestBody: any) {
  const { session_id, user_id } = requestBody;

  const geminiGenApiKey = Deno.env.get('GEMINIGEN_API_KEY');
  
  // Get processing jobs
  const { data: processingJobs } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
    .eq('status', JOB_STATUS.PROCESSING)
    .not('veo_uuid', 'is', null);

  if (!processingJobs?.length) {
    return await getSessionStatus(supabase, session_id, user_id);
  }

  // Check each job status via GeminiGen API
  for (const job of processingJobs) {
    try {
      const status = await checkGeminiGenStatus(job.veo_uuid, geminiGenApiKey);
      
      if (status.status === 2 && status.video_url) {
        // Completed
        await supabase
          .from('video_generation_jobs')
          .update({
            status: JOB_STATUS.COMPLETED,
            video_url: status.video_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
          
      } else if (status.status === 3) {
        // Failed
        await supabase
          .from('video_generation_jobs')
          .update({
            status: JOB_STATUS.FAILED,
            error_message: status.error || 'Video generation failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
      // Status 1 = still processing, no update needed
      
    } catch (err) {
      console.error(`[CHECK] Error checking job ${job.id}:`, err);
    }
  }

  return await getSessionStatus(supabase, session_id, user_id);
}
```

---

## Phase 4: Webhook Handler (Python FastAPI)

### ⚠️ IMPORTANT: Webhook Architecture

**Webhook URL**: `https://sparkfluence.alisadikinma.com/webhook`

GeminiGen webhook akan dikirim ke VPS (bukan Supabase Edge Function) karena:
1. Webhook URL sudah didaftarkan di geminigen.ai dashboard
2. VPS sudah running Python FastAPI untuk video processing
3. Lebih reliable untuk long-running operations

### 4.1 Create Webhook Handler

**File**: `backend/webhook_handler.py` (Python FastAPI on VPS)

```python
# backend/webhook_handler.py
from fastapi import APIRouter, Request, HTTPException
from supabase import create_client, Client
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# Job status constants
JOB_STATUS = {
    "PENDING": 0,
    "PROCESSING": 1,
    "COMPLETED": 2,
    "FAILED": 3
}

def get_supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

@router.post("/webhook")
async def geminigen_webhook(request: Request):
    """
    Handle GeminiGen.AI video generation webhook callbacks.
    
    Webhook URL: https://sparkfluence.alisadikinma.com/webhook
    
    Expected payload from GeminiGen:
    {
        "id": 2588,
        "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
        "status": 2,  # 1=processing, 2=completed, 3=failed
        "video_url": "https://...",
        "error_message": "..."
    }
    """
    try:
        payload = await request.json()
        logger.info(f"[WEBHOOK] Received: {str(payload)[:200]}")
        
        supabase = get_supabase()
        
        # Get uuid from payload to find our job
        veo_uuid = payload.get("uuid")
        if not veo_uuid:
            logger.error("[WEBHOOK] Missing uuid in payload")
            return {"status": "error", "message": "Missing uuid"}
        
        # Find job by veo_uuid
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
            "event_type": str(payload.get("status")),
            "payload": payload,
            "received_at": datetime.utcnow().isoformat()
        }).execute()
        
        status = payload.get("status")
        
        if status == 2:  # Completed
            video_url = payload.get("video_url") or payload.get("output_url")
            
            if not video_url:
                logger.error(f"[WEBHOOK] Completed but no video_url for job {job_id}")
                return {"status": "error", "message": "No video URL"}
            
            supabase.table("video_generation_jobs").update({
                "status": JOB_STATUS["COMPLETED"],
                "video_url": video_url,
                "webhook_received_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", job_id).execute()
            
            logger.info(f"[WEBHOOK] ✅ Job {job_id} completed: {video_url}")
            
            # Check if all jobs in session are done
            await check_and_notify_completion(supabase, job)
            
        elif status == 3:  # Failed
            retry_count = job.get("retry_count", 0)
            
            if retry_count < 3:
                # Schedule retry
                supabase.table("video_generation_jobs").update({
                    "status": JOB_STATUS["PENDING"],
                    "retry_count": retry_count + 1,
                    "error_message": payload.get("error_message", "Generation failed, retrying..."),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", job_id).execute()
                
                logger.warning(f"[WEBHOOK] ⚠️ Job {job_id} failed, retry {retry_count + 1}/3")
            else:
                # Max retries
                supabase.table("video_generation_jobs").update({
                    "status": JOB_STATUS["FAILED"],
                    "error_message": payload.get("error_message", "Failed after 3 retries"),
                    "webhook_received_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", job_id).execute()
                
                logger.error(f"[WEBHOOK] ❌ Job {job_id} failed permanently")
        
        # Status 1 = still processing, ignore
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.exception(f"[WEBHOOK] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def check_and_notify_completion(supabase: Client, job: dict):
    """Check if all jobs in session are complete and send notification."""
    try:
        session_id = job.get("session_id")
        user_id = job.get("user_id")
        
        if not session_id or not user_id:
            return
        
        # Get all jobs in session
        jobs_result = supabase.table("video_generation_jobs") \
            .select("status") \
            .eq("session_id", session_id) \
            .eq("user_id", user_id) \
            .execute()
        
        jobs = jobs_result.data or []
        
        pending = len([j for j in jobs if j["status"] == 0])
        processing = len([j for j in jobs if j["status"] == 1])
        completed = len([j for j in jobs if j["status"] == 2])
        failed = len([j for j in jobs if j["status"] == 3])
        
        if pending == 0 and processing == 0:
            # All done - create notification
            all_success = failed == 0
            
            supabase.table("notifications").insert({
                "user_id": user_id,
                "type": "video_generation_complete" if all_success else "video_generation_partial",
                "title": "🎬 Videos Ready!" if all_success else "⚠️ Video Generation Complete",
                "message": f"All {completed} videos generated successfully." if all_success 
                           else f"{completed}/{completed + failed} videos generated. {failed} failed.",
                "data": {
                    "session_id": session_id,
                    "completed": completed,
                    "failed": failed
                },
                "is_read": False
            }).execute()
            
            logger.info(f"[WEBHOOK] 🔔 Notification sent for session {session_id}")
            
    except Exception as e:
        logger.exception(f"[WEBHOOK] Notification error: {e}")
```

### 4.2 Register Webhook in FastAPI main.py

**File**: `backend/main.py`

```python
# Add import and router
from webhook_handler import router as webhook_router

# Register router
app.include_router(webhook_router)
```

### 4.3 GeminiGen Webhook Registration

**URL**: `https://geminigen.ai/profile/integration/webhook`

1. Login ke geminigen.ai
2. Go to Profile → Integration → Webhook
3. Register URL: `https://sparkfluence.alisadikinma.com/webhook`
4. Save

---

## Phase 5: Remove TTS Integration

### 5.1 Files to Modify

**generate-videos/index.ts**:
- Remove `generate-tts` Edge Function invocation
- Remove `audio_url` parameter handling
- Remove TTS-related comments and code

**aiModels.ts**:
- Remove `audio_url` from model config comments
- Update model notes to indicate native audio

### 5.2 TTS Edge Function Status

**Keep**: `generate-tts` Edge Function for potential future use (voice cloning, custom audio)
**Mark**: As deprecated/optional in documentation

---

## Phase 6: Frontend Updates

### 6.1 Update Duration UI

**File**: `src/screens/VideoGeneration/VideoGeneration.tsx`

```typescript
// Remove duration selector - always 8s
const FIXED_DURATION = 8;

// Update UI to show fixed duration info
<div className="text-sm text-muted-foreground">
  Duration: 8 seconds per segment (VEO 3.1 HD)
</div>
```

### 6.2 Update Word Counter

**File**: `src/components/features/ScriptEditor/ScriptEditor.tsx`

```typescript
const MAX_WORDS_PER_SEGMENT = 14; // VEO 3.1 HD @ 8s

// Show word count warning
{wordCount > MAX_WORDS_PER_SEGMENT && (
  <span className="text-destructive">
    ⚠️ {wordCount}/{MAX_WORDS_PER_SEGMENT} words (exceeds limit for 8s video)
  </span>
)}
```

### 6.3 Remove Model Selector

If VideoGeneration has a model selector dropdown, remove it - always use VEO 3.1 HD.

---

## Phase 7: Environment Variables

### 7.1 Add New Secret

```bash
# Add to Supabase secrets
supabase secrets set GEMINIGEN_API_KEY=your_api_key_here
```

### 7.2 Optional: Remove Old Secrets

After migration is stable:
```bash
# FAL_AI_API_KEY can be removed if no longer used elsewhere
# Keep for now in case of rollback
```

---

## Phase 8: Testing Checklist

### 8.1 Unit Tests

- [ ] `submitToGeminiGen()` returns valid response
- [ ] `checkGeminiGenStatus()` parses all status codes
- [ ] Word truncation at 14 words works correctly
- [ ] Prompt building includes dialogue for native audio

### 8.2 Integration Tests

- [ ] Create job → submit to GeminiGen → receive webhook
- [ ] Webhook updates job status correctly
- [ ] Failed job triggers retry (up to 3x)
- [ ] Completion notification sent when all jobs done

### 8.3 End-to-End Tests

- [ ] Full flow: Script → Image → Video → Gallery
- [ ] Video plays with audio in preview
- [ ] Multiple segments in same session
- [ ] Mix of HOOK (dialogue) and B-ROLL (ambient)

---

## Phase 9: Rollback Plan

### If VEO 3.1 Issues Occur:

1. **Quick fix**: Change model in aiModels.ts back to `veo-3.1-fast`
2. **Full rollback**: Revert generate-videos to use fal.ai
3. **DB**: No schema changes need rollback (additive only)

### Keep fal.ai Code:

Comment out but don't delete fal.ai functions for 30 days.

---

## Execution Order

1. **Phase 1**: Database migration (add columns)
2. **Phase 2**: Update aiModels.ts config
3. **Phase 3**: Rewrite generate-videos Edge Function
4. **Phase 4**: Create video-webhook Edge Function
5. **Phase 5**: Remove TTS integration from video flow
6. **Phase 6**: Frontend duration/word limit updates
7. **Phase 7**: Add GEMINIGEN_API_KEY secret
8. **Phase 8**: Testing
9. **Phase 9**: Monitor & rollback if needed

---

## Deployment Commands

```batch
:: 1. Push database migration (ASK PERMISSION)
supabase db push

:: 2. Deploy Edge Functions (ASK PERMISSION)
supabase functions deploy generate-videos --no-verify-jwt

:: 3. Set Supabase secrets (ASK PERMISSION)
supabase secrets set GEMINIGEN_API_KEY=xxx

:: 4. Deploy VPS webhook handler (ASK PERMISSION)
ssh user@sparkfluence.alisadikinma.com
cd /path/to/backend
git pull origin main
pip install -r requirements.txt
sudo systemctl restart sparkfluence-backend

:: 5. Frontend build
npm run build
```

### VPS Environment Variables

```bash
# Add to VPS .env file
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
GEMINIGEN_API_KEY=xxx
```

---

## Success Criteria

- ✅ Videos generate with native audio (no TTS needed)
- ✅ Dialogue syncs with lip movement
- ✅ All segments use 8s duration
- ✅ Word limit enforced at 14 words
- ✅ Webhook receives completion callbacks
- ✅ Retry logic works for failed jobs
- ✅ Notifications sent on completion
- ✅ No regression in existing features

---

## Estimated Time

| Phase | Hours |
|-------|-------|
| Database Schema | 0.5 |
| Config Updates | 1 |
| generate-videos Rewrite | 3-4 |
| video-webhook | 1-2 |
| TTS Removal | 0.5 |
| Frontend Updates | 1 |
| Testing | 2-3 |
| **Total** | **9-12 hours** |

---

**Last Updated**: 2026-01-14
**Version**: 2.1 (VEO 3.1 HD Migration)
