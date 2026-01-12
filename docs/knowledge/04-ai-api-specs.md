# AI API Specifications

## Provider Overview

| Service | Provider | Model | Cost |
|---------|----------|-------|------|
| **Script LLM** | Google | Gemini 2.0 Flash | FREE |
| **Embeddings** | Google | text-embedding-004 | FREE |
| **Transcription** | Groq | Whisper | FREE |
| **Images** | fal.ai | nano-banana-pro, wan/v2.6 | ~$0.02/img |
| **Video** | GeminiGen | VEO 3.1, Sora 2 | ~$0.10-0.50/s |

---

## Image Generation (fal.ai)

### Model Selection

| Segment Type | Model | Style | Reference |
|--------------|-------|-------|-----------|
| HOOK, CTA, LOOP-END | `nano-banana-pro` | Portrait Cinematic | ✅ Avatar URL |
| FORE, BODY, PEAK | `wan/v2.6` | Native cinematic | ❌ No face |

### nano-banana-pro (CREATOR Shots)

```typescript
// Endpoint
POST https://fal.run/fal-ai/nano-banana-pro

// Headers
Authorization: Key {key_id}:{key_secret}
Content-Type: application/json

// Request
{
  prompt: string,
  image_size: { width: 1024, height: 1792 },
  num_inference_steps: 25,        // 18-50
  guidance_scale: 5.0,            // 0-20
  style: "Portrait Cinematic",    // see style list
  image_url: "https://...",       // reference image
  output_format: "png"
}

// Response
{
  images: [{ url: string, width: number, height: number }],
  seed: number
}
```

**Style Presets:** None, Photorealistic, Portrait, Portrait Cinematic, Portrait Fashion, Ray Traced, Dynamic, Creative, 3D Render, Stock Photo

### wan/v2.6 (B-ROLL Shots)

```typescript
// Endpoint
POST https://fal.run/wan/v2.6/text-to-image

// Request
{
  prompt: string,
  negative_prompt: string,        // REQUIRED for B-roll
  image_size: { width: 1024, height: 1792 },
  num_inference_steps: 30,        // 2-40
  guidance_scale: 6.0,            // 0-20
  shift: 5.0,                     // 0-10
  sampler: "unipc",
  output_format: "png"
}
```

**Standard Negative Prompt:**
```
blurry, low quality, distorted, artifacts, human face, person, 
text, watermark, logo, cartoon, anime, illustration, painting, 
oversaturated, underexposed, flat lighting
```

### Fallback Chain

```
CREATOR: nano-banana-pro → GPT-Image-1 → FLUX
B-ROLL:  wan/v2.6 → nano-banana-pro → FLUX
```

### Quality Parameters

| Parameter | Safe Range | Notes |
|-----------|------------|-------|
| guidance_scale | 5.0-7.0 | Higher = more adherence |
| inference_steps | 18-30 | Higher = better quality |
| shift (wan) | 5.0 | Temporal dynamics |

---

## Video Generation (GeminiGen.AI)

### Platform Selection

| Condition | Platform | Model | Max |
|-----------|----------|-------|-----|
| ≤8s, lip-sync critical | VEO 3.1 | `veo-3.1-fast` | 8s |
| >8s narrative | Sora 2 | `sora-2` | 15s |
| Long-form | Sora 2 Pro | `sora-2-pro` | 25s |
| Premium 1080p | Sora 2 Pro HD | `sora-2-pro-hd` | 15s |

### VEO 3.1 Fast (DEFAULT)

```typescript
// Endpoint
POST https://api.geminigen.ai/uapi/v1/video-gen/veo

// Headers
x-api-key: {VEO_API_KEY}
Content-Type: multipart/form-data

// FormData
prompt: string
model: "veo-3.1-fast"
duration: "4" | "6" | "8"
aspect_ratio: "9:16" | "16:9"
resolution: "720p" | "1080p"
ref_images: string              // Image URL
```

### Sora 2

```typescript
// Endpoint
POST https://api.geminigen.ai/uapi/v1/video-gen/sora

// FormData
prompt: string
model: "sora-2" | "sora-2-pro" | "sora-2-pro-hd"
duration: "10" | "15" | "25"
aspect_ratio: "portrait" | "landscape"
resolution: "small" | "medium"  // 720p | 1080p
file_urls: string               // Image URL
```

### Resolution Rules

| Aspect | VEO 3.1 | Sora 2 |
|--------|---------|--------|
| 9:16 | 720p | 720p |
| 16:9 | 1080p | 720p/1080p |

### Dialogue Word Limits (CRITICAL)

| Duration | Max Words | Calculation |
|----------|-----------|-------------|
| 4s | 7 | 130 WPM × 4s × 0.80 |
| 6s | 10 | 130 WPM × 6s × 0.80 |
| 8s | 14 | 130 WPM × 8s × 0.80 |
| 10s | 17 | 130 WPM × 10s × 0.80 |
| 15s | 26 | 130 WPM × 15s × 0.80 |
| 25s | 43 | 130 WPM × 25s × 0.80 |

### Audio Directive (MANDATORY)

```
AUDIO:
Ambient: [environment sound]
Dialogue: [Character] says: "[script within limit]"
Voice style: [tone], natural [language] accent
Exclude: no subtitles, no audience sounds, no background music
```

### Voice Character Anchor

```typescript
// Generate ONCE per session
const voiceCharacter = {
  description: "Indonesian male voice, 30-35 years old",
  accent: "Jakarta Indonesian, natural",
  tone: "warm, friendly, enthusiastic, Gen-Z energy",
  pace: "medium-fast, conversational"
}
// Store in job records for consistency
```

### Job Status Codes

| Code | Status | Action |
|------|--------|--------|
| 0 | Pending | Wait |
| 1 | Processing | Poll |
| 2 | Completed | Download |
| 3 | Failed | Retry/fallback |

---

## Script LLM (Gemini)

```typescript
// Endpoint
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

// Headers
x-goog-api-key: {GEMINI_API_KEY}
Content-Type: application/json

// Request
{
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
    responseMimeType: "application/json"
  }
}
```

### Fallback: OpenRouter

```typescript
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer {OPENROUTER_API_KEY}

{
  model: "meta-llama/llama-3.3-70b-instruct:free",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
}
```

---

## Embeddings (Gemini)

```typescript
POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent

{
  content: { parts: [{ text: inputText }] },
  taskType: "RETRIEVAL_DOCUMENT"  // or RETRIEVAL_QUERY
}

// Response
{ embedding: { values: number[] } }  // 768 dimensions
```

---

## Transcription (Groq Whisper)

```typescript
POST https://api.groq.com/openai/v1/audio/transcriptions
Authorization: Bearer {GROQ_API_KEY}
Content-Type: multipart/form-data

// FormData
file: audioFile
model: "whisper-large-v3-turbo"
response_format: "verbose_json"
timestamp_granularities: ["word"]

// Response includes word-level timestamps
```

---

## BGM/SFX (Pixabay)

```typescript
GET https://pixabay.com/api/videos/music/
  ?key={PIXABAY_API_KEY}
  &q={mood}
  &category=music
  &per_page=10
```

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI - Script
GEMINI_API_KEY=xxx
OPENROUTER_API_KEY=xxx

# AI - Images
FAL_AI_API_KEY=key_id:key_secret

# AI - Video
VEO_API_KEY=xxx

# AI - Transcription
GROQ_API_KEY=xxx

# Audio
PIXABAY_API_KEY=xxx
```

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Invalid API key | Check key format |
| 400 | Invalid params | Validate input |
| 429 | Rate limited | Backoff + retry |
| timeout | Long generation | Poll with intervals |

---

## Rate Limits

| Service | Limit |
|---------|-------|
| Gemini | 15 RPM (free) |
| Groq Whisper | 14,400 req/day |
| fal.ai | Per account |
| GeminiGen | Per account |
