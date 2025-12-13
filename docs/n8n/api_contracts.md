# API Contracts Documentation - Sparkfluence Platform

**Architecture:** Hybrid (Supabase Edge Functions + Python Backend)
**Last Updated:** 2025-12-06
**Version:** 1.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Supabase Edge Functions](#part-1-supabase-edge-functions)
   - [Endpoint 1: Generate Script](#endpoint-1-post-functionsv1generate-script)
   - [Endpoint 2: Generate Images](#endpoint-2-post-functionsv1generate-images)
   - [Endpoint 3: Generate Videos](#endpoint-3-post-functionsv1generate-videos)
   - [Endpoint 4: Check Video Status](#endpoint-4-post-functionsv1check-video-status)
3. [Python Backend (VPS)](#part-2-python-backend-vps)
   - [Endpoint 5: Combine Final Video](#endpoint-5-post-apicombine-final-video)
   - [Endpoint 6: Job Status](#endpoint-6-get-apijob-statusjob_id)
4. [Error Responses](#error-responses)
5. [Complete Workflow Example](#complete-workflow-example)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUPABASE EDGE FUNCTIONS                                        │
│  ├── POST /functions/v1/generate-script                         │
│  │   └── Gemini + RAG (pgvector) → Return script JSON          │
│  │                                                               │
│  ├── POST /functions/v1/generate-images                         │
│  │   └── HuggingFace FLUX (free) or DALL-E (premium) → Images  │
│  │                                                               │
│  ├── POST /functions/v1/generate-videos                         │
│  │   └── Gemini + VEO 3.1 → Return video UUIDs                 │
│  │   └── NOTE: VEO 3.1 has BUILT-IN voiceover (no external TTS)│
│  │                                                               │
│  └── POST /functions/v1/check-video-status                      │
│      └── Poll VEO API → Return video URLs when ready           │
│                                                                  │
│  PYTHON BACKEND (VPS)                                           │
│  └── POST /api/combine-final-video                              │
│      ├── Download all video segments (already have voice)      │
│      ├── FFmpeg: Concat all segments                           │
│      ├── (Optional) FFmpeg: Add background music               │
│      ├── Upload to storage                                      │
│      └── Return final video URL                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 1: SUPABASE EDGE FUNCTIONS

### Base URL

```
Production: https://<project-ref>.supabase.co/functions/v1
```

### Authentication

All Edge Functions require Supabase Auth token:

```http
Authorization: Bearer <supabase_access_token>
```

---

### Endpoint 1: POST /functions/v1/generate-script

Generate viral video script from user input using Gemini AI with RAG (pgvector).

#### Request

**Headers:**
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "input_type": "transcript | title | topic",
  "content": "string",
  "duration": "30s | 60s",
  "platform": "tiktok | instagram | youtube_shorts",
  "language": "indonesian | english | hindi | spanish | etc"
}
```

**Example Request:**
```json
{
  "input_type": "topic",
  "content": "5 cara meningkatkan produktivitas kerja",
  "duration": "30s",
  "platform": "tiktok",
  "language": "indonesian"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "type": "HOOK",
        "duration_seconds": 6,
        "script_text": "Kerja seharian tapi nggak produktif? Ini yang salah!",
        "visual_direction": "Close-up of stressed person looking at messy desk with papers everywhere",
        "emotion": "shock"
      },
      {
        "type": "BODY_1",
        "duration_seconds": 8,
        "script_text": "Rahasia nomor 1: Time blocking. Buat jadwal kerja per jam!",
        "visual_direction": "Screen recording of calendar app with color-coded time blocks",
        "emotion": "curiosity"
      },
      {
        "type": "BODY_2",
        "duration_seconds": 8,
        "script_text": "Rahasia nomor 2: Pomodoro technique. 25 menit fokus, 5 menit istirahat.",
        "visual_direction": "Timer showing 25:00 countdown with person working intensely",
        "emotion": "hope"
      },
      {
        "type": "ENDING_CTA",
        "duration_seconds": 8,
        "script_text": "Cobain teknik ini sekarang! Follow untuk tips produktivitas lainnya!",
        "visual_direction": "Energetic person giving thumbs up with 'FOLLOW' text overlay",
        "emotion": "excitement"
      }
    ],
    "metadata": {
      "virality_score": 8.5,
      "hooks_used": ["curiosity_gap", "pain_point"],
      "total_duration": 30,
      "language": "indonesian"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.segments` | array | Array of video segments (4 segments for 30s, up to 8 for 60s) |
| `data.segments[].type` | string | Segment type: HOOK, BODY_1, BODY_2, ENDING_CTA |
| `data.segments[].duration_seconds` | number | Duration for this segment |
| `data.segments[].script_text` | string | Script text in selected language |
| `data.segments[].visual_direction` | string | Description of visual elements |
| `data.segments[].emotion` | string | Target emotion: shock, curiosity, hope, excitement, etc. |
| `data.metadata.virality_score` | number | Predicted virality score (0-10) |
| `data.metadata.hooks_used` | array | Viral hooks applied |
| `data.metadata.total_duration` | number | Total video duration in seconds |
| `data.metadata.language` | string | Language of the script |

---

### Endpoint 2: POST /functions/v1/generate-images

Generate images for each video segment. Supports two providers:
- **HuggingFace FLUX.1-schnell** (FREE) - Default
- **OpenAI DALL-E 3** (Premium)

#### Request

**Headers:**
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Kerja seharian tapi nggak produktif? Ini yang salah!",
      "visual_direction": "Close-up of stressed person looking at messy desk with papers everywhere",
      "emotion": "shock"
    },
    {
      "type": "BODY_1",
      "script_text": "...",
      "visual_direction": "...",
      "emotion": "curiosity"
    }
  ],
  "style": "cinematic | realistic | animated",
  "aspect_ratio": "9:16",
  "provider": "huggingface | openai"
}
```

#### Provider Comparison

| Provider | Model | Quality | Speed | Cost |
|----------|-------|---------|-------|------|
| `huggingface` | FLUX.1-schnell | ⭐⭐⭐⭐ | Fast | ✅ FREE |
| `openai` | DALL-E 3 | ⭐⭐⭐⭐⭐ | Medium | 💰 ~$0.04/image |

**Default:** `huggingface` (free option)

**Example Request (HuggingFace - FREE):**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Kerja seharian tapi nggak produktif?",
      "visual_direction": "Close-up of stressed person at messy desk",
      "emotion": "shock"
    }
  ],
  "style": "cinematic",
  "aspect_ratio": "9:16",
  "provider": "huggingface"
}
```

**Example Request (OpenAI - Premium):**
```json
{
  "segments": [...],
  "style": "cinematic",
  "aspect_ratio": "9:16",
  "provider": "openai"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "segment_type": "HOOK",
        "prompt": "Cinematic close-up photo of a stressed young professional...",
        "image_url": "https://storage.supabase.co/images/generated/abc123.png",
        "provider": "huggingface",
        "revised_prompt": null
      },
      {
        "segment_type": "BODY_1",
        "prompt": "...",
        "image_url": "https://...",
        "provider": "huggingface",
        "revised_prompt": null
      }
    ],
    "provider": "huggingface"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.images` | array | Array of generated images (one per segment) |
| `data.images[].segment_type` | string | Segment type this image is for |
| `data.images[].prompt` | string | Full prompt sent to image provider |
| `data.images[].image_url` | string | Generated image URL |
| `data.images[].provider` | string | Provider used (huggingface/openai) |
| `data.images[].revised_prompt` | string/null | DALL-E's revised prompt (null for FLUX) |
| `data.provider` | string | Provider used for all images |

#### Provider Notes

**HuggingFace FLUX.1-schnell:**
- Images uploaded to Supabase Storage (permanent URL)
- Resolution: 576x1024 (9:16)
- No revised_prompt (returns null)

**OpenAI DALL-E 3:**
- Temporary URL (expires after ~1 hour)
- Resolution: 1024x1792 (9:16)
- Returns revised_prompt with expanded description

---

### Endpoint 3: POST /functions/v1/generate-videos

Generate VEO 3.1 videos from images with built-in voiceover.

**IMPORTANT:** VEO 3.1 has BUILT-IN voiceover capability. The `script_text` is passed to VEO and it generates video WITH voice narration. No external TTS service is needed.

#### Request

**Headers:**
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Text yang akan di-voiceover oleh VEO",
      "emotion": "shock"
    },
    {
      "type": "BODY_1",
      "script_text": "...",
      "emotion": "curiosity"
    }
  ],
  "images": [
    {
      "segment_type": "HOOK",
      "image_url": "https://oaidalleapiprodscus.blob.core.windows.net/private/..."
    },
    {
      "segment_type": "BODY_1",
      "image_url": "https://..."
    }
  ],
  "language": "indonesian | english | hindi | spanish | etc"
}
```

**Example Request:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Kerja seharian tapi nggak produktif? Ini yang salah!",
      "emotion": "shock"
    }
  ],
  "images": [
    {
      "segment_type": "HOOK",
      "image_url": "https://oaidalleapiprodscus.blob.core.windows.net/private/abc123..."
    }
  ],
  "language": "indonesian"
}
```

#### VEO API Call (Internal - per segment)

The Edge Function makes this call to VEO API for each segment:

```bash
curl -X POST https://api.geminigen.ai/uapi/v1/video-gen/veo \
  -H "Content-Type: multipart/form-data" \
  -H "x-api-key: <veo_api_key>" \
  --form "prompt=Dynamic camera movement zooming into stressed person's face. Voice narration in Indonesian: 'Kerja seharian tapi nggak produktif? Ini yang salah!' Emotional tone: shocked, urgent." \
  --form "model=veo-3.1-fast" \
  --form "resolution=720p" \
  --form 'aspect_ratio="9:16"' \
  --form 'file_urls="https://oaidalleapiprodscus.blob.core.windows.net/private/abc123..."'
```

**Note:** The `prompt` parameter combines:
1. Motion/camera direction
2. Voice narration text (script_text)
3. Emotional tone
4. Language specification

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "segment_type": "HOOK",
        "veo_response": {
          "id": 2588,
          "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
          "model_name": "veo-3.1-fast",
          "status": 1,
          "status_percentage": 1,
          "estimated_credit": 20
        }
      },
      {
        "segment_type": "BODY_1",
        "veo_response": {
          "id": 2589,
          "uuid": "d669b55d-d92d-22f1-99c5-0353bd231005",
          "model_name": "veo-3.1-fast",
          "status": 1,
          "status_percentage": 1,
          "estimated_credit": 20
        }
      }
    ],
    "polling_endpoint": "/functions/v1/check-video-status",
    "polling_interval_seconds": 5
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.videos` | array | Array of VEO responses (one per segment) |
| `data.videos[].segment_type` | string | Segment type for this video |
| `data.videos[].veo_response.id` | number | VEO internal ID |
| `data.videos[].veo_response.uuid` | string | UUID for polling status |
| `data.videos[].veo_response.model_name` | string | VEO model used |
| `data.videos[].veo_response.status` | number | 1=Processing, 2=Completed, 3=Failed |
| `data.videos[].veo_response.status_percentage` | number | Progress percentage |
| `data.videos[].veo_response.estimated_credit` | number | Credits consumed |
| `data.polling_endpoint` | string | Endpoint to poll for completion |
| `data.polling_interval_seconds` | number | Recommended polling interval |

**VEO Status Codes:**

| status | Meaning |
|--------|---------|
| 1 | Processing |
| 2 | Completed |
| 3 | Failed |

---

### Endpoint 4: POST /functions/v1/check-video-status

Poll VEO API to check video generation status and retrieve URLs when ready.

#### Request

**Headers:**
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "video_uuids": [
    "c558a44c-c91c-11f0-98b4-0242ac120004",
    "d669b55d-d92d-22f1-99c5-0353bd231005"
  ]
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "uuid": "c558a44c-c91c-11f0-98b4-0242ac120004",
        "status": 2,
        "status_percentage": 100,
        "video_url": "https://storage.geminigen.ai/videos/c558a44c-c91c-11f0-98b4-0242ac120004.mp4"
      },
      {
        "uuid": "d669b55d-d92d-22f1-99c5-0353bd231005",
        "status": 1,
        "status_percentage": 45,
        "video_url": null
      }
    ],
    "summary": {
      "total": 2,
      "completed": 1,
      "processing": 1,
      "failed": 0
    },
    "all_completed": false
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.videos` | array | Status of each requested video |
| `data.videos[].uuid` | string | Video UUID |
| `data.videos[].status` | number | 1=Processing, 2=Completed, 3=Failed |
| `data.videos[].status_percentage` | number | Progress percentage (0-100) |
| `data.videos[].video_url` | string/null | Video URL (null if not completed) |
| `data.summary.total` | number | Total videos requested |
| `data.summary.completed` | number | Number of completed videos |
| `data.summary.processing` | number | Number still processing |
| `data.summary.failed` | number | Number of failed videos |
| `data.all_completed` | boolean | True if all videos are completed |

---

## PART 2: PYTHON BACKEND (VPS)

### Base URL

```
Production: https://<your-vps-domain>/api
Development: http://localhost:8000/api
```

### Authentication

All Python Backend endpoints require API key authentication:

```http
X-API-Key: <backend_api_key>
```

---

### Endpoint 5: POST /api/combine-final-video

Combine all video segments and optionally add background music using FFmpeg.

**NOTE:** Video segments from VEO 3.1 already contain voiceover. This endpoint only handles video concatenation and optional background music mixing.

#### Request

**Headers:**
```http
X-API-Key: <backend_api_key>
Content-Type: application/json
```

**Body:**
```json
{
  "project_id": "uuid",
  "segments": [
    {
      "type": "HOOK",
      "video_url": "https://storage.geminigen.ai/videos/c558a44c.mp4",
      "duration_seconds": 6
    },
    {
      "type": "BODY_1",
      "video_url": "https://storage.geminigen.ai/videos/d669b55d.mp4",
      "duration_seconds": 8
    },
    {
      "type": "BODY_2",
      "video_url": "https://storage.geminigen.ai/videos/e770c66e.mp4",
      "duration_seconds": 8
    },
    {
      "type": "ENDING_CTA",
      "video_url": "https://storage.geminigen.ai/videos/f881d77f.mp4",
      "duration_seconds": 8
    }
  ],
  "options": {
    "bgm_url": "https://example.com/background-music.mp3",
    "bgm_volume": 0.15
  }
}
```

**Example Request (No BGM):**
```json
{
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "segments": [
    {
      "type": "HOOK",
      "video_url": "https://storage.geminigen.ai/videos/c558a44c.mp4",
      "duration_seconds": 6
    },
    {
      "type": "BODY_1",
      "video_url": "https://storage.geminigen.ai/videos/d669b55d.mp4",
      "duration_seconds": 8
    }
  ],
  "options": {
    "bgm_url": null,
    "bgm_volume": 0.15
  }
}
```

#### Processing Steps (Internal)

The backend performs these steps:

```
1. Download all video segments from provided URLs
2. Create FFmpeg concat file (concat.txt)
3. FFmpeg: Concatenate all segments into single video
4. (Optional) If bgm_url provided: Mix background music at specified volume
5. Upload final video to storage (Supabase Storage or S3)
6. Return final video URL and metadata
```

#### FFmpeg Commands Used

**Step 1: Create concat file (concat.txt)**
```text
file 'segment_0.mp4'
file 'segment_1.mp4'
file 'segment_2.mp4'
file 'segment_3.mp4'
```

**Step 2: Concatenate segments**
```bash
ffmpeg -y -f concat -safe 0 -i concat.txt -c copy final_video.mp4
```

**Step 3 (Optional): Add background music**
```bash
ffmpeg -y -i final_video.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.15[a1];[0:a][a1]amix=inputs=2:normalize=1" \
  -c:v copy -shortest final_with_bgm.mp4
```

#### Response (202 Accepted) - Processing Started

```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "processing",
    "estimated_time_seconds": 30,
    "polling_endpoint": "/api/job-status/job_xyz789"
  }
}
```

#### Response (200 OK) - Job Already Completed

```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "completed",
    "final_video_url": "https://storage.supabase.co/sparkfluence/final_videos/job_xyz789.mp4",
    "duration_seconds": 30,
    "file_size_mb": 12.5,
    "resolution": "720x1280",
    "format": "mp4",
    "codec": "h264"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.job_id` | string | Unique job identifier for polling |
| `data.status` | string | processing, completed, or failed |
| `data.estimated_time_seconds` | number | Estimated processing time |
| `data.polling_endpoint` | string | Endpoint to check job status |
| `data.final_video_url` | string | Final video URL (when completed) |
| `data.duration_seconds` | number | Total video duration |
| `data.file_size_mb` | number | File size in megabytes |
| `data.resolution` | string | Video resolution (e.g., "720x1280") |
| `data.format` | string | Video format |
| `data.codec` | string | Video codec used |

---

### Endpoint 6: GET /api/job-status/{job_id}

Check the status of a video combining job.

#### Request

**Headers:**
```http
X-API-Key: <backend_api_key>
```

**URL Parameters:**
- `job_id` (required): Job ID returned from `/api/combine-final-video`

**Example Request:**
```http
GET /api/job-status/job_xyz789
X-API-Key: your_api_key_here
```

#### Response (200 OK) - Processing

```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "processing",
    "progress_percentage": 75,
    "current_step": "Adding background music",
    "final_video_url": null,
    "error_message": null
  }
}
```

#### Response (200 OK) - Completed

```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "completed",
    "progress_percentage": 100,
    "current_step": "Upload complete",
    "final_video_url": "https://storage.supabase.co/sparkfluence/final_videos/job_xyz789.mp4",
    "error_message": null,
    "metadata": {
      "duration_seconds": 30,
      "file_size_mb": 12.5,
      "resolution": "720x1280",
      "format": "mp4",
      "codec": "h264"
    }
  }
}
```

#### Response (200 OK) - Failed

```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz789",
    "status": "failed",
    "progress_percentage": 45,
    "current_step": "Downloading segment 2",
    "final_video_url": null,
    "error_message": "Failed to download video from URL: Connection timeout"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data.job_id` | string | Job identifier |
| `data.status` | string | processing, completed, or failed |
| `data.progress_percentage` | number | Progress (0-100) |
| `data.current_step` | string | Description of current processing step |
| `data.final_video_url` | string/null | Final video URL (null until completed) |
| `data.error_message` | string/null | Error message (null if no error) |
| `data.metadata` | object | Video metadata (only when completed) |

---

## ERROR RESPONSES

### Edge Function Errors

All Supabase Edge Function errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT | RATE_LIMITED | API_ERROR | INTERNAL_ERROR",
    "message": "Human readable error message",
    "details": {}
  }
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `RATE_LIMITED` | 429 | Too many requests |
| `API_ERROR` | 502 | External API (Gemini, DALL-E, VEO) error |
| `INTERNAL_ERROR` | 500 | Internal server error |

#### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing required field: segments",
    "details": {
      "field": "segments",
      "expected": "array",
      "received": "undefined"
    }
  }
}
```

---

### Python Backend Errors

All Python Backend errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "DOWNLOAD_FAILED | FFMPEG_ERROR | UPLOAD_FAILED | INVALID_REQUEST",
    "message": "Human readable error message",
    "failed_step": "Step name where error occurred"
  }
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `JOB_NOT_FOUND` | 404 | Job ID not found |
| `DOWNLOAD_FAILED` | 500 | Failed to download video segments |
| `FFMPEG_ERROR` | 500 | FFmpeg processing error |
| `UPLOAD_FAILED` | 500 | Failed to upload final video |
| `INTERNAL_ERROR` | 500 | Internal server error |

#### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "DOWNLOAD_FAILED",
    "message": "Failed to download video from URL",
    "failed_step": "Downloading segment 2 (BODY_1)",
    "details": {
      "url": "https://storage.geminigen.ai/videos/d669b55d.mp4",
      "error": "Connection timeout after 30 seconds"
    }
  }
}
```

---

## COMPLETE WORKFLOW EXAMPLE

Here's a complete end-to-end workflow:

### Step 1: Generate Script

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate-script \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "topic",
    "content": "5 cara meningkatkan produktivitas",
    "duration": "30s",
    "platform": "tiktok",
    "language": "indonesian"
  }'
```

**Response:** 4 segments with scripts and visual directions

### Step 2: Generate Images

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate-images \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [...],
    "style": "cinematic",
    "aspect_ratio": "9:16",
    "provider": "huggingface"
  }'
```

**Response:** 4 image URLs (one per segment)
**Providers:** `huggingface` (FREE) or `openai` (Premium)

### Step 3: Generate Videos with VEO

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate-videos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [...],
    "images": [...],
    "language": "indonesian"
  }'
```

**Response:** 4 video UUIDs (status: processing)

### Step 4: Poll Video Status

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "video_uuids": ["uuid1", "uuid2", "uuid3", "uuid4"]
  }'
```

**Poll every 5 seconds until `all_completed: true`**

**Final Response:** 4 video URLs (all with voiceover from VEO)

### Step 5: Combine Final Video

```bash
curl -X POST https://<vps-domain>/api/combine-final-video \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "...",
    "segments": [
      {"type": "HOOK", "video_url": "...", "duration_seconds": 6},
      {"type": "BODY_1", "video_url": "...", "duration_seconds": 8},
      {"type": "BODY_2", "video_url": "...", "duration_seconds": 8},
      {"type": "ENDING_CTA", "video_url": "...", "duration_seconds": 8}
    ],
    "options": {
      "bgm_url": "https://example.com/music.mp3",
      "bgm_volume": 0.15
    }
  }'
```

**Response:** `job_id` for polling

### Step 6: Poll Job Status

```bash
curl -X GET https://<vps-domain>/api/job-status/{job_id} \
  -H "X-API-Key: <api_key>"
```

**Poll every 2-3 seconds until `status: "completed"`**

**Final Response:** Final video URL ready for download/publish

---

## NOTES AND IMPORTANT INFORMATION

### VEO 3.1 Built-in Voiceover

VEO 3.1 has **built-in voiceover capability**. When calling the VEO API:
- Include the `script_text` in the prompt
- Specify the language and emotional tone
- VEO will generate video WITH voice narration
- **No external TTS service is needed**

This significantly simplifies the workflow as no separate TTS generation and audio mixing is required.

### FFmpeg Processing (Simplified)

Since VEO 3.1 videos already include voiceover, the Python backend only needs to:
1. Download video segments (which already have voice)
2. Concatenate all segments
3. Optionally add background music at low volume

**No TTS generation or voice mixing is performed in the Python backend.**

### Polling Best Practices

**VEO Status Polling:**
- Poll `/functions/v1/check-video-status` every 5 seconds
- VEO videos typically take 30-60 seconds to generate
- Stop polling when `all_completed: true`

**FFmpeg Job Polling:**
- Poll `/api/job-status/{job_id}` every 2-3 seconds
- FFmpeg processing typically takes 10-30 seconds
- Stop polling when `status: "completed"` or `status: "failed"`

### Rate Limits

**Supabase Edge Functions:**
- 500 requests per minute per IP (default)
- Can be increased in Supabase settings

**Python Backend:**
- Custom rate limits (configure in backend)
- Recommended: 100 requests per minute per API key

**External APIs:**
- **Gemini AI:** 60 requests per minute (free tier)
- **HuggingFace FLUX:** Free tier limits apply
- **DALL-E:** 50 images per minute
- **VEO 3.1:** 100 requests per minute, 1000 per day

---

**Document Version:** 1.0
**Last Updated:** 2025-12-06
**Next Review:** Phase 4 Implementation

**End of API Contracts Documentation**
