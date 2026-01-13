// Test generate-video-prompt Edge Function
// Run: node test-generate-video-prompt.js

const SUPABASE_URL = 'https://lgccaexqwmmvuvxbacic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnY2NhZXhxd21tdnV2eGJhY2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMyNjAsImV4cCI6MjA4MzgwOTI2MH0.jQXuE7tcTeU6S4gWuUGLup7OR_JXXuBsrRrVJ0CB1I8';

async function testGenerateVideoPrompt() {
  console.log('🎬 Testing generate-video-prompt Edge Function\n');

  // Mock image analysis from analyze-image function
  const mockImageAnalysis = {
    objects: ['person', 'coffee cup', 'modern interior'],
    style: 'cinematic portrait photography',
    lighting: 'soft natural window light, Rembrandt 4:1',
    mood: 'confident and engaged',
    color_palette: 'warm golden tones with neutral background',
    composition: 'medium close-up, rule of thirds, shallow depth of field',
    suggested_motion: 'smooth dolly push-in for intimacy',
    technical_details: 'bokeh background, professional lighting setup, 85mm f/1.8'
  };

  const testCases = [
    {
      name: 'HOOK Segment (5s)',
      data: {
        image_analysis: mockImageAnalysis,
        segment_type: 'HOOK',
        script_text: 'Hey there! Let me tell you about something that changed my life...',
        duration_seconds: 5
      }
    },
    {
      name: 'BODY Segment (10s)',
      data: {
        image_analysis: mockImageAnalysis,
        segment_type: 'BODY-1',
        script_text: 'This incredible technique has helped thousands of people improve their productivity...',
        duration_seconds: 10
      }
    },
    {
      name: 'PEAK Segment (10s)',
      data: {
        image_analysis: mockImageAnalysis,
        segment_type: 'PEAK',
        script_text: 'And here is the most important part that you need to understand...',
        duration_seconds: 10
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📹 Test: ${testCase.name}`);
    console.log('─'.repeat(60));

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-video-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Success!\n');
        console.log('📝 Generated Video Prompt:');
        console.log(result.data.video_prompt);
        console.log('\n🎥 Camera Settings:');
        console.log(`   Movement: ${result.data.camera_settings.movement}`);
        console.log(`   Focal Length: ${result.data.camera_settings.focal_length}`);
        console.log(`   Angle: ${result.data.camera_settings.angle}`);
        console.log('\n⏱️  Duration Note:');
        console.log(`   ${result.data.duration_note}`);
        console.log('\n🚫 Negative Prompt:');
        console.log(`   ${result.data.negative_prompt.substring(0, 100)}...`);
      } else {
        console.log('❌ Failed:', result.error);
      }

    } catch (error) {
      console.log('❌ Test error:', error.message);
    }
  }

  console.log('\n\n✨ Testing Complete!\n');
}

testGenerateVideoPrompt();
