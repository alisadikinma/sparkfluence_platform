// ============================================================================
// Sparkfluence Studio — Sticker Library
// Static sticker catalog with keyword-based search and category browsing.
// In Phase 5, this will be extended with Tenor/LottieFiles/Pixabay APIs.
// ============================================================================

import { StickerMeta, StickerCategory } from '../types/studio';

// --- Built-in Sticker Catalog ---
// Using emoji placeholders as src/thumbnail for MVP.
// Phase 5 replaces these with actual Lottie/PNG assets.

const STICKERS: StickerMeta[] = [
  // Finance
  { id: 'stk_money_bag', name: 'Money Bag', category: 'finance', tags: ['uang', 'money', 'cuan', 'dollar', 'kaya', 'rich'], format: 'png', animated: false, src: '/assets/stickers/money-bag.png', thumbnail: '/assets/stickers/money-bag.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_chart_up', name: 'Chart Up', category: 'finance', tags: ['naik', 'growth', 'saham', 'investasi', 'profit', 'grafik', 'chart'], format: 'png', animated: false, src: '/assets/stickers/chart-up.png', thumbnail: '/assets/stickers/chart-up.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_tax', name: 'Tax Document', category: 'finance', tags: ['pajak', 'tax', 'pemerintah', 'government', 'document'], format: 'png', animated: false, src: '/assets/stickers/tax.png', thumbnail: '/assets/stickers/tax.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_wallet', name: 'Wallet', category: 'finance', tags: ['dompet', 'wallet', 'uang', 'belanja', 'hemat'], format: 'png', animated: false, src: '/assets/stickers/wallet.png', thumbnail: '/assets/stickers/wallet.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_coin_stack', name: 'Coin Stack', category: 'finance', tags: ['koin', 'coin', 'tabungan', 'saving', 'gold'], format: 'png', animated: false, src: '/assets/stickers/coin-stack.png', thumbnail: '/assets/stickers/coin-stack.png', dimensions: { w: 512, h: 512 } },

  // Tech
  { id: 'stk_phone', name: 'Smartphone', category: 'tech', tags: ['hp', 'phone', 'iphone', 'samsung', 'gadget', 'smartphone'], format: 'png', animated: false, src: '/assets/stickers/phone.png', thumbnail: '/assets/stickers/phone.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_laptop', name: 'Laptop', category: 'tech', tags: ['laptop', 'komputer', 'macbook', 'kerja', 'coding'], format: 'png', animated: false, src: '/assets/stickers/laptop.png', thumbnail: '/assets/stickers/laptop.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_ai_chip', name: 'AI Chip', category: 'tech', tags: ['ai', 'artificial', 'intelligence', 'chip', 'teknologi', 'robot'], format: 'png', animated: false, src: '/assets/stickers/ai-chip.png', thumbnail: '/assets/stickers/ai-chip.png', dimensions: { w: 512, h: 512 } },

  // Food
  { id: 'stk_food_plate', name: 'Food Plate', category: 'food', tags: ['makanan', 'food', 'makan', 'resep', 'masak', 'piring'], format: 'png', animated: false, src: '/assets/stickers/food-plate.png', thumbnail: '/assets/stickers/food-plate.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_chef_hat', name: 'Chef Hat', category: 'food', tags: ['chef', 'masak', 'dapur', 'cook', 'kitchen', 'resep'], format: 'png', animated: false, src: '/assets/stickers/chef-hat.png', thumbnail: '/assets/stickers/chef-hat.png', dimensions: { w: 512, h: 512 } },

  // Health
  { id: 'stk_heart', name: 'Heart', category: 'health', tags: ['jantung', 'heart', 'sehat', 'health', 'love', 'cinta'], format: 'png', animated: false, src: '/assets/stickers/heart.png', thumbnail: '/assets/stickers/heart.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_fitness', name: 'Dumbbell', category: 'health', tags: ['olahraga', 'fitness', 'gym', 'sport', 'kuat', 'otot'], format: 'png', animated: false, src: '/assets/stickers/dumbbell.png', thumbnail: '/assets/stickers/dumbbell.png', dimensions: { w: 512, h: 512 } },

  // Education
  { id: 'stk_book', name: 'Book', category: 'education', tags: ['buku', 'book', 'belajar', 'study', 'sekolah', 'ilmu'], format: 'png', animated: false, src: '/assets/stickers/book.png', thumbnail: '/assets/stickers/book.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_graduation', name: 'Graduation Cap', category: 'education', tags: ['wisuda', 'graduation', 'toga', 'universitas', 'sarjana'], format: 'png', animated: false, src: '/assets/stickers/graduation.png', thumbnail: '/assets/stickers/graduation.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_lightbulb', name: 'Light Bulb', category: 'education', tags: ['ide', 'idea', 'tips', 'insight', 'lampu', 'pintar'], format: 'png', animated: false, src: '/assets/stickers/lightbulb.png', thumbnail: '/assets/stickers/lightbulb.png', dimensions: { w: 512, h: 512 } },

  // Emoji
  { id: 'stk_shocked', name: 'Shocked Face', category: 'emoji', tags: ['shock', 'kaget', 'surprised', 'wow', 'omg'], format: 'png', animated: false, src: '/assets/stickers/shocked.png', thumbnail: '/assets/stickers/shocked.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_fire_emoji', name: 'Fire', category: 'emoji', tags: ['fire', 'hot', 'api', 'viral', 'trending', 'panas'], format: 'png', animated: false, src: '/assets/stickers/fire.png', thumbnail: '/assets/stickers/fire.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_cry_laugh', name: 'Cry Laughing', category: 'emoji', tags: ['lucu', 'funny', 'laugh', 'haha', 'ngakak', 'lol'], format: 'png', animated: false, src: '/assets/stickers/cry-laugh.png', thumbnail: '/assets/stickers/cry-laugh.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_thinking', name: 'Thinking', category: 'emoji', tags: ['mikir', 'thinking', 'hmm', 'bingung', 'question'], format: 'png', animated: false, src: '/assets/stickers/thinking.png', thumbnail: '/assets/stickers/thinking.png', dimensions: { w: 512, h: 512 } },

  // Badges
  { id: 'stk_badge_1', name: 'Badge #1', category: 'badges', tags: ['1', 'pertama', 'first', 'satu', 'step', 'langkah'], format: 'png', animated: false, src: '/assets/stickers/badge-1.png', thumbnail: '/assets/stickers/badge-1.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_badge_2', name: 'Badge #2', category: 'badges', tags: ['2', 'kedua', 'second', 'dua', 'step', 'langkah'], format: 'png', animated: false, src: '/assets/stickers/badge-2.png', thumbnail: '/assets/stickers/badge-2.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_badge_3', name: 'Badge #3', category: 'badges', tags: ['3', 'ketiga', 'third', 'tiga', 'step', 'langkah'], format: 'png', animated: false, src: '/assets/stickers/badge-3.png', thumbnail: '/assets/stickers/badge-3.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_checkmark', name: 'Checkmark', category: 'badges', tags: ['check', 'done', 'selesai', 'benar', 'correct', 'verified'], format: 'png', animated: false, src: '/assets/stickers/checkmark.png', thumbnail: '/assets/stickers/checkmark.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_star', name: 'Star', category: 'badges', tags: ['bintang', 'star', 'rating', 'terbaik', 'best', 'top'], format: 'png', animated: false, src: '/assets/stickers/star.png', thumbnail: '/assets/stickers/star.png', dimensions: { w: 512, h: 512 } },

  // Effects
  { id: 'stk_sparkle', name: 'Sparkle', category: 'effects', tags: ['sparkle', 'bling', 'kilau', 'shine', 'glow', 'wow'], format: 'png', animated: false, src: '/assets/stickers/sparkle.png', thumbnail: '/assets/stickers/sparkle.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_arrow_down', name: 'Arrow Down', category: 'effects', tags: ['arrow', 'panah', 'down', 'turun', 'lihat', 'point'], format: 'png', animated: false, src: '/assets/stickers/arrow-down.png', thumbnail: '/assets/stickers/arrow-down.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_warning', name: 'Warning Triangle', category: 'effects', tags: ['warning', 'bahaya', 'hati-hati', 'danger', 'alert', 'peringatan'], format: 'png', animated: false, src: '/assets/stickers/warning.png', thumbnail: '/assets/stickers/warning.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_exclaim', name: 'Exclamation', category: 'effects', tags: ['penting', 'important', 'attention', 'perhatian', 'notice', 'alert'], format: 'png', animated: false, src: '/assets/stickers/exclamation.png', thumbnail: '/assets/stickers/exclamation.png', dimensions: { w: 512, h: 512 } },

  // Social
  { id: 'stk_like', name: 'Like Button', category: 'social', tags: ['like', 'suka', 'thumbs', 'up', 'love'], format: 'png', animated: false, src: '/assets/stickers/like.png', thumbnail: '/assets/stickers/like.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_subscribe', name: 'Subscribe', category: 'social', tags: ['subscribe', 'sub', 'follow', 'ikuti', 'bell'], format: 'png', animated: false, src: '/assets/stickers/subscribe.png', thumbnail: '/assets/stickers/subscribe.png', dimensions: { w: 512, h: 512 } },
  { id: 'stk_share', name: 'Share', category: 'social', tags: ['share', 'bagikan', 'kirim', 'send', 'forward'], format: 'png', animated: false, src: '/assets/stickers/share.png', thumbnail: '/assets/stickers/share.png', dimensions: { w: 512, h: 512 } },
];

// --- Category metadata ---
export const STICKER_CATEGORIES: { id: StickerCategory; label: string; icon: string }[] = [
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'health', label: 'Health', icon: '❤️' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'emoji', label: 'Emoji', icon: '😃' },
  { id: 'badges', label: 'Badges', icon: '🏅' },
  { id: 'effects', label: 'Effects', icon: '✨' },
  { id: 'social', label: 'Social', icon: '👍' },
];

// --- Search ---
export function searchStickers(query: string): StickerMeta[] {
  if (!query.trim()) return STICKERS;
  const terms = query.toLowerCase().split(/\s+/);
  return STICKERS.filter(sticker => {
    const searchable = [sticker.name, sticker.category, ...sticker.tags]
      .join(' ')
      .toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}

// --- Filter by Category ---
export function getStickersByCategory(category: StickerCategory): StickerMeta[] {
  return STICKERS.filter(s => s.category === category);
}

// --- Get All ---
export function getAllStickers(): StickerMeta[] {
  return STICKERS;
}

// --- Get by ID ---
export function getStickerById(id: string): StickerMeta | undefined {
  return STICKERS.find(s => s.id === id);
}

// --- Keyword → Sticker Suggestions ---
// Used by AI auto-composition to suggest stickers based on script keywords.

interface KeywordRule {
  keywords: string[];
  stickerIds: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['uang', 'money', 'cuan', 'dollar', 'kaya', 'rich', 'gaji', 'salary'], stickerIds: ['stk_money_bag', 'stk_coin_stack', 'stk_wallet'] },
  { keywords: ['pajak', 'tax', 'ppn', 'pph'], stickerIds: ['stk_tax', 'stk_chart_up', 'stk_warning'] },
  { keywords: ['naik', 'growth', 'profit', 'untung', 'meningkat'], stickerIds: ['stk_chart_up', 'stk_fire_emoji'] },
  { keywords: ['saham', 'investasi', 'invest', 'crypto', 'bitcoin'], stickerIds: ['stk_chart_up', 'stk_coin_stack'] },
  { keywords: ['hp', 'phone', 'iphone', 'samsung', 'gadget', 'smartphone'], stickerIds: ['stk_phone'] },
  { keywords: ['laptop', 'komputer', 'macbook', 'pc'], stickerIds: ['stk_laptop'] },
  { keywords: ['ai', 'artificial', 'chatgpt', 'robot', 'teknologi'], stickerIds: ['stk_ai_chip'] },
  { keywords: ['makanan', 'food', 'makan', 'resep', 'masak', 'kuliner'], stickerIds: ['stk_food_plate', 'stk_chef_hat'] },
  { keywords: ['sehat', 'health', 'olahraga', 'fitness', 'gym', 'diet'], stickerIds: ['stk_heart', 'stk_fitness'] },
  { keywords: ['belajar', 'study', 'sekolah', 'kuliah', 'ilmu', 'tips'], stickerIds: ['stk_book', 'stk_lightbulb'] },
  { keywords: ['wisuda', 'graduation', 'lulus', 'sarjana'], stickerIds: ['stk_graduation'] },
  { keywords: ['bahaya', 'danger', 'hati-hati', 'warning', 'awas'], stickerIds: ['stk_warning', 'stk_exclaim'] },
  { keywords: ['pertama', 'first', '1.', 'langkah 1', 'step 1', 'tips 1'], stickerIds: ['stk_badge_1'] },
  { keywords: ['kedua', 'second', '2.', 'langkah 2', 'step 2', 'tips 2'], stickerIds: ['stk_badge_2'] },
  { keywords: ['ketiga', 'third', '3.', 'langkah 3', 'step 3', 'tips 3'], stickerIds: ['stk_badge_3'] },
  { keywords: ['subscribe', 'follow', 'ikuti'], stickerIds: ['stk_subscribe', 'stk_like'] },
  { keywords: ['share', 'bagikan', 'kirim'], stickerIds: ['stk_share'] },
  { keywords: ['viral', 'trending', 'hot', 'fire'], stickerIds: ['stk_fire_emoji', 'stk_sparkle'] },
  { keywords: ['lucu', 'funny', 'ngakak', 'haha', 'lol'], stickerIds: ['stk_cry_laugh'] },
  { keywords: ['shock', 'kaget', 'wow', 'omg', 'gila'], stickerIds: ['stk_shocked', 'stk_exclaim'] },
];

export function suggestStickersForText(text: string): StickerMeta[] {
  const lower = text.toLowerCase();
  const matchedIds = new Set<string>();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      rule.stickerIds.forEach(id => matchedIds.add(id));
    }
  }

  return Array.from(matchedIds)
    .map(id => getStickerById(id))
    .filter((s): s is StickerMeta => s !== undefined);
}
