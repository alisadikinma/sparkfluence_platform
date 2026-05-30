# Sparkfluence v2.0 - Implementation Plan

## Executive Summary

Comprehensive update untuk Sparkfluence platform berdasarkan V2_TECHNICAL_SPEC.md:
- **Remove model selectors** dari ScriptLab & TopicSelection
- **Add Order ID system** (SF-YYYYMMDD-XXXX) untuk tracking project
- **Rename VideoEditor → ImageGeneration** dengan multi-image gallery
- **Image analysis** via Gemini Vision API untuk auto-generate video prompts
- **Voice recording** (2-minute minimum) di Onboarding + Profile
- **Create 6 new Edge Functions** + update 3 existing

**Total Effort**: 19-28 hours (2.5-3.5 hari kerja)

---

## Critical Files Map

### Backend (Database & Edge Functions)
```
supabase/
├── migrations/
│   └── 20260113_v2_schema_updates.sql          [NEW - Database updates]
└── functions/
    ├── _shared/config/
    │   └── modelCapabilities.ts                [NEW - Model specs dari API docs]
    ├── search-stock-images/index.ts            [NEW - Unsplash/Pexels]
    ├── analyze-image/index.ts                  [NEW - Gemini Vision]
    ├── generate-video-prompt/index.ts          [NEW - Auto prompt dari image]
    ├── generate-images/index.ts                [UPDATE - Multi-image support]
    ├── generate-script/index.ts                [UPDATE - Remove model param]
    └── generate-videos/index.ts                [UPDATE - Image-based prompts]
```

### Frontend (Screens & Components)
```
src/
├── index.tsx                                    [UPDATE - Route rename]
├── lib/
│   └── orderIdGenerator.ts                     [NEW - Order ID utils]
├── screens/
│   ├── ScriptLab/ScriptLab.tsx                 [UPDATE - Remove MODEL_OPTIONS]
│   ├── TopicSelection/TopicSelection.tsx       [UPDATE - Remove MODEL_OPTIONS]
│   ├── ImageGeneration/                        [RENAME dari VideoEditor/]
│   │   └── ImageGeneration.tsx                 [MAJOR REFACTOR - Multi-image]
│   ├── VideoGeneration/VideoGeneration.tsx     [UPDATE - Image analysis]
│   ├── Onboarding/Onboarding.tsx               [UPDATE - Add voice step]
│   └── Settings/Profile.tsx                    [UPDATE - Voice re-upload]
└── components/features/
    ├── ImageGeneration/
    │   ├── SegmentImageGallery.tsx             [NEW - Multi-image grid]
    │   ├── RegeneratePopup.tsx                 [NEW - Notes + reference]
    │   ├── StockImageModal.tsx                 [NEW - Search + upload]
    │   └── ImageModelSelector.tsx              [NEW - Header selector]
    ├── VideoGeneration/
    │   ├── VideoPromptEditor.tsx               [NEW - Show + edit prompt]
    │   └── VideoModelSelector.tsx              [NEW - Wan 2.5 / Kling 2.5]
    └── VoiceRecorder/
        ├── VoiceRecorder.tsx                   [NEW - 2-min recording]
        └── AudioWaveform.tsx                   [NEW - Visual feedback]
```

---

## Implementation Phases

### PHASE 0: Pre-Implementation (1-2 hours) ⚠️ **DO THIS FIRST**

#### 0.1 Read API Documentation
**Location**: `D:\Projects\fal_ai_model\`

**CRITICAL**: Read ALL MDs sebelum implement Edge Functions:

**Image Models** (4 MDs):
- [ ] `image/FLUX.1 Kontext [pro] _Image to Image _ fal.ai.md`
- [ ] `image/Nano Banana _Image to Image _fal.ai.md`
- [ ] `image/Bytedance Seedream v4 _Text to Image _ fal.ai.md`
- [ ] `image/Qwen Image _ Text to Image _ fal.ai.md`

**Video Models** (2 MDs):
- [ ] `video/Wan 2.5 Image to Video _Image to Video _fal.ai.md`
- [ ] `video/Kling Video _ Image to Video _ fal.ai.md`

**Audio Models** (2 MDs):
- [ ] `Chatterbox Turbo _Text to Speech _ fal.ai.md`
- [ ] `Minimax Music _Text to Audio _ fal.ai.md`

**Extract dari setiap doc**:
| Info | Note |
|------|------|
| Endpoint URL | Base URL + path |
| Seed support? | Yes/No, range (min-max) |
| Negative prompt? | Yes/No |
| Required fields | Mandatory params |
| Optional fields | Extra params |
| Rate limits | Requests per minute |
| Image size options | Width x Height variants |
| Duration options | For video/audio models |

#### 0.2 Create Model Capabilities Config

**File**: `supabase/functions/_shared/config/modelCapabilities.ts`

```typescript
export const MODEL_CAPABILITIES = {
  // Fill after reading API Docs
  'flux-pro/kontext': {
    endpoint: 'https://...',
    supports_seed: false,        // Update after checking
    supports_negative: false,    // Update after checking
    seed_range: [0, 0],
    image_sizes: [],
    price_per_image: 0.04,
  },
  // ... other models
};
```

#### 0.3 Environment Variables Check

Verify `.env` has:
```bash
# Existing
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
GEMINI_API_KEY=xxx
FAL_AI_API_KEY=xxx

# NEW - Need to obtain
UNSPLASH_ACCESS_KEY=xxx
PEXELS_API_KEY=xxx
```

---

### PHASE 1: Database Schema (1-2 hours) 🔒 **ASK PERMISSION**

#### 1.1 Create Migration File

**File**: `supabase/migrations/20260113_v2_schema_updates.sql`

```sql
-- Order ID for project tracking
ALTER TABLE generation_sessions
  ADD COLUMN order_id VARCHAR(20) UNIQUE NOT NULL DEFAULT '';

CREATE INDEX idx_generation_sessions_order_id
  ON generation_sessions(order_id);

-- Multi-image support (remove UNIQUE constraint on session+segment)
ALTER TABLE image_generation_jobs
  DROP CONSTRAINT IF EXISTS image_generation_jobs_session_id_segment_number_key;

-- Add multi-image columns
ALTER TABLE image_generation_jobs
  ADD COLUMN seed BIGINT,
  ADD COLUMN regeneration_note TEXT,
  ADD COLUMN source_type VARCHAR(20) DEFAULT 'generated',
  ADD COLUMN generation_number INTEGER DEFAULT 1,
  ADD COLUMN is_selected BOOLEAN DEFAULT FALSE;

-- Voice reference duration
ALTER TABLE user_profiles
  ADD COLUMN voice_reference_duration_seconds INTEGER;

-- Stock image search history
CREATE TABLE stock_image_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES generation_sessions(id) ON DELETE CASCADE,
  segment_number INTEGER,
  keyword VARCHAR(255),
  provider VARCHAR(20), -- 'unsplash' | 'pexels'
  results_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_searches_user ON stock_image_searches(user_id);
CREATE INDEX idx_stock_searches_session ON stock_image_searches(session_id);
```

#### 1.2 Test Migration Locally

```batch
cd D:\Projects\sparkfluence_platform
supabase db reset
supabase db diff
```

**Verify**:
- [ ] `generation_sessions.order_id` column exists
- [ ] `image_generation_jobs` can have multiple rows per segment
- [ ] `user_profiles.voice_reference_duration_seconds` exists
- [ ] `stock_image_searches` table created

---

### PHASE 2: Order ID System (1 hour)

#### 2.1 Create Order ID Utilities

**File**: `src/lib/orderIdGenerator.ts`

```typescript
/**
 * Generate unique Order ID: SF-YYYYMMDD-XXXX
 * Example: SF-20260113-A3X9
 */
export function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${date}-${random}`;
}

/**
 * Validate Order ID format
 */
export function isValidOrderId(orderId: string): boolean {
  return /^SF-\d{8}-[A-Z0-9]{4}$/.test(orderId);
}

/**
 * Extract date from Order ID
 */
export function getOrderIdDate(orderId: string): Date | null {
  if (!isValidOrderId(orderId)) return null;
  const dateStr = orderId.split('-')[1]; // "20260113"
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return new Date(`${year}-${month}-${day}`);
}
```

#### 2.2 Update ScriptLab.tsx

**File**: `src/screens/ScriptLab/ScriptLab.tsx`

**Changes**:
```typescript
import { generateOrderId } from '@/lib/orderIdGenerator';

// After script generation success (around line 119)
const orderId = generateOrderId();

// Save to database
const { error: sessionError } = await supabase
  .from('generation_sessions')
  .update({ order_id: orderId })
  .eq('id', sessionId);

// Pass to navigation
navigate('/image-generation', {
  state: {
    sessionId,
    orderId,  // NEW
    segments,
    // ... other data
  }
});
```

**Display Order ID**:
```tsx
{orderId && (
  <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-mono">
    Order ID: {orderId}
  </div>
)}
```

#### 2.3 Update TopicSelection.tsx

Same changes as ScriptLab.tsx (around line 490).

---

### PHASE 3: Remove Model Selectors (30 min)

#### 3.1 ScriptLab.tsx

**File**: `src/screens/ScriptLab/ScriptLab.tsx`

**Remove**:
- Lines 43-47: `MODEL_OPTIONS` constant
- Line 104: `video_model: formData.model` from Edge Function call

**Keep**: topic, duration, aspect ratio, language

#### 3.2 TopicSelection.tsx

**File**: `src/screens/TopicSelection/TopicSelection.tsx`

**Remove**:
- Lines 43-47: `MODEL_OPTIONS` constant
- Line 114: `const [model, setModel] = useState("auto")`
- Line 469: `video_model: model` from API call
- Lines 884-896: Model selector dropdown dari UI

---

### PHASE 4: Route Rename (30 min)

#### 4.1 Rename Folder & File (Windows CMD)

```batch
cd D:\Projects\sparkfluence_platform\src\screens
move VideoEditor ImageGeneration
cd ImageGeneration
ren VideoEditor.tsx ImageGeneration.tsx
```

#### 4.2 Update Route

**File**: `src/index.tsx`

```typescript
// OLD (line 86)
<Route path="/video-editor" element={<VideoEditor />} />

// NEW
import ImageGeneration from './screens/ImageGeneration/ImageGeneration';
<Route path="/image-generation" element={<ImageGeneration />} />
```

#### 4.3 Update Navigation Calls

**Files to update**:
- `src/screens/ScriptLab/ScriptLab.tsx` (line 137)
- `src/screens/TopicSelection/TopicSelection.tsx` (line 490)

```typescript
// OLD
navigate('/video-editor', { state: { ... } });

// NEW
navigate('/image-generation', { state: { ... } });
```

---

### PHASE 5: ImageGeneration Refactor (4-6 hours)

#### 5.1 Auto-Duration Logic

**File**: `src/lib/segmentDuration.ts` [NEW]

```typescript
/**
 * Calculate segment duration based on type and total video duration
 * Per V2_TECHNICAL_SPEC.md section 9.3
 */
export function getSegmentDuration(
  segmentType: string,
  totalDuration: '30s' | '60s' | '90s'
): 5 | 10 {
  // Fixed 5s segments
  const fixedFiveSecond = ['HOOK', 'FORE', 'CTA', 'LOOP-END'];
  if (fixedFiveSecond.includes(segmentType)) {
    return 5;
  }

  // BODY and PEAK depend on total duration
  if (totalDuration === '30s') {
    return 5;  // Short video = shorter segments
  }

  return 10;  // 60s and 90s = 10s for BODY/PEAK
}
```

#### 5.2 SegmentImageGallery Component

**File**: `src/components/features/ImageGeneration/SegmentImageGallery.tsx`

```typescript
interface SegmentImage {
  id: string;
  image_url: string;
  generation_number: number;
  source_type: 'generated' | 'stock' | 'uploaded';
  is_selected: boolean;
  created_at: string;
}

interface SegmentImageGalleryProps {
  sessionId: string;
  segmentId: string;
  segmentType: string;
  keyword: string;
  images: SegmentImage[];
  selectedImageId: string | null;
  onSelect: (imageId: string) => void;
  onRegenerate: () => void;
  onAddReference: () => void;
  onClearAll: () => void;
}

export function SegmentImageGallery({ ... }: SegmentImageGalleryProps) {
  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            onClick={() => onSelect(img.id)}
            className={cn(
              "relative cursor-pointer rounded-lg overflow-hidden border-2",
              img.is_selected
                ? "border-green-500 ring-2 ring-green-500/20"
                : "border-gray-200 hover:border-primary"
            )}
          >
            <img src={img.image_url} alt={`Gen #${img.generation_number}`} />
            {img.is_selected && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                ✓
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
              Gen #{img.generation_number} • {img.source_type}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onRegenerate}>🔄 Regenerate</Button>
        <Button onClick={onAddReference} variant="outline">+ Add Reference</Button>
        <Button onClick={onClearAll} variant="destructive">🗑️ Clear All</Button>
      </div>
    </div>
  );
}
```

#### 5.3 RegeneratePopup Component

**File**: `src/components/features/ImageGeneration/RegeneratePopup.tsx`

```typescript
interface RegeneratePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (note?: string, referenceImage?: File) => void;
  segmentType: string;
  originalPrompt: string;
}

export function RegeneratePopup({ ... }: RegeneratePopupProps) {
  const [note, setNote] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);

  const handleSubmit = () => {
    onRegenerate(note || undefined, referenceImage || undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🔄 Regenerate Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notes Textarea */}
          <div>
            <Label>Additional notes (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., 'Make it more dramatic lighting' or 'Add more warm colors'"
              rows={3}
            />
          </div>

          {/* Reference Image Upload */}
          <div>
            <Label>Or add new reference image:</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
            />
            {referenceImage && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {referenceImage.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>🔄 Regenerate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.4 StockImageModal Component

**File**: `src/components/features/ImageGeneration/StockImageModal.tsx`

```typescript
interface StockImage {
  id: string;
  provider: 'unsplash' | 'pexels';
  url_thumb: string;
  url_regular: string;
  url_full: string;
  photographer: string;
  alt_description: string;
}

interface StockImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeyword: string;
  onSelectImage: (image: StockImage) => void;
  onUploadImage: (file: File) => void;
}

export function StockImageModal({ ... }: StockImageModalProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [results, setResults] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'upload'>('stock');

  const handleSearch = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('search-stock-images', {
      body: { query: keyword, provider: 'both', per_page: 20 }
    });
    if (!error && data.success) {
      setResults(data.data);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>📸 Add Image Reference</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search images..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="stock">📷 Stock Images</TabsTrigger>
            <TabsTrigger value="upload">📤 My Uploads</TabsTrigger>
          </TabsList>

          {/* Stock Images Grid */}
          <TabsContent value="stock">
            <div className="grid grid-cols-5 gap-4 max-h-96 overflow-y-auto">
              {results.map((img) => (
                <div
                  key={img.id}
                  onClick={() => onSelectImage(img)}
                  className="cursor-pointer hover:opacity-80 transition"
                >
                  <img src={img.url_thumb} alt={img.alt_description} className="rounded" />
                  <p className="text-xs text-muted-foreground mt-1">{img.photographer}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadImage(file);
                }}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                📤 Drag & drop image here or click to upload
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.5 Update ImageGeneration.tsx State

**File**: `src/screens/ImageGeneration/ImageGeneration.tsx`

**State changes**:
```typescript
// OLD
interface Segment {
  segment_number: number;
  segment_type: string;
  text: string;
  imageUrl?: string;  // Single image
}

// NEW
interface SegmentImage {
  id: string;
  image_url: string;
  generation_number: number;
  source_type: 'generated' | 'stock' | 'uploaded';
  is_selected: boolean;
}

interface Segment {
  segment_number: number;
  segment_type: string;
  text: string;
  images: SegmentImage[];           // Multiple images
  selectedImageId: string | null;   // Track selection
  duration: 5 | 10;                 // Auto-calculated
}
```

---

### PHASE 6: Voice Recording (2-3 hours)

#### 6.1 VoiceRecorder Component

**File**: `src/components/features/VoiceRecorder/VoiceRecorder.tsx`

```typescript
interface VoiceRecorderProps {
  minDuration: number;  // 120 seconds
  maxDuration?: number; // Default: 180s
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  existingAudioUrl?: string;
}

export function VoiceRecorder({ ... }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= (maxDuration || 180)) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSave = () => {
    if (audioBlob && duration >= minDuration) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const progress = (duration / minDuration) * 100;
  const isMinimumMet = duration >= minDuration;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-mono">
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
          </div>
          <div className="text-sm text-muted-foreground">
            Minimum: {Math.floor(minDuration / 60)}:{String(minDuration % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isMinimumMet ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Waveform Visualization */}
        <AudioWaveform isRecording={isRecording} />

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button onClick={startRecording} size="lg">
              🎤 Start Recording
            </Button>
          )}

          {isRecording && (
            <Button onClick={stopRecording} size="lg" variant="destructive">
              ⏹️ Stop
            </Button>
          )}
        </div>

        {/* Playback */}
        {audioUrl && (
          <div className="space-y-2">
            <audio src={audioUrl} controls className="w-full" />
            {!isMinimumMet && (
              <p className="text-sm text-destructive">
                ⚠️ Recording too short. Minimum {minDuration}s required for quality voice cloning.
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        {audioBlob && (
          <Button
            onClick={handleSave}
            disabled={!isMinimumMet}
            className="w-full"
          >
            {isMinimumMet ? '✅ Save Voice Recording' : '❌ Too Short - Record More'}
          </Button>
        )}
      </div>
    </Card>
  );
}
```

#### 6.2 AudioWaveform Component

**File**: `src/components/features/VoiceRecorder/AudioWaveform.tsx`

```typescript
interface AudioWaveformProps {
  isRecording: boolean;
}

export function AudioWaveform({ isRecording }: AudioWaveformProps) {
  return (
    <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center gap-1 px-4">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-primary rounded-full transition-all",
            isRecording && "animate-pulse"
          )}
          style={{
            height: isRecording
              ? `${Math.random() * 100}%`
              : '20%',
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}
```

#### 6.3 Update Onboarding.tsx

**File**: `src/screens/Onboarding/Onboarding.tsx`

**Add new step after avatar upload**:

```typescript
// State
const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
const [voiceDuration, setVoiceDuration] = useState(0);

// Step order
const steps = [
  'profile',
  'avatar',
  'voice',      // NEW STEP
  'preferences',
  // ...
];

// Voice upload handler
const handleVoiceComplete = async (blob: Blob, duration: number) => {
  setVoiceBlob(blob);
  setVoiceDuration(duration);

  // Upload to Supabase Storage
  const fileName = `${user.id}_voice_${Date.now()}.webm`;
  const { data, error } = await supabase.storage
    .from('voice-references')
    .upload(fileName, blob);

  if (error) {
    console.error('Voice upload failed:', error);
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('voice-references')
    .getPublicUrl(fileName);

  // Save to user_profiles
  await supabase
    .from('user_profiles')
    .update({
      voice_reference_url: publicUrl,
      voice_reference_duration_seconds: duration,
    })
    .eq('id', user.id);

  // Move to next step
  nextStep();
};

// Render
{currentStep === 'voice' && (
  <div>
    <h2>Record Your Voice</h2>
    <p>We need at least 2 minutes of your voice for quality AI cloning.</p>
    <VoiceRecorder
      minDuration={120}
      maxDuration={180}
      onRecordingComplete={handleVoiceComplete}
    />
  </div>
)}
```

#### 6.4 Update Profile.tsx

**File**: `src/screens/Settings/Profile.tsx`

**Add voice section**:

```typescript
// Fetch current voice
const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
const [voiceDuration, setVoiceDuration] = useState<number | null>(null);

useEffect(() => {
  async function loadVoice() {
    const { data } = await supabase
      .from('user_profiles')
      .select('voice_reference_url, voice_reference_duration_seconds')
      .eq('id', user.id)
      .single();

    if (data) {
      setVoiceUrl(data.voice_reference_url);
      setVoiceDuration(data.voice_reference_duration_seconds);
    }
  }
  loadVoice();
}, [user.id]);

// Render
<Card>
  <CardHeader>
    <CardTitle>Voice Reference</CardTitle>
    <CardDescription>
      Your voice sample for AI cloning (minimum 2 minutes)
    </CardDescription>
  </CardHeader>
  <CardContent>
    {voiceUrl && (
      <div className="space-y-2 mb-4">
        <audio src={voiceUrl} controls className="w-full" />
        <p className="text-sm text-muted-foreground">
          Duration: {Math.floor((voiceDuration || 0) / 60)}m {(voiceDuration || 0) % 60}s
        </p>
      </div>
    )}

    {showRecorder ? (
      <VoiceRecorder
        minDuration={120}
        maxDuration={180}
        existingAudioUrl={voiceUrl || undefined}
        onRecordingComplete={handleVoiceUpdate}
      />
    ) : (
      <Button onClick={() => setShowRecorder(true)}>
        {voiceUrl ? '🔄 Re-record Voice' : '🎤 Record Voice'}
      </Button>
    )}
  </CardContent>
</Card>
```

---

### PHASE 7: Edge Functions - Stock Images (1 hour) 🔒 **ASK PERMISSION**

#### 7.1 search-stock-images Edge Function

**File**: `supabase/functions/search-stock-images/index.ts`

```typescript
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
const PEXELS_API = 'https://api.pexels.com/v1/search';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, provider = 'both', page = 1, per_page = 20 } = await req.json();

    if (!query) {
      throw new Error('Query parameter required');
    }

    const results = [];

    // Search Unsplash
    if (provider === 'unsplash' || provider === 'both') {
      const unsplashRes = await fetch(
        `${UNSPLASH_API}?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`,
        {
          headers: {
            'Authorization': `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
          },
        }
      );
      const unsplashData = await unsplashRes.json();

      results.push(...unsplashData.results.map((img: any) => ({
        id: img.id,
        provider: 'unsplash',
        url_thumb: img.urls.thumb,
        url_regular: img.urls.regular,
        url_full: img.urls.full,
        width: img.width,
        height: img.height,
        photographer: img.user.name,
        photographer_url: img.user.links.html,
        alt_description: img.alt_description || '',
      })));
    }

    // Search Pexels
    if (provider === 'pexels' || provider === 'both') {
      const pexelsRes = await fetch(
        `${PEXELS_API}?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`,
        {
          headers: {
            'Authorization': Deno.env.get('PEXELS_API_KEY') || '',
          },
        }
      );
      const pexelsData = await pexelsRes.json();

      results.push(...pexelsData.photos.map((img: any) => ({
        id: String(img.id),
        provider: 'pexels',
        url_thumb: img.src.tiny,
        url_regular: img.src.large,
        url_full: img.src.original,
        width: img.width,
        height: img.height,
        photographer: img.photographer,
        photographer_url: img.photographer_url,
        alt_description: img.alt || '',
      })));
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'STOCK_SEARCH_ERROR', message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### PHASE 8: Edge Functions - Image Analysis (1-2 hours) 🔒 **ASK PERMISSION**

#### 8.1 analyze-image Edge Function

**File**: `supabase/functions/analyze-image/index.ts`

```typescript
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_VISION_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface ImageAnalysis {
  description: string;
  objects: string[];
  style: string;
  lighting: string;
  composition: string;
  colors: string[];
  mood: string;
  suggested_motion: string;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      throw new Error('image_url required');
    }

    const base64Image = await fetchImageAsBase64(image_url);

    const response = await fetch(GEMINI_VISION_API, {
      method: 'POST',
      headers: {
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              text: `Analyze this image for video generation. Return JSON with:
              - description: detailed scene description (1-2 sentences)
              - objects: array of main objects/subjects
              - style: visual style (e.g., "cinematic", "minimalist", "vibrant")
              - lighting: lighting description (e.g., "natural soft light", "dramatic shadows")
              - composition: how elements are arranged
              - colors: array of dominant colors
              - mood: emotional tone
              - suggested_motion: recommended camera movement for 5-10s video (e.g., "slow push-in", "orbit", "static")

              Return ONLY valid JSON, no markdown formatting.`,
            },
          ],
        }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await response.json();

    // Extract JSON from response
    const analysisText = data.candidates[0].content.parts[0].text;
    const analysis: ImageAnalysis = JSON.parse(analysisText);

    return new Response(
      JSON.stringify({ success: true, data: analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'IMAGE_ANALYSIS_ERROR', message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 8.2 generate-video-prompt Edge Function

**File**: `supabase/functions/generate-video-prompt/index.ts`

```typescript
import { corsHeaders } from '../_shared/cors.ts';

interface GeneratePromptRequest {
  image_analysis: any;  // ImageAnalysis type
  segment_type: string;
  script_text: string;
  duration_seconds: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      image_analysis,
      segment_type,
      script_text,
      duration_seconds
    }: GeneratePromptRequest = await req.json();

    const isCreatorSegment = ['HOOK', 'CTA', 'LOOP-END'].includes(segment_type);

    const prompt = `
Cinematic ${duration_seconds}-second video.

SCENE: ${image_analysis.description}
OBJECTS: ${image_analysis.objects.join(', ')}
STYLE: ${image_analysis.style}
LIGHTING: ${image_analysis.lighting}
COMPOSITION: ${image_analysis.composition}
COLORS: ${image_analysis.colors.join(', ')}
MOOD: ${image_analysis.mood}

CAMERA MOTION: ${image_analysis.suggested_motion}

${isCreatorSegment
  ? 'Subject speaks directly to camera with natural micro-movements. Maintain eye contact. Subtle head tilts and gestures.'
  : 'No human subjects visible. Focus on product/scene motion. Smooth cinematic movement.'}

TECHNICAL: Professional quality, smooth motion, no artifacts, no camera shake, cinematic color grading.
    `.trim();

    return new Response(
      JSON.stringify({ success: true, data: { prompt } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'PROMPT_GENERATION_ERROR', message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### PHASE 9: Update Existing Edge Functions (1-2 hours) 🔒 **ASK PERMISSION**

#### 9.1 Update generate-script

**File**: `supabase/functions/generate-script/index.ts`

**Remove**: `video_model` parameter from request body

**Keep**: input_type, content, duration, aspect_ratio, platform, language, user_id, creative_dna

#### 9.2 Update generate-images

**File**: `supabase/functions/generate-images/index.ts`

**Add support for**:
- `mode` parameter: 'create_jobs' (async) or 'process_single' (sync)
- `source_type`: 'generated' | 'stock' | 'uploaded'
- `generation_number`: Track regeneration count
- Multi-image per segment (remove UNIQUE constraint check)

```typescript
// New request schema
interface GenerateImageRequest {
  mode: 'create_jobs' | 'process_single';
  session_id: string;
  segment_number: number;
  prompt: string;
  model_id?: string;  // Optional, defaults to 'auto'
  reference_image_url?: string;
  regeneration_note?: string;
  source_type?: 'generated' | 'stock' | 'uploaded';
  generation_number?: number;
}
```

#### 9.3 Update generate-videos

**File**: `supabase/functions/generate-videos/index.ts`

**Add**:
- Accept `image_analysis` object
- Auto-generate prompt if not provided
- Support for Wan 2.5 and Kling 2.5 model selection

---

### PHASE 10: Testing & Validation (2-3 hours)

#### Test Checklist

**Database**:
- [ ] Order ID persists across navigation
- [ ] Multiple images per segment allowed
- [ ] Voice reference saved correctly

**Frontend**:
- [ ] Order ID displayed in all screens
- [ ] Model selectors removed from ScriptLab/TopicSelection
- [ ] Route /image-generation works
- [ ] Multi-image gallery: regenerate appends, doesn't replace
- [ ] Stock search returns results
- [ ] Voice recorder enforces 2-min minimum
- [ ] Audio playback works

**Edge Functions**:
- [ ] search-stock-images returns Unsplash + Pexels results
- [ ] analyze-image returns valid JSON
- [ ] generate-video-prompt creates proper prompt
- [ ] generate-images supports multi-image mode

**End-to-End Flow**:
- [ ] Script generation → Order ID created
- [ ] Image generation → Multiple images per segment
- [ ] Stock search → Add reference
- [ ] Regenerate → Appends new image
- [ ] Select image → Mark as selected
- [ ] Video generation → Auto-prompt from image
- [ ] Voice recording → 2-min enforcement

---

## Verification Steps

After implementation:

```batch
# Build check
npm run build

# Type check
npm run type-check

# Database verification
supabase db diff

# Edge Functions list
supabase functions list

# Local testing
npm run dev
```

---

## Deployment Procedure 🔒 **ASK PERMISSION BEFORE EACH**

### 1. Database Migration
```batch
supabase db push
```

### 2. Deploy Edge Functions
```batch
cd supabase\functions

# Deploy new functions
supabase functions deploy search-stock-images --no-verify-jwt
supabase functions deploy analyze-image --no-verify-jwt
supabase functions deploy generate-video-prompt --no-verify-jwt

# Update existing
supabase functions deploy generate-script --no-verify-jwt
supabase functions deploy generate-images --no-verify-jwt
supabase functions deploy generate-videos --no-verify-jwt
```

### 3. Frontend Build & Deploy
```batch
npm run build
# Deploy to hosting (method depends on setup)
```

---

## Rollback Plan

If issues occur:

**Database**:
```sql
-- Remove new columns
ALTER TABLE generation_sessions DROP COLUMN order_id;
ALTER TABLE image_generation_jobs DROP COLUMN seed, regeneration_note, source_type, generation_number, is_selected;
ALTER TABLE user_profiles DROP COLUMN voice_reference_duration_seconds;
DROP TABLE stock_image_searches;
```

**Frontend**:
```batch
git revert HEAD
npm run build
```

**Edge Functions**:
```batch
# Previous versions can be redeployed
supabase functions deploy function-name@previous-version
```

---

## Questions to Resolve

1. **Voice Recording**: Required or optional in onboarding? optional in onboarding, we should have default sound for male & famele in case customer doesn't want to record his/her voice
2. **Multi-Image Limit**: Max images per segment? 3, prompt user max 3 images per segment
3. **Old Routes**: Should /video-editor redirect or return 404? return 404
4. **API Keys**: Are UNSPLASH_ACCESS_KEY and PEXELS_API_KEY already obtained? Yes in .env
5. **Order ID Timing**: Generate on script success or after first image? Generate on script success
6. **Regeneration Cost**: Should we warn users about regeneration costs? Yes

---

## Implementation Priority

**P0 (Critical - Must Do First)**:
- Phase 0: Read API docs
- Phase 1: Database schema
- Phase 2: Order ID system
- Phase 3: Remove model selectors
- Phase 4: Route rename

**P1 (High - Core Features)**:
- Phase 5: ImageGeneration refactor
- Phase 7-8: Stock images + image analysis
- Phase 9: Update Edge Functions

**P2 (Medium - Enhancement)**:
- Phase 6: Voice recording

**Testing & Deployment**:
- Phase 10: Full validation

---

**Total Estimated Time**: 19-28 hours across all phases

**Critical Path**: Phase 0 → Phase 1 → Phase 4 → Phase 5 → Phase 7-8 → Phase 9

**Can Work in Parallel**:
- Voice recording (Phase 6) independent from image flow
- Stock images (Phase 7) can be done alongside analysis (Phase 8)

---

## Success Criteria

✅ Database schema updated with no migration errors
✅ Order ID generated and tracked across all screens
✅ Multi-image gallery working (regenerate = append)
✅ Stock image search integrated
✅ Voice recording with 2-min minimum
✅ Image analysis via Gemini Vision
✅ Auto-generated video prompts
✅ All existing features still working
✅ No TypeScript errors
✅ End-to-end flow tested successfully

---

**End of Plan**