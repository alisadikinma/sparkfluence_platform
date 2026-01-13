// Test analyze-image Edge Function
// Run: node test-analyze-image.js

const SUPABASE_URL = 'https://lgccaexqwmmvuvxbacic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnY2NhZXhxd21tdnV2eGJhY2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMyNjAsImV4cCI6MjA4MzgwOTI2MH0.jQXuE7tcTeU6S4gWuUGLup7OR_JXXuBsrRrVJ0CB1I8';

async function testAnalyzeImage() {
  console.log('🧪 Testing analyze-image Edge Function...\n');

  // Test image URL (sample portrait image)
  const testImageUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  const payload = {
    image_url: testImageUrl,
    segment_type: 'HOOK',
    script_text: 'Hey there! Let me tell you about something amazing...'
  };

  try {
    console.log('📤 Sending request to analyze-image...');
    console.log('Image URL:', testImageUrl);
    console.log('Segment Type:', payload.segment_type);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Analysis successful!\n');
      console.log('📊 Analysis Results:');
      console.log('==================\n');

      const analysis = result.data.analysis;
      console.log('🎯 Objects:', analysis.objects.join(', '));
      console.log('🎨 Style:', analysis.style);
      console.log('💡 Lighting:', analysis.lighting);
      console.log('😊 Mood:', analysis.mood);
      console.log('🎨 Color Palette:', analysis.color_palette);
      console.log('📐 Composition:', analysis.composition);
      console.log('🎬 Suggested Motion:', analysis.suggested_motion);
      console.log('🔧 Technical Details:', analysis.technical_details);

      console.log('\n📝 Raw Response Preview:');
      console.log(result.data.raw_response.substring(0, 200) + '...');
    } else {
      console.error('❌ Analysis failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAnalyzeImage();
