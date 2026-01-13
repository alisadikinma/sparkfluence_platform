// Test segment duration calculation
// Run: node test-segment-duration.js

console.log('🧪 Testing Auto-Duration Logic\n');

// Simulate the TypeScript function
function calculateSegmentDuration(segmentType, videoDuration) {
  const normalizedType = segmentType.toUpperCase();

  // Fixed 5s segments
  const fixedDurationTypes = ['HOOK', 'FORE', 'CTA', 'LOOP-END'];
  if (fixedDurationTypes.includes(normalizedType)) {
    return 5;
  }

  // Variable duration segments (BODY-X, PEAK)
  const variableTypes = normalizedType.startsWith('BODY') || normalizedType === 'PEAK';
  if (variableTypes) {
    // 30s video = tight pacing (5s per segment)
    if (videoDuration === '30s') {
      return 5;
    }
    // 60s/90s video = standard pacing (10s per segment)
    return 10;
  }

  // Default fallback
  return 5;
}

function getDurationExplanation(segmentType, videoDuration) {
  const normalizedType = segmentType.toUpperCase();
  const duration = calculateSegmentDuration(segmentType, videoDuration);

  if (['HOOK', 'FORE', 'CTA', 'LOOP-END'].includes(normalizedType)) {
    return `${duration}s (fixed for ${normalizedType})`;
  }

  if (normalizedType.startsWith('BODY') || normalizedType === 'PEAK') {
    if (videoDuration === '30s') {
      return `${duration}s (tight pacing for 30s video)`;
    }
    return `${duration}s (standard pacing for ${videoDuration} video)`;
  }

  return `${duration}s`;
}

// Test Cases
const testCases = [
  // 30s video
  { type: 'HOOK', duration: '30s', expected: 5 },
  { type: 'FORE', duration: '30s', expected: 5 },
  { type: 'BODY-1', duration: '30s', expected: 5 },
  { type: 'BODY-2', duration: '30s', expected: 5 },
  { type: 'PEAK', duration: '30s', expected: 5 },
  { type: 'CTA', duration: '30s', expected: 5 },
  { type: 'LOOP-END', duration: '30s', expected: 5 },

  // 60s video
  { type: 'HOOK', duration: '60s', expected: 5 },
  { type: 'FORE', duration: '60s', expected: 5 },
  { type: 'BODY-1', duration: '60s', expected: 10 },
  { type: 'BODY-2', duration: '60s', expected: 10 },
  { type: 'PEAK', duration: '60s', expected: 10 },
  { type: 'CTA', duration: '60s', expected: 5 },
  { type: 'LOOP-END', duration: '60s', expected: 5 },

  // 90s video
  { type: 'HOOK', duration: '90s', expected: 5 },
  { type: 'FORE', duration: '90s', expected: 5 },
  { type: 'BODY-1', duration: '90s', expected: 10 },
  { type: 'BODY-2', duration: '90s', expected: 10 },
  { type: 'BODY-3', duration: '90s', expected: 10 },
  { type: 'BODY-4', duration: '90s', expected: 10 },
  { type: 'PEAK', duration: '90s', expected: 10 },
  { type: 'CTA', duration: '90s', expected: 5 },
  { type: 'LOOP-END', duration: '90s', expected: 5 },
];

console.log('📊 Test Results:\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const actual = calculateSegmentDuration(test.type, test.duration);
  const explanation = getDurationExplanation(test.type, test.duration);
  const status = actual === test.expected ? '✅' : '❌';

  if (actual === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} ${test.type.padEnd(10)} | ${test.duration} | Expected: ${test.expected}s | Got: ${actual}s`);
  console.log(`   Explanation: ${explanation}\n`);
});

console.log('\n📈 Summary:');
console.log(`   Passed: ${passed}/${testCases.length}`);
console.log(`   Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Auto-duration logic is working correctly.\n');
} else {
  console.log('\n⚠️  Some tests failed. Please check the logic.\n');
}

// Example: Calculate total duration for typical videos
console.log('\n📺 Example Total Durations:\n');

const video30s = [
  { type: 'HOOK' }, { type: 'FORE' }, { type: 'BODY-1' }, { type: 'BODY-2' },
  { type: 'PEAK' }, { type: 'CTA' }
];

const video60s = [
  { type: 'HOOK' }, { type: 'FORE' }, { type: 'BODY-1' }, { type: 'BODY-2' },
  { type: 'BODY-3' }, { type: 'PEAK' }, { type: 'CTA' }, { type: 'LOOP-END' }
];

const total30 = video30s.reduce((sum, seg) => sum + calculateSegmentDuration(seg.type, '30s'), 0);
const total60 = video60s.reduce((sum, seg) => sum + calculateSegmentDuration(seg.type, '60s'), 0);

console.log(`30s video (6 segments): ${total30}s total`);
console.log(`   Breakdown: HOOK(5s) + FORE(5s) + BODY-1(5s) + BODY-2(5s) + PEAK(5s) + CTA(5s)`);

console.log(`\n60s video (8 segments): ${total60}s total`);
console.log(`   Breakdown: HOOK(5s) + FORE(5s) + BODY-1(10s) + BODY-2(10s) + BODY-3(10s) + PEAK(10s) + CTA(5s) + LOOP-END(5s)`);
