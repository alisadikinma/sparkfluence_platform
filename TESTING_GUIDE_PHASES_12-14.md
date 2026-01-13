# Testing Guide: Phases 12-14 Video Generation with TTS

## ✅ What's Deployed and Ready to Test

**Edge Functions:**
- `generate-tts` (Chatterbox Turbo) - Voice synthesis
- `generate-videos` (Wan 2.5 + Kling 2.5) - Video generation with audio
- `analyze-image` (Gemini Vision) - Image analysis
- `generate-video-prompt` (Gemini) - Auto-prompt generation

**Models Active:**
- **Wan Video 2.5** (PRIMARY) - 5s, 1080p, audio support, $0.10/video
- **Kling Video 2.5** (FALLBACK) - 10s, 1080p, silent only, $0.15/video
- **Chatterbox Turbo** - 20+ voices, voice cloning, $0.05/request

---

## 🧪 Testing Checklist

### Test 1: CREATOR Segment with Voice Sync (HOOK/CTA)

**Test Scenario:**
```
Segment Type: HOOK
Duration: 5s (auto-calculated)
Script: "Eh guys, lo harus tau ini! [chuckle]"
Voice: aaron (male professional)
Image: Creator's face (from avatar)
Expected: Video with lip-sync voiceover
```

**Steps:**
1. Buka `/script-lab` → generate script
2. Buka `/image-generation` → generate image untuk HOOK segment
3. Klik "Generate Video" pada HOOK segment
4. Tunggu ~30s processing
5. Play video hasil generate

**Success Criteria:**
- ✅ Video 5s dengan voiceover
- ✅ Lip movement sedikit sync (acceptable offset)
- ✅ Audio jelas dan natural
- ✅ Video quality 1080p
- ⚠️ Cek apakah ada lag antara audio dan video (trade-off yang acceptable)

---

### Test 2: B-ROLL with Background Narration (BODY/PEAK)

**Test Scenario:**
```
Segment Type: BODY-1
Duration: 10s (auto-calculated for 60s video)
Script: "Bayangin lo lagi di pantai, angin sepoi-sepoi..."
Voice: lucy (female friendly)
Image: Beach landscape (no face)
Expected: Silent video + narration background
Model: Wan 2.5 (if 5s) OR Kling 2.5 (if 10s)
```

**Steps:**
1. Generate image untuk B-ROLL segment (landscape/scene)
2. Generate video untuk segment dengan script
3. Play hasil video

**Success Criteria:**
- ✅ Video 10s dengan background narration
- ✅ Audio narration jelas (bukan voice sync)
- ✅ Visual sesuai prompt (no faces in B-ROLL)

**Note:** Jika duration 10s, Kling 2.5 akan generate silent video (TTS diabaikan). Ini expected behavior - nanti audio ditambahkan saat FFmpeg combine.

---

### Test 3: Silent B-ROLL (No Script)

**Test Scenario:**
```
Segment Type: FORE
Duration: 5s
Script: (empty/kosong)
Image: Coffee shop interior
Expected: Silent video, no audio
```

**Steps:**
1. Generate image untuk segment tanpa script
2. Generate video
3. Play hasil

**Success Criteria:**
- ✅ Video 5s tanpa audio
- ✅ Visual cinematic dan smooth
- ✅ No lip movement (karena no face)

---

### Test 4: Voice Cloning (Custom Voice)

**Test Scenario:**
```
Voice: Custom (dari user profile voice recording)
Script: "This is my personalized voice clone!"
Expected: Video dengan suara yang mirip user's voice
```

**Steps:**
1. Upload voice reference di `/profile` (min 2 minutes)
2. Generate video segment dengan script
3. Pastikan `voice_clone_url` digunakan
4. Play dan compare dengan original voice

**Success Criteria:**
- ✅ Voice similarity acceptable (70-80%)
- ✅ Pronunciation jelas
- ✅ No robotic artifacts

---

### Test 5: Cost Verification

**Test Full 60s Video (8 segments):**
```
- 2 CREATOR (HOOK, CTA): 2 × $0.15 = $0.30
- 3 B-ROLL with narration (5s): 3 × $0.15 = $0.45
- 3 B-ROLL silent: 3 × $0.10 = $0.30
Total: $1.05 per video
```

**Compare with VEO/Sora:**
```
- Same 8 segments: 8 × $0.20 = $1.60
Savings: $0.55 (34%)
```

**Verify:**
- Check fal.ai billing dashboard
- Confirm actual costs match estimates
- Monitor API usage per segment

---

## 🎯 Quality Evaluation Criteria

### Video Quality (0-10 scale):

| Factor | Weight | Target Score |
|--------|--------|--------------|
| **Visual quality** | 30% | 8+ (1080p cinematic) |
| **Lip-sync accuracy** (CREATOR) | 25% | 7+ (acceptable offset) |
| **Audio clarity** | 20% | 8+ (no distortion) |
| **Motion naturalness** | 15% | 7+ (smooth, not robotic) |
| **Cost-effectiveness** | 10% | 10 (34% cheaper) |

**Overall Target:** 7.5+/10 (Good quality with acceptable trade-offs)

---

## 🔍 Known Issues & Mitigations

### Issue 1: Lip-Sync Offset (Wan 2.5)
**Symptom:** Audio slightly ahead/behind mouth movement (~0.1-0.3s)

**Mitigation:**
- Keep CREATOR segments to 5s (minimize drift)
- Use clear pronunciation scripts
- Post-process with FFmpeg audio sync if critical

**Acceptable?** YES for short-form content (<10s segments)

---

### Issue 2: Kling 2.5 Ignores Audio (10s B-ROLL)
**Symptom:** Generated video is silent even with TTS

**Explanation:** Kling 2.5 doesn't support `audio_url` parameter

**Mitigation:**
- FFmpeg merge audio in final assembly step (Phase 16)
- Prioritize Wan 2.5 for all audio segments when possible

**Expected?** YES - this is documented behavior

---

### Issue 3: Gemini Rate Limit (429)
**Symptom:** Image analysis or prompt generation fails with HTTP 429

**Cause:** Free tier API limits (~60 requests/minute)

**Mitigation:**
- Add exponential backoff retry logic
- Space out requests (3-5s between calls)
- Monitor quota usage

**Production Impact:** LOW (users naturally space requests)

---

## 📊 Performance Benchmarks

### Generation Times:

| Step | Duration | Notes |
|------|----------|-------|
| **TTS Generation** | ~2s | Per segment with script |
| **Video Generation (Wan 2.5)** | ~30s | 5s video |
| **Video Generation (Kling 2.5)** | ~40s | 10s video |
| **Image Analysis** | ~3s | Gemini Vision |
| **Auto-Prompt** | ~5s | Gemini generation |

**Total per Segment (with TTS):** ~35-40s
**Parallelization:** Can run 3-5 segments simultaneously

**Full 60s Video (8 segments):**
- Sequential: ~5 minutes
- Parallel (3 concurrent): ~2 minutes ✅

---

## 🐛 Debugging Guide

### Debug 1: TTS Not Attached to Video

**Check:**
1. Apakah `script_text` ada di segment?
2. Apakah TTS berhasil generate? (check `audio_url` di DB)
3. Apakah model yang dipakai Wan 2.5? (Kling tidak support)
4. Check logs di Edge Function:
   ```
   [PROCESS_SINGLE] Generating TTS audio for segment...
   [PROCESS_SINGLE] ✅ TTS generated: https://...
   [FAL_SUBMIT] Adding TTS audio: https://...
   ```

**Fix:**
- Pastikan Wan 2.5 dipilih untuk segment dengan audio
- Verify FAL_AI_API_KEY format benar (`key_id:key_secret`)

---

### Debug 2: Video Generation Stuck in Processing

**Check:**
1. Check `video_generation_jobs` table → status 1 (processing)
2. Check `error_message` field → berisi `status_url` dari fal.ai
3. Manual poll status URL:
   ```bash
   curl -H "Authorization: Key $FAL_AI_API_KEY" https://queue.fal.run/requests/xxx/status
   ```

**Fix:**
- If status = IN_QUEUE → tunggu, fal.ai queue delay
- If status = FAILED → check error message
- If stuck >5 min → retry generation

---

### Debug 3: Audio-Video Desync

**Measure offset:**
- Play video, check gap between audio start and lip movement
- If offset >0.5s → potential issue

**Fix:**
1. Try different voice (some voices sync better)
2. Adjust temperature (lower = more consistent)
3. Use shorter scripts (3-5 words for 5s)
4. Post-process with FFmpeg:
   ```python
   ffmpeg -i video.mp4 -itsoffset 0.2 -i audio.wav -c:v copy -c:a aac output.mp4
   ```

---

## 📈 Next Steps After Testing

### If Quality GOOD (7.5+/10):
✅ Proceed to Phase 15 (Background Music Generation)
✅ Implement FFmpeg final assembly (Phase 16)
✅ Launch beta testing with real users

### If Quality NEEDS IMPROVEMENT:
⚠️ Tune Wan 2.5 parameters:
- Experiment with `temperature` (currently using defaults)
- Try different `seed` values for consistency
- Adjust prompt engineering for better lip-sync

⚠️ Fallback strategy:
- Use VEO 3.1 for premium tier (better lip-sync)
- Keep Wan 2.5 as default tier (cost-effective)

### If Quality UNACCEPTABLE (<6/10):
❌ Consider reverting to VEO/Sora for CREATOR segments
❌ Keep Wan 2.5 only for B-ROLL narration
❌ Re-evaluate cost vs quality trade-off

---

## 📝 Feedback Template

**Segment Type:** [HOOK/BODY-1/etc.]
**Duration:** [5s/10s]
**Voice Used:** [aaron/lucy/custom]
**Has Script:** [Yes/No]

**Scores (1-10):**
- Visual Quality: ___ /10
- Lip-Sync (if CREATOR): ___ /10
- Audio Clarity: ___ /10
- Motion Naturalness: ___ /10
- Overall: ___ /10

**Issues Found:**
- [ ] Audio-video desync
- [ ] Robotic voice
- [ ] Poor visual quality
- [ ] Wrong camera movement
- [ ] Other: ___________

**Notes:**
[Any additional observations...]

---

## 🚀 Quick Test Commands

**Test TTS Generation:**
```bash
curl -X POST "https://lgccaexqwmmvuvxbacic.supabase.co/functions/v1/generate-tts" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test voice generation", "voice": "aaron"}'
```

**Test Video Generation (single segment):**
```javascript
// Via frontend: ImageGeneration.tsx
// Click "Generate Video" button on any segment
// Monitor Network tab for Edge Function call
// Check Response for video_url
```

**Check Job Status (manual query):**
```sql
SELECT
  id,
  segment_type,
  status,
  audio_url,
  video_url,
  error_message
FROM video_generation_jobs
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY segment_number;
```

---

**Last Updated:** January 13, 2026
**Status:** Ready for Quality Testing
**Deployment:** Production (lgccaexqwmmvuvxbacic)
**Estimated Testing Time:** 1-2 hours for full evaluation
