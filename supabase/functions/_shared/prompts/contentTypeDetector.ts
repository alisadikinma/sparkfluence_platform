/**
 * CONTENT TYPE DETECTOR - P0 #1
 * Detects content type from topic and filters relevant hooks
 * 
 * Purpose: Reduce LLM context from 5000+ words to ~300 relevant words
 * by only sending hooks that match the detected content type.
 * 
 * Created: 2026-01-13
 */

// ============================================================================
// CONTENT TYPE DEFINITIONS
// ============================================================================

export type ContentType = 
  | 'listicle'      // "5 tips", "7 cara", numbered items
  | 'tutorial'      // "how to", "cara", step-by-step
  | 'controversy'   // hot takes, unpopular opinions
  | 'transformation'// before/after, glow up, journey
  | 'comparison'    // vs, perbandingan, which is better
  | 'story'         // personal story, pengalaman
  | 'news'          // trending, breaking, update
  | 'review'        // honest review, worth it?
  | 'challenge'     // I tried X for Y days
  | 'educational'   // fakta, tahukah, did you know
  | 'general';      // fallback

export interface ContentTypeResult {
  primary_type: ContentType;
  secondary_type?: ContentType;
  confidence: number; // 0-100
  item_count?: number; // For listicles
  detected_patterns: string[];
  recommended_hooks: string[];
  recommended_structure: string;
}

// ============================================================================
// DETECTION PATTERNS (Multi-language)
// ============================================================================

const TYPE_PATTERNS: Record<ContentType, RegExp[]> = {
  listicle: [
    /(\d+)\s*(tips?|trik|cara|langkah|step|hack|alasan|reason|fakta|hal|thing)/i,
    /(\d+)\s*(masakan|makanan|minuman|produk|brand|tempat|film|game)/i,
    /top\s*(\d+)/i,
    /(\d+)\s*(best|terbaik|terburuk|worst)/i,
    /daftar|list of/i,
  ],
  tutorial: [
    /\bcara\s+\w+/i,      // "Cara Investasi", "Cara Bikin", "Cara Masak" — any "Cara [X]"
    /how\s+to/i,
    /tutorial/i,
    /step[\s-]by[\s-]step/i,
    /panduan|guide/i,
    /begini\s+caranya/i,
    /\blearn\s+\w+/i,     // "Learn Python", "Learn Cooking"
    /\bbelajar\s+\w+/i,   // "Belajar Coding"
    /\bmaster\s+\w+/i,    // "Master Photography"
    /untuk\s+pemula/i,    // "untuk Pemula" (for beginners)
    /\bbeginner/i,        // "Beginner's guide"
  ],
  controversy: [
    /unpopular\s+opinion/i,
    /kontroversial/i,
    /hot\s+take/i,
    /yang\s+salah/i,
    /sebenarnya/i,
    /ternyata\s+.*\s+salah/i,
    /stop\s+doing/i,
    /jangan\s+(lagi|pernah)/i,
  ],
  transformation: [
    /before[\s&]+after/i,
    /sebelum[\s&]+sesudah/i,
    /glow\s*up/i,
    /transformasi/i,
    /dari\s+\d+\s+ke\s+\d+/i,
    /perjalanan|journey/i,
    /hasil\s+\d+\s+(hari|minggu|bulan)/i,
  ],
  comparison: [
    /\bvs\.?\b/i,
    /versus/i,
    /perbandingan/i,
    /compare|comparison/i,
    /mana\s+yang\s+(lebih|better)/i,
    /pilih\s+mana/i,
    /difference|perbedaan/i,
  ],
  story: [
    /cerita\s+(gue|saya|aku)/i,
    /pengalaman/i,
    /kisah/i,
    /story\s+time/i,
    /waktu\s+itu/i,
    /pernah\s+.*\s+gue/i,
  ],
  news: [
    /breaking/i,
    /update\s+terbaru/i,
    /berita/i,
    /trending/i,
    /viral\s+.*\s+(hari|minggu)\s+ini/i,
    /baru\s+saja/i,
  ],
  review: [
    /review/i,
    /honest\s+(review|opinion)/i,
    /worth\s+it/i,
    /apakah\s+.*\s+bagus/i,
    /kelebihan\s+.*\s+kekurangan/i,
    /pros?\s+.*\s+cons?/i,
  ],
  challenge: [
    /i\s+tried/i,
    /gue\s+(coba|cobain)/i,
    /challenge/i,
    /\d+\s+(hari|day|minggu|week)\s+challenge/i,
    /eksperimen/i,
    /hasilnya/i,
  ],
  educational: [
    /tahukah\s+(kamu|lo)/i,
    /did\s+you\s+know/i,
    /fakta/i,
    /ternyata/i,
    /rahasia/i,
    /secret/i,
    /mengapa|kenapa|why/i,
    /\btips?\b/i,         // "Finance Tips", "Travel tip"
    /\btrick\b/i,
    /\bhacks?\b/i,        // "Life hacks" without number prefix
    /\bguide\b/i,
    /\bexplain/i,
  ],
  general: [] // Fallback, no patterns
};

// ============================================================================
// HOOK TEMPLATES BY CONTENT TYPE
// ============================================================================

const HOOKS_BY_TYPE: Record<ContentType, { 
  indonesian: string[]; 
  hindi: string[];
  english: string[];
}> = {
  listicle: {
    indonesian: [
      '"[X] [item] yang wajib lo tau—yang terakhir paling gila!"',
      '"Gue kasih [X] [item], dan nomor [X] ini literally life-changing!"',
      '"[X] [item] yang 90% orang nggak tau—stay sampai akhir!"',
    ],
    hindi: [
      '"[X] cheezein jo tumhe zaroor jaanni chahiye—last wali sabse crazy!"',
      '"Main bataunga [X] [items], teesri wali game-changer hai!"',
      '"[X] [items] jo 90% log nahi jaante—end tak dekho!"',
    ],
    english: [
      '"[X] [items] you need to know—the last one is insane!"',
      '"Here are [X] [items] that changed everything for me!"',
      '"[X] [items] that 90% of people don\'t know about!"',
    ],
  },
  tutorial: {
    indonesian: [
      '"Cara [X] yang literally semua orang salah lakuin!"',
      '"Tutorial [X] paling simple—bahkan bocah SD bisa!"',
      '"Lo masih [kesalahan umum]? Ini cara benernya!"',
    ],
    hindi: [
      '"[X] karne ka sahi tarika jo koi nahi batata!"',
      '"Sabse easy tutorial—5 saal ka bachcha bhi kar sakta hai!"',
      '"Abhi bhi [common mistake]? Ye hai sahi method!"',
    ],
    english: [
      '"The right way to [X] that nobody talks about!"',
      '"Easiest tutorial ever—even a 5-year-old could do this!"',
      '"Still doing [X] wrong? Here\'s the correct method!"',
    ],
  },
  controversy: {
    indonesian: [
      '"Unpopular opinion: [X] itu sebenarnya [counter-claim]!"',
      '"STOP! Jangan lakuin [X] lagi—ini alasannya!"',
      '"Semua yang lo tau tentang [X] itu SALAH!"',
    ],
    hindi: [
      '"Unpopular opinion: [X] actually [counter-claim] hai!"',
      '"RUKO! [X] karna band karo—ye hai reason!"',
      '"[X] ke baare mein sab galat jaante hain!"',
    ],
    english: [
      '"Unpopular opinion: [X] is actually [counter-claim]!"',
      '"STOP doing [X] right now—here\'s why!"',
      '"Everything you know about [X] is WRONG!"',
    ],
  },
  transformation: {
    indonesian: [
      '"Dari [before] ke [after] dalam [waktu]—ini prosesnya!"',
      '"Glow up gue dari [X] ke [Y]—no edit!"',
      '"[Waktu] lalu gue [before], sekarang [after]!"',
    ],
    hindi: [
      '"[Before] se [after] tak ka safar—ye hai process!"',
      '"Mera transformation [X] se [Y] tak—no filter!"',
      '"[Time] pehle main [before] tha, ab [after]!"',
    ],
    english: [
      '"From [before] to [after] in [time]—here\'s how!"',
      '"My glow up from [X] to [Y]—completely real!"',
      '"[Time] ago I was [before], now I\'m [after]!"',
    ],
  },
  comparison: {
    indonesian: [
      '"[A] vs [B]—mana yang lebih worth it?"',
      '"Gue bandingin [A] sama [B]—hasilnya shocking!"',
      '"[A] atau [B]? Jawaban di akhir video!"',
    ],
    hindi: [
      '"[A] vs [B]—konsa better hai?"',
      '"Maine compare kiya [A] aur [B]—result shocking hai!"',
      '"[A] ya [B]? Answer end mein!"',
    ],
    english: [
      '"[A] vs [B]—which one is actually worth it?"',
      '"I compared [A] and [B]—the results are shocking!"',
      '"[A] or [B]? The answer at the end!"',
    ],
  },
  story: {
    indonesian: [
      '"Cerita gue waktu [pengalaman]—plot twist di akhir!"',
      '"Lo nggak bakal percaya apa yang terjadi waktu gue [X]..."',
      '"Pengalaman gue [X]—ini yang gue pelajari!"',
    ],
    hindi: [
      '"Meri kahani jab [experience]—twist end mein!"',
      '"Tum believe nahi karoge jab maine [X] kiya..."',
      '"Mera experience [X]—ye sikha maine!"',
    ],
    english: [
      '"My story when [experience]—plot twist at the end!"',
      '"You won\'t believe what happened when I [X]..."',
      '"My experience with [X]—here\'s what I learned!"',
    ],
  },
  news: {
    indonesian: [
      '"BREAKING: [Berita] yang lagi viral hari ini!"',
      '"Update terbaru [X]—ini yang lo perlu tau!"',
      '"[X] baru aja terjadi—ini faktanya!"',
    ],
    hindi: [
      '"BREAKING: [News] jo aaj viral ho rahi hai!"',
      '"Latest update [X]—ye jaanna zaruri hai!"',
      '"[X] abhi abhi hua—ye hai sach!"',
    ],
    english: [
      '"BREAKING: [News] that\'s going viral today!"',
      '"Latest update on [X]—here\'s what you need to know!"',
      '"[X] just happened—here are the facts!"',
    ],
  },
  review: {
    indonesian: [
      '"Honest review [X]—worth it atau nggak?"',
      '"Gue udah pake [X] [waktu]—ini hasilnya!"',
      '"[X] bagus atau cuma hype? Jawaban jujur gue!"',
    ],
    hindi: [
      '"Honest review [X]—worth hai ya nahi?"',
      '"Maine [X] use kiya [time]—ye hai result!"',
      '"[X] achha hai ya sirf hype? Mera honest opinion!"',
    ],
    english: [
      '"Honest review of [X]—is it worth it?"',
      '"I\'ve used [X] for [time]—here\'s my verdict!"',
      '"[X] good or just hype? My honest opinion!"',
    ],
  },
  challenge: {
    indonesian: [
      '"Gue coba [X] selama [waktu]—hasilnya gila!"',
      '"[Waktu] challenge [X]—ini yang terjadi!"',
      '"Eksperimen [X]—hasil di akhir video!"',
    ],
    hindi: [
      '"Maine [X] try kiya [time] tak—result crazy hai!"',
      '"[Time] challenge [X]—ye hua!"',
      '"[X] experiment—result end mein!"',
    ],
    english: [
      '"I tried [X] for [time]—the results are insane!"',
      '"[Time] challenge: [X]—here\'s what happened!"',
      '"[X] experiment—results at the end!"',
    ],
  },
  educational: {
    indonesian: [
      '"Tahukah lo kenapa [X]? Ternyata..."',
      '"Fakta [X] yang 99% orang nggak tau!"',
      '"Rahasia [X] yang selama ini disembunyikan!"',
    ],
    hindi: [
      '"Kya tum jaante ho [X] kyun? Actually..."',
      '"[X] ke facts jo 99% log nahi jaante!"',
      '"[X] ka secret jo chhupaya gaya hai!"',
    ],
    english: [
      '"Did you know why [X]? Turns out..."',
      '"Facts about [X] that 99% don\'t know!"',
      '"The secret about [X] that\'s been hidden!"',
    ],
  },
  general: {
    indonesian: [
      '"Lo wajib tau ini tentang [X]!"',
      '"[X] yang lagi viral—ini faktanya!"',
      '"Gue bakal kasih tau tentang [X]—stay sampai akhir!"',
    ],
    hindi: [
      '"[X] ke baare mein ye jaanna zaruri hai!"',
      '"[X] jo viral ho raha hai—ye hai fact!"',
      '"Main bataunga [X]—end tak dekho!"',
    ],
    english: [
      '"You need to know this about [X]!"',
      '"[X] that\'s going viral—here are the facts!"',
      '"I\'ll tell you about [X]—watch till the end!"',
    ],
  },
};

// ============================================================================
// STRUCTURE RECOMMENDATIONS BY TYPE
// ============================================================================

const STRUCTURE_BY_TYPE: Record<ContentType, string> = {
  listicle: `
**LISTICLE STRUCTURE:**
- HOOK: Announce number + tease best item
- FORE: "Yang ke-[N] ini paling gila—tonton sampai habis!"
- BODY-1 to BODY-N: One item per segment (name + why special)
- PEAK: THE BEST item (teased in FORE)
- CTA: "Follow buat rekomendasi lainnya!"`,

  tutorial: `
**TUTORIAL STRUCTURE:**
- HOOK: State common mistake or pain point
- FORE: Promise simple solution + tease result
- BODY-1: Step 1 (setup/preparation)
- BODY-2: Step 2 (main action)
- BODY-3: Step 3 (finishing touches)
- PEAK: Show final result/proof
- CTA: "Save buat nanti!" or "Drop emoji kalau berhasil!"`,

  controversy: `
**CONTROVERSY STRUCTURE:**
- HOOK: Bold contrarian statement (shock value)
- FORE: "Gue tau ini kontroversial, tapi dengerin dulu..."
- BODY-1: State the popular belief (what people think)
- BODY-2: Present counter-evidence
- BODY-3: Your conclusion/argument
- PEAK: The "aha moment" proof
- CTA: "Setuju atau nggak? Comment!"`,

  transformation: `
**TRANSFORMATION STRUCTURE:**
- HOOK: Show/state the AFTER result first
- FORE: Tease the journey + "Gimana caranya? Stay!"
- BODY-1: The BEFORE state (problem/starting point)
- BODY-2: The process/method
- BODY-3: Key turning point
- PEAK: Side-by-side comparison
- CTA: "Tag temen yang butuh transformasi ini!"`,

  comparison: `
**COMPARISON STRUCTURE:**
- HOOK: Present the dilemma (A vs B)
- FORE: "Hasilnya bikin kaget—tonton sampai habis!"
- BODY-1: Overview of A (features, pros)
- BODY-2: Overview of B (features, pros)
- BODY-3: Head-to-head comparison
- PEAK: The verdict/winner reveal
- CTA: "Lo tim mana? A atau B?"`,

  story: `
**STORY STRUCTURE:**
- HOOK: State the climax/twist (create curiosity)
- FORE: "Cerita lengkapnya bikin merinding—stay!"
- BODY-1: Setting/context (kapan, dimana)
- BODY-2: Rising action (apa yang terjadi)
- BODY-3: The conflict/problem
- PEAK: The resolution/lesson
- CTA: "Share pengalaman serupa di comment!"`,

  news: `
**NEWS STRUCTURE:**
- HOOK: Breaking headline (urgency)
- FORE: "Ini yang perlu lo tau sekarang!"
- BODY-1: What happened (facts)
- BODY-2: Why it matters
- BODY-3: What's next/implications
- PEAK: Your take/analysis
- CTA: "Follow buat update terbaru!"`,

  review: `
**REVIEW STRUCTURE:**
- HOOK: Verdict teaser (worth it or not?)
- FORE: "Gue udah pake [waktu]—honest review!"
- BODY-1: First impressions
- BODY-2: Pros/what's good
- BODY-3: Cons/what's bad
- PEAK: Final verdict with rating
- CTA: "Worth it? Lo yang tentuin!"`,

  challenge: `
**CHALLENGE STRUCTURE:**
- HOOK: State the challenge + tease shocking result
- FORE: "Hasil di akhir bikin kaget!"
- BODY-1: Day 1 / Starting point
- BODY-2: Mid-challenge update
- BODY-3: Difficulties/struggles
- PEAK: Final result reveal
- CTA: "Berani coba? Tag temen!"`,

  educational: `
**EDUCATIONAL STRUCTURE:**
- HOOK: Surprising fact or question
- FORE: "Ini yang selama ini lo nggak tau..."
- BODY-1: The common misconception
- BODY-2: The actual fact/truth
- BODY-3: Why this matters
- PEAK: Mind-blowing conclusion
- CTA: "Save buat dibaca lagi!"`,

  general: `
**GENERAL STRUCTURE:**
- HOOK: Attention-grabbing statement
- FORE: Tease the value + "Stay sampai akhir!"
- BODY segments: Deliver main content
- PEAK: Best insight/reveal
- CTA: Engagement ask`,
};

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect content type from topic text
 * Returns primary type, confidence, and relevant hooks
 */
export function detectContentType(
  topic: string,
  language: string = 'indonesian'
): ContentTypeResult {
  const detectedPatterns: string[] = [];
  const scores: Record<ContentType, number> = {
    listicle: 0, tutorial: 0, controversy: 0, transformation: 0,
    comparison: 0, story: 0, news: 0, review: 0, challenge: 0,
    educational: 0, general: 0
  };

  // Score each content type based on pattern matches
  for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = topic.match(pattern);
      if (match) {
        scores[type as ContentType] += 10;
        detectedPatterns.push(`${type}: "${match[0]}"`);
      }
    }
  }

  // Find primary and secondary types
  const sortedTypes = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0);

  const primaryType = sortedTypes[0]?.[0] as ContentType || 'general';
  const secondaryType = sortedTypes[1]?.[0] as ContentType;
  const confidence = sortedTypes[0]?.[1] ? Math.min(100, sortedTypes[0][1] * 10) : 50;

  // Extract item count for listicles
  let itemCount: number | undefined;
  if (primaryType === 'listicle') {
    const countMatch = topic.match(/(\d+)\s*(tips?|trik|cara|masakan|makanan|produk|fakta|hal|thing|best)/i);
    if (countMatch) {
      itemCount = parseInt(countMatch[1]);
    }
  }

  // Get recommended hooks for the detected type
  const lang = language as 'indonesian' | 'hindi' | 'english';
  const hooks = HOOKS_BY_TYPE[primaryType]?.[lang] || HOOKS_BY_TYPE.general[lang];

  return {
    primary_type: primaryType,
    secondary_type: secondaryType,
    confidence,
    item_count: itemCount,
    detected_patterns: detectedPatterns,
    recommended_hooks: hooks,
    recommended_structure: STRUCTURE_BY_TYPE[primaryType],
  };
}

/**
 * Get filtered hook templates for LLM prompt
 * Reduces context from ~5000 words to ~300 words
 */
export function getFilteredHooksForPrompt(
  topic: string,
  language: string = 'indonesian'
): string {
  const detection = detectContentType(topic, language);
  const lang = language as 'indonesian' | 'hindi' | 'english';

  // Get hooks for primary type
  const primaryHooks = HOOKS_BY_TYPE[detection.primary_type]?.[lang] || [];
  
  // Get hooks for secondary type if exists
  const secondaryHooks = detection.secondary_type 
    ? HOOKS_BY_TYPE[detection.secondary_type]?.[lang] || []
    : [];

  // Combine and dedupe
  const allHooks = [...new Set([...primaryHooks, ...secondaryHooks])];

  return `
## CONTENT TYPE DETECTED: ${detection.primary_type.toUpperCase()}
${detection.secondary_type ? `Secondary: ${detection.secondary_type}` : ''}
Confidence: ${detection.confidence}%
${detection.item_count ? `Expected items: ${detection.item_count}` : ''}

## RECOMMENDED HOOKS FOR THIS CONTENT:
${allHooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## STRUCTURE GUIDE:
${detection.recommended_structure}
`;
}

/**
 * Validate that script covers all expected items (for listicles)
 */
export function validateItemCoverage(
  topic: string,
  segments: any[]
): { valid: boolean; expected: number; found: number; message: string } {
  const detection = detectContentType(topic);
  
  if (detection.primary_type !== 'listicle' || !detection.item_count) {
    return { valid: true, expected: 0, found: 0, message: 'Not a listicle - no item validation needed' };
  }

  // Count BODY and PEAK segments (where items should be)
  const contentSegments = segments.filter(s => 
    s.type?.toUpperCase().startsWith('BODY') || 
    s.type?.toUpperCase() === 'PEAK'
  );

  const expected = detection.item_count;
  const found = contentSegments.length;

  if (found < expected) {
    return {
      valid: false,
      expected,
      found,
      message: `Topic mentions ${expected} items but only ${found} content segments. Missing ${expected - found} items!`
    };
  }

  return {
    valid: true,
    expected,
    found,
    message: `All ${expected} items covered in ${found} segments ✓`
  };
}
