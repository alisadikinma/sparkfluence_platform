// Test TTS generation with Chatterbox Turbo
// Run: node test-tts.js

const SUPABASE_URL = 'https://lgccaexqwmmvuvxbacic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnY2NhZXhxd21tdnV2eGJhY2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMyNjAsImV4cCI6MjA4MzgwOTI2MH0.jQXuE7tcTeU6S4gWuUGLup7OR_JXXuBsrRrVJ0CB1I8';

async function testTTS() {
  console.log('🎤 Testing Chatterbox Turbo TTS\n');

  const testCases = [
    {
      name: 'Male voice (aaron) - Professional',
      text: 'Hey guys! Let me show you something amazing that will change the way you create content.',
      voice: 'aaron',
      temperature: 0.8
    },
    {
      name: 'Female voice (lucy) - Friendly',
      text: 'Welcome back! [chuckle] Today we are going to explore an incredible new technique.',
      voice: 'lucy',
      temperature: 0.8
    },
    {
      name: 'Male voice (gavin) - Energetic with tags',
      text: '[gasp] Oh my gosh, this is incredible! [laugh] You have to see this to believe it!',
      voice: 'gavin',
      temperature: 1.0
    },
    {
      name: 'Female voice (evelyn) - Elegant',
      text: '[clear throat] Let me share with you the three most important lessons I have learned.',
      voice: 'evelyn',
      temperature: 0.7
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🎙️  Test: ${testCase.name}`);
    console.log('─'.repeat(60));
    console.log(`Text: "${testCase.text}"`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          text: testCase.text,
          voice: testCase.voice,
          temperature: testCase.temperature,
          model: 'chatterbox-turbo'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Success!');
        console.log(`   Audio URL: ${result.data.audio_url}`);
        console.log(`   Duration: ~${result.data.duration}s`);
        console.log(`   Voice: ${result.data.voice}`);
      } else {
        console.log('❌ Failed:', result.error);
      }

    } catch (error) {
      console.log('❌ Test error:', error.message);
    }
  }

  console.log('\n\n✨ Testing Complete!\n');
  console.log('💡 Tips:');
  console.log('   - Use paralinguistic tags: [laugh], [sigh], [chuckle], [gasp]');
  console.log('   - Higher temperature (0.9-1.2) = more varied speech');
  console.log('   - Lower temperature (0.5-0.7) = more consistent speech');
  console.log('   - For voice cloning, provide audio_url instead of voice');
}

testTTS();
