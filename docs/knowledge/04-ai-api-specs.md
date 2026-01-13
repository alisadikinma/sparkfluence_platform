# AI API Specifications

## Provider Overview

| Service | Provider | Model | Cost |
|---------|----------|-------|------|
| **Script LLM** | Google | Gemini 2.0 Flash | FREE |
| **Embeddings** | Google | text-embedding-004 | FREE |
| **Transcription** | Groq | Whisper | FREE |
| **Images** | fal.ai | nano-banana-pro/edit, seedream-v4, qwen-image | ~$0.02-0.15/img |
| **Video** | fal.ai | Kling 2.5 Turbo, Wan 2.5 | ~$0.05-0.15/video |
| **TTS** | fal.ai | Chatterbox Turbo | ~$0.01/audio |
| **Music** | fal.ai | Minimax Music v2 | ~$0.05/track |

---

## Image Generation (fal.ai)

### Model Selection

| Segment Type | Model | Style | Reference |
|--------------|-------|-------|-----------|
| HOOK, CTA, LOOP-END | `nano-banana/edit` | Multi-reference | ✅ image_urls array |
| FORE, BODY, PEAK | `seedream-v4` or `qwen-image` | Text-to-image | ❌ No face |

### nano-banana/edit (CREATOR Shots - Face Consistency)

```typescript
// Endpoint
POST https://fal.run/fal-ai/nano-banana/edit

// Headers
Authorization: Key {FAL_AI_API_KEY}
Content-Type: application/json

// Request
{
  prompt: string,                    // Edit instruction
  image_urls: string[],              // Reference images (up to 14)
  num_images: 1,                     // 1-4
  aspect_ratio: "9:16",              // auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16
  output_format: "png",              // jpeg, png, webp
  limit_generations: false           // Set true to limit to 1 per prompt
}

// Response
{
  images: [{ url: string, file_name: string, content_type: string }],
  description: string
}
```

**Use Case:** CREATOR shots needing face consistency. Pass avatar reference in `image_urls` array.

### Seedream v4 (B-ROLL - High Quality Text-to-Image)

```typescript
// Endpoint
POST https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image

// Request
{
  prompt: string,
  image_size: { width: 1024, height: 1792 },  // 1024-4096
  num_images: 1,                               // 1-6
  max_images: 1,                               // Multi-image per gen (1-6)
  seed: number,                                // Optional for reproducibility
  enable_safety_checker: true,
  enhance_prompt_mode: "standard"              // standard | fast
}

// Response
{
  images: [{ url: string }],
  seed: number
}
```

**Use Case:** B-ROLL with excellent text rendering. Default 2048x2048. Supports up to 4096px.

### Qwen Image (B-ROLL - Turbo Mode Available)

```typescript
// Endpoint
POST https://fal.run/fal-ai/qwen-image

// Request
{
  prompt: string,
  negative_prompt: "blurry, ugly, human face, person",  // SUPPORTED!
  image_size: "portrait_3_4",                           // or custom { width, height }
  num_inference_steps: 30,                              // 2-250
  guidance_scale: 2.5,                                  // 0-20
  num_images: 1,                                        // 1-4
  output_format: "png",
  acceleration: "none",                                 // none | regular | high
  use_turbo: false,                                     // Faster with optimized settings
  loras: []                                             // Up to 3 LoRAs
}

// Response
{
  images: [{ url: string, width: number, height: number }],
  seed: number,
  has_nsfw_concepts: boolean[]
}
```

**Use Case:** B-ROLL with negative prompt support. Turbo mode for speed. LoRA support for style.

### FLUX Kontext Pro (Image Editing)

```typescript
// Endpoint
POST https://fal.run/fal-ai/flux-pro/kontext

// Request
{
  prompt: string,                  // Edit instruction
  image_url: string,               // Single reference image
  guidance_scale: 3.5,             // 1-20
  num_images: 1,                   // 1-4
  aspect_ratio: "9:16",            // 21:9, 16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16, 9:21
  output_format: "jpeg",
  safety_tolerance: "2"            // 1-6 (1=strictest)
}

// Response
{
  images: [{ url: string, width: number, height: number }],
  seed: number,
  has_nsfw_concepts: boolean[]
}
```

**Use Case:** Targeted local edits, scene transformations with single reference.

### Fallback Chain

```
CREATOR: nano-banana/edit → flux-kontext → qwen-image
B-ROLL:  seedream-v4 → qwen-image → nano-banana
```

### Image Model Comparison

| Model | Reference Image | Negative Prompt | Max Size | Best For |
|-------|-----------------|-----------------|----------|----------|
| nano-banana/edit | ✅ Array (14) | ❌ | 1792px | Face consistency |
| seedream-v4 | ❌ | ❌ | 4096px | High-res, text rendering |
| qwen-image | ❌ | ✅ | 1024px | B-roll, turbo speed |
| flux-kontext | ✅ Single | ❌ | 1024px | Scene editing |

---

## Video Generation (fal.ai)

### Platform Selection

| Condition | Model | Max Duration | Resolution |
|-----------|-------|--------------|------------|
| Default, short clips | Kling 2.5 Turbo | 5s/10s | Auto |
| Longer narratives | Wan 2.5 | 5s/10s | 480p/720p/1080p |
| With background audio | Wan 2.5 | 5s/10s | 1080p |

### Kling 2.5 Turbo (DEFAULT)

```typescript
// Endpoint
POST https://fal.run/fal-ai/kling-video/v2.5-turbo/standard/image-to-video

// Headers
Authorization: Key {FAL_AI_API_KEY}
Content-Type: application/json

// Request
{
  prompt: string,                              // Motion description
  image_url: string,                           // Reference image URL
  duration: "5" | "10",                        // Default: "5"
  negative_prompt: "blur, distort, low quality",
  cfg_scale: 0.5                               // 0-1 (default 0.5)
}

// Response
{
  video: { url: string }
}
```

**Strengths:** Top-tier motion fluidity, cinematic visuals, excellent prompt precision.

### Wan 2.5 (With Audio Support)

```typescript
// Endpoint
POST https://fal.run/fal-ai/wan-25-preview/image-to-video

// Request
{
  prompt: string,                              // Max 800 chars
  image_url: string,                           // Reference image
  audio_url: string,                           // Optional BGM (WAV/MP3, 3-30s, max 15MB)
  resolution: "1080p",                         // 480p | 720p | 1080p
  duration: "5" | "10",
  negative_prompt: "low resolution, error, worst quality",
  enable_prompt_expansion: true,               // LLM enhances prompt
  seed: number,                                // Optional
  enable_safety_checker: true
}

// Response
{
  video: { url: string, content_type: string },
  seed: number,
  actual_prompt: string                        // If prompt expansion enabled
}
```

**Strengths:** 1080p support, audio integration, prompt expansion via LLM.

### Video Model Comparison

| Model | Duration | Resolution | Audio | Negative Prompt | Seed |
|-------|----------|------------|-------|-----------------|------|
| Kling 2.5 Turbo | 5s/10s | Auto | ❌ | ✅ | ❌ |
| Wan 2.5 | 5s/10s | Up to 1080p | ✅ | ✅ | ✅ |

### Dialogue Word Limits (CRITICAL)

| Duration | Max Words | Calculation |
|----------|-----------|-------------|
| 5s | 9 | 130 WPM × 5s × 0.80 |
| 10s | 17 | 130 WPM × 10s × 0.80 |

### Video Prompt Template

```
[VIDEO GENERATION]

Duration: ~[N]s
Resolution: [480p/720p/1080p]

CAMERA MOTION
[Movement description - push-in, orbit, tracking, static]

SUBJECT MOTION
[What the subject does - expressions, gestures, movement]

AMBIENT MOTION
[Environmental motion - particles, lighting shifts]

NEGATIVE
blur, distort, low quality, artifacts
```

---

## Text-to-Speech (fal.ai)

### Chatterbox Turbo

```typescript
// Endpoint
POST https://fal.run/fal-ai/chatterbox/text-to-speech/turbo

// Headers
Authorization: Key {FAL_AI_API_KEY}
Content-Type: application/json

// Request
{
  text: string,                    // Text with paralinguistic tags
  voice: "lucy",                   // Preset voice (see list below)
  audio_url: string,               // Optional: 5-10s audio for voice cloning
  temperature: 0.8,                // 0.05-2 (higher = more varied)
  seed: number                     // 0 = random
}

// Response
{
  audio: { url: string }           // WAV file URL
}
```

### Preset Voices (20 available)

```
aaron, abigail, anaya, andy, archer,
brian, chloe, dylan, emmanuel, ethan,
evelyn, gavin, gordon, ivan, laura,
lucy, madison, marisol, meera, walter
```

### Paralinguistic Tags

Use inline tags to control emotion and breathing:

```
[clear throat], [sigh], [shush], [cough],
[groan], [sniff], [gasp], [chuckle], [laugh]
```

**Example:**
```
"Oh, that's hilarious! [chuckle] I can't believe it worked!"
```

### Voice Cloning

For consistent voice across videos, provide 5-10 second audio sample via `audio_url`:

```typescript
{
  text: "Gue mau kasih tau lo rahasia...",
  audio_url: "https://storage.example.com/creator-voice-sample.wav",
  temperature: 0.7
}
```

---

## Music Generation (fal.ai)

### Minimax Music v2

```typescript
// Endpoint
POST https://fal.run/fal-ai/minimax-music/v2

// Headers
Authorization: Key {FAL_AI_API_KEY}
Content-Type: application/json

// Request
{
  prompt: string,                  // Style/mood description (10-300 chars)
  lyrics_prompt: string,           // Lyrics with structure tags (10-3000 chars)
  audio_setting: {}                // Optional audio config
}

// Response
{
  audio: { url: string }           // MP3 file URL
}
```

### Prompt Format

**prompt:** Describe style, mood, scenario (10-300 chars)
```
"Indie folk, melancholic, introspective, longing, solitary walk, coffee shop"
```

**lyrics_prompt:** Lyrics with optional structure tags (10-3000 chars)
```
[verse]
Streetlights flicker, the night breeze sighs
Shadows stretch as I walk alone

[chorus]
Pushing the wooden door, the aroma spreads
In a familiar corner, a stranger gazes
```

### Structure Tags

```
[Intro], [Verse], [Chorus], [Bridge], [Outro]
```

### Use Cases

| Scenario | Prompt Style |
|----------|--------------|
| Upbeat hook | "Pop, energetic, catchy, viral TikTok, modern" |
| Emotional body | "Lo-fi, chill, introspective, late night study" |
| CTA urgency | "EDM, building energy, climactic, drop incoming" |

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

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI - Script
GEMINI_API_KEY=xxx
OPENROUTER_API_KEY=xxx

# AI - fal.ai (Images, Video, TTS, Music)
FAL_AI_API_KEY=key_id:key_secret

# AI - Transcription
GROQ_API_KEY=xxx
```

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Invalid API key | Check key format (key_id:key_secret for fal.ai) |
| 400 | Invalid params | Validate input against schema |
| 429 | Rate limited | Backoff + retry |
| timeout | Long generation | Use polling with fal_client.subscribe |

---

## Rate Limits

| Service | Limit |
|---------|-------|
| Gemini | 15 RPM (free) |
| Groq Whisper | 14,400 req/day |
| fal.ai | Per account (check dashboard) |

---

## fal.ai Client Usage

### JavaScript/TypeScript

```typescript
import { fal } from "@fal-ai/client";

// Subscribe pattern (recommended for long-running tasks)
const result = await fal.subscribe("fal-ai/kling-video/v2.5-turbo/standard/image-to-video", {
  input: {
    prompt: "The character smiles warmly...",
    image_url: "https://...",
    duration: "5"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map(log => log.message).forEach(console.log);
    }
  },
});

console.log(result.data.video.url);
```

### Python

```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
    arguments={
        "prompt": "The character smiles warmly...",
        "image_url": "https://...",
        "duration": "5"
    },
    with_logs=True
)

print(result["video"]["url"])
```

### cURL (Direct API)

```bash
curl --request POST \
  --url https://fal.run/fal-ai/kling-video/v2.5-turbo/standard/image-to-video \
  --header "Authorization: Key $FAL_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "prompt": "The character smiles warmly...",
    "image_url": "https://...",
    "duration": "5"
  }'
```
