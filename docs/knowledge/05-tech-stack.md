# Tech Stack Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SPARKFLUENCE STACK                       │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND          │  React 18 + TypeScript + Vite          │
│  STYLING           │  Tailwind CSS + Shadcn UI              │
│  BACKEND           │  Supabase (Postgres + Edge Functions)  │
│  VIDEO PROCESSING  │  Python FastAPI + FFmpeg               │
│  STORAGE           │  Supabase Storage                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Supabase

### Database Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Table | snake_case | `video_jobs` |
| Trigger | `trg_{table}_set_updated_at` | `trg_video_jobs_set_updated_at` |
| Function | `trg_fn_{table}_set_updated_at()` | `trg_fn_video_jobs_set_updated_at()` |
| Index | `idx_{table}_{column}` | `idx_video_jobs_user_id` |
| RLS Policy | `{action}_{role}_{table}` | `select_authenticated_video_jobs` |

### RLS Pattern (MANDATORY)

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- User can only access own data
CREATE POLICY "select_authenticated_table"
ON table_name FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert_authenticated_table"
ON table_name FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_authenticated_table"
ON table_name FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_authenticated_table"
ON table_name FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

### Common Queries

```typescript
// Select with filter
const { data, error } = await supabase
  .from('video_jobs')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 2)
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('video_jobs')
  .insert({ user_id: userId, topic: topic, status: 0 })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('video_jobs')
  .update({ status: 2, video_url: url })
  .eq('id', jobId);

// Upsert
const { error } = await supabase
  .from('user_settings')
  .upsert({ user_id: userId, language: 'id' }, { onConflict: 'user_id' });
```

### Vector Search (pgvector)

```sql
-- Create embedding column
ALTER TABLE knowledge ADD COLUMN embedding vector(768);

-- Create index
CREATE INDEX idx_knowledge_embedding 
ON knowledge USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Search function
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, content text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) as similarity
  FROM knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Job Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | pending | Job created, awaiting processing |
| 1 | processing | Currently being processed |
| 2 | completed | Successfully finished |
| 3 | failed | Error occurred |

---

## Deno Edge Functions

### Standard Template

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { topic, language } = await req.json();

    // Your logic here
    const result = await processRequest(topic, language);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: error.message } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Critical Rules

| Rule | Reason |
|------|--------|
| ❌ Cannot import .md files | Use .ts with exported strings |
| ✅ Use Deno.env.get() | Access secrets |
| ✅ Always return CORS headers | Cross-origin requests |
| ✅ Handle OPTIONS method | Preflight requests |

### Secrets Setup

```bash
# Set secrets via CLI
supabase secrets set GEMINI_API_KEY=xxx
supabase secrets set FAL_AI_API_KEY=xxx
supabase secrets set VEO_API_KEY=xxx

# In function
const apiKey = Deno.env.get('GEMINI_API_KEY');
```

### Response Format

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } }
```

---

## React 18 + TypeScript

### Component Pattern

```typescript
interface Props {
  jobId: string;
  onComplete: (url: string) => void;
}

export const VideoPlayer: React.FC<Props> = ({ jobId, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch logic
  }, [jobId]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;

  return <video src={videoUrl} controls />;
};
```

### Auth Hook Pattern

```typescript
import { useAuth } from '@/hooks/useAuth';

export const ProtectedPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return <Dashboard user={user} />;
};
```

### Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Query Hook Pattern

```typescript
import { useQuery } from '@tanstack/react-query';

export const useVideoJobs = (userId: string) => {
  return useQuery({
    queryKey: ['video-jobs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
};
```

### Form Pattern (react-hook-form + zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  topic: z.string().min(3).max(200),
  language: z.enum(['id', 'hi', 'en']),
});

type FormData = z.infer<typeof schema>;

export const ScriptForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('topic')} error={errors.topic?.message} />
      <Select {...register('language')} options={languageOptions} />
      <Button type="submit">Generate</Button>
    </form>
  );
};
```

---

## Python Backend (FastAPI)

### Basic Structure

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import asyncio

app = FastAPI()

class VideoRequest(BaseModel):
    job_id: str
    segments: list[dict]

@app.post("/process-video")
async def process_video(request: VideoRequest, background_tasks: BackgroundTasks):
    # Add to background queue
    background_tasks.add_task(process_video_job, request.job_id, request.segments)
    return {"status": "queued", "job_id": request.job_id}

async def process_video_job(job_id: str, segments: list):
    # Processing logic
    pass
```

### Async Pattern

```python
import aiohttp
import asyncio

async def fetch_video(url: str) -> bytes:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.read()

async def process_multiple(urls: list[str]) -> list[bytes]:
    tasks = [fetch_video(url) for url in urls]
    return await asyncio.gather(*tasks)
```

---

## FFmpeg Commands

### Concatenate Segments with Transitions

```bash
ffmpeg -i segment1.mp4 -i segment2.mp4 -i segment3.mp4 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    [v01][2:v]xfade=transition=fade:duration=0.5:offset=9[vout];
    [0:a][1:a]acrossfade=d=0.5[a01];
    [a01][2:a]acrossfade=d=0.5[aout]
  " \
  -map "[vout]" -map "[aout]" output.mp4
```

### Burn Subtitles (ASS)

```bash
ffmpeg -i input.mp4 -vf "ass=subtitles.ass" \
  -c:a copy output.mp4
```

### Mix Voice + BGM with Ducking

```bash
ffmpeg -i voice.mp3 -i bgm.mp3 \
  -filter_complex "
    [1:a]volume=0.3[bgm];
    [0:a][bgm]amix=inputs=2:duration=first[aout]
  " \
  -map "[aout]" output.mp3
```

### Audio Normalization

```bash
ffmpeg -i input.mp4 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy output.mp4
```

### ASS Subtitle Style (Gen-Z)

```
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,2,2,50,50,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.50,Default,,0,0,0,,{\fad(150,150)}Pertama
Dialogue: 0,0:00:01.50,0:00:02.80,Default,,0,0,0,,{\fad(150,150)}lo
Dialogue: 0,0:00:02.80,0:00:04.00,Default,,0,0,0,,{\fad(150,150)}harus
```

---

## File Structure

```
sparkfluence_platform/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn components
│   │   └── features/        # Feature components
│   ├── hooks/
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   ├── types/
│   │   └── database.ts      # Generated types
│   └── App.tsx
├── supabase/
│   ├── functions/
│   │   ├── generate-script/
│   │   ├── generate-images/
│   │   └── generate-videos/
│   └── migrations/
├── backend/
│   ├── main.py
│   └── processors/
│       └── video.py
└── docs/
    └── knowledge/
```

---

## Deployment Checklist

### Edge Functions
```bash
supabase functions deploy generate-script
supabase functions deploy generate-images
supabase functions deploy generate-videos
```

### Database Migrations
```bash
supabase db push
# or
supabase migration up
```

### Python Backend (Docker)
```bash
docker build -t sparkfluence-backend .
docker run -p 8000:8000 sparkfluence-backend
```

---

## Common Debugging

| Issue | Check |
|-------|-------|
| Edge Function 500 | Deno.env.get() secrets present? |
| CORS error | OPTIONS handler + headers? |
| RLS blocking | Policy for authenticated user? |
| Video not playing | Storage bucket public? |
| Auth not working | ANON key in frontend? |
