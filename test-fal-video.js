// Test fal.ai video generation (Kling 2.5 & Wan 2.5)
// Run: node test-fal-video.js

const SUPABASE_URL = 'https://lgccaexqwmmvuvxbacic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnY2NhZXhxd21tdnV2eGJhY2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMyNjAsImV4cCI6MjA4MzgwOTI2MH0.jQXuE7tcTeU6S4gWuUGLup7OR_JXXuBsrRrVJ0CB1I8';

// Sample image URL from previous image generation test
const TEST_IMAGE_URL = 'https://lgccaexqwmmvuvxbacic.supabase.co/storage/v1/object/public/test-images/sample-portrait.jpg';

async function testFalVideoGeneration() {
  console.log('🎬 Testing fal.ai Video Generation (Kling 2.5 & Wan 2.5)\n');

  const testCases = [
    {
      name: 'Wan 2.5 - 5s B-ROLL',
      model: 'wan-2.5',
      duration: 5,
      imageUrl: TEST_IMAGE_URL,
      prompt: 'A cinematic B-roll shot of modern tech workspace with soft ambient lighting, gentle camera pan revealing depth layers, holographic interface elements shimmer with scan-line effects',
      scriptText: '',
      segmentType: 'BODY-1'
    },
    {
      name: 'Kling 2.5 - 10s B-ROLL',
      model: 'kling-2.5',
      duration: 10,
      imageUrl: TEST_IMAGE_URL,
      prompt: 'Slow cinematic orbit shot of product display in premium studio lighting, smooth camera movement emphasizing premium quality, subtle reflections move across surfaces',
      scriptText: '',
      segmentType: 'BODY-2'
    },
    {
      name: 'Wan 2.5 - 5s CREATOR',
      model: 'wan-2.5',
      duration: 5,
      imageUrl: TEST_IMAGE_URL,
      prompt: 'Professional content creator speaking directly to camera with confident expression, smooth dolly push-in for intimacy, maintains eye contact throughout',
      scriptText: 'Hey guys! Let me show you something amazing...',
      segmentType: 'HOOK'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📹 Test: ${testCase.name}`);
    console.log('─'.repeat(60));

    try {
      // Step 1: Create job
      console.log(`\n1️⃣ Creating video job...`);
      const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          mode: 'create_jobs',
          user_id: 'test-user-123',
          session_id: `test-fal-${Date.now()}`,
          segments: [{
            segment_id: 'TEST-001',
            segment_number: 1,
            segment_type: testCase.segmentType,
            image_url: testCase.imageUrl,
            script_text: testCase.scriptText,
            duration_seconds: testCase.duration,
            visual_direction: testCase.prompt,
            emotion: 'authority',
            shot_type: testCase.scriptText ? 'CREATOR' : 'B-ROLL'
          }],
          language: 'indonesian',
          aspect_ratio: '9:16',
          resolution: '1080p',
          environment: 'studio',
          preferred_platform: testCase.model // 'wan-2.5' or 'kling-2.5'
        })
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        console.log(`❌ Job creation failed:`, createResult.error);
        continue;
      }

      const job = createResult.data.jobs[0];
      console.log(`✅ Job created: ${job.id}`);
      console.log(`   Platform: ${testCase.model}`);
      console.log(`   Duration: ${testCase.duration}s`);

      // Step 2: Process single job (submit to fal.ai)
      console.log(`\n2️⃣ Submitting to fal.ai...`);
      const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          mode: 'process_single',
          job_id: job.id
        })
      });

      const processResult = await processResponse.json();

      if (!processResult.success) {
        console.log(`❌ Processing failed:`, processResult.error);
        continue;
      }

      console.log(`✅ Submitted to fal.ai`);
      console.log(`   Request ID: ${processResult.data.job.veo_uuid}`);

      // Step 3: Poll status (every 5 seconds, max 2 minutes)
      console.log(`\n3️⃣ Polling status (checking every 5s)...`);
      let attempts = 0;
      const maxAttempts = 24; // 2 minutes
      let videoUrl = null;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

        const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-videos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            mode: 'check_and_update',
            session_id: job.session_id,
            user_id: job.user_id
          })
        });

        const statusResult = await statusResponse.json();
        const jobStatus = statusResult.data?.jobs?.find(j => j.id === job.id);

        if (jobStatus?.status === 2) {
          // Completed
          videoUrl = jobStatus.video_url;
          console.log(`✅ Video generated! (${attempts * 5}s)`);
          console.log(`   URL: ${videoUrl}`);
          break;
        } else if (jobStatus?.status === 3) {
          // Failed
          console.log(`❌ Video generation failed: ${jobStatus.error_message}`);
          break;
        } else {
          // Still processing
          process.stdout.write(`\r   Attempt ${attempts}/${maxAttempts} - Status: processing...`);
        }
      }

      if (!videoUrl && attempts >= maxAttempts) {
        console.log(`\n⏱️ Timeout after 2 minutes`);
      }

    } catch (error) {
      console.log(`❌ Test error:`, error.message);
    }
  }

  console.log('\n\n✨ Testing Complete!\n');
}

testFalVideoGeneration();
