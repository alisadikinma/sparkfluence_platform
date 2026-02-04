import { Topic } from '../types/topic';

// Language-aware fallback topics (9 per language to match INITIAL_COUNT)
export const fallbackTopicsByLang: Record<string, Topic[]> = {
  id: [
    { id: 1, title: "5 Kebiasaan Pagi yang Mengubah Hidupku", description: "Bagikan tips produktivitas personal yang relate dengan audience", trending_source: 'ai', hashtags: ['#morningroutine', '#produktivitas', '#tips'] },
    { id: 2, title: "Rahasia yang Tidak Pernah Dibahas Orang", description: "Ungkap pengetahuan insider yang membangun kepercayaan", trending_source: 'ai', hashtags: ['#rahasia', '#insider', '#fakta'] },
    { id: 3, title: "Dari Nol hingga Mahir dalam 30 Hari", description: "Dokumentasikan perjalananmu dan inspirasi orang lain", trending_source: 'ai', hashtags: ['#challenge', '#30hari', '#growth'] },
    { id: 4, title: "Berhenti Melakukan Kesalahan Ini", description: "Bahas masalah umum yang sering dihadapi audience", trending_source: 'ai', hashtags: ['#tips', '#mistake', '#belajar'] },
    { id: 5, title: "Cara Cepat Menguasai Skill Baru", description: "Tutorial praktis yang langsung bisa diterapkan", trending_source: 'ai', hashtags: ['#tutorial', '#skillup', '#belajar'] },
    { id: 6, title: "Fakta Mengejutkan yang Jarang Orang Tahu", description: "Konten edukatif yang bikin audience penasaran", trending_source: 'ai', hashtags: ['#fakta', '#edukasi', '#viral'] },
    { id: 7, title: "Review Jujur: Produk yang Lagi Hype", description: "Ulasan produk trending yang lagi banyak dibicarakan", trending_source: 'ai', hashtags: ['#review', '#honest', '#produk'] },
    { id: 8, title: "Day in My Life sebagai Content Creator", description: "Behind the scenes kehidupan sehari-hari yang relatable", trending_source: 'ai', hashtags: ['#dayinmylife', '#creator', '#behindthescenes'] },
    { id: 9, title: "Hal yang Gue Sesali Tidak Lakukan Lebih Awal", description: "Berbagi pengalaman hidup yang bisa jadi pelajaran", trending_source: 'ai', hashtags: ['#lifelesson', '#motivasi', '#sharing'] },
  ],
  en: [
    { id: 1, title: "5 Morning Habits That Changed My Life", description: "Share personal productivity tips that resonate with your audience", trending_source: 'ai', hashtags: ['#morningroutine', '#productivity', '#habits'] },
    { id: 2, title: "The Truth About [Your Niche] Nobody Talks About", description: "Reveal insider knowledge that builds trust and authority", trending_source: 'ai', hashtags: ['#truth', '#insider', '#exposed'] },
    { id: 3, title: "How I Went From Beginner to Pro in 30 Days", description: "Document your journey and inspire others to take action", trending_source: 'ai', hashtags: ['#journey', '#30daychallenge', '#growth'] },
    { id: 4, title: "Stop Making This Common Mistake", description: "Address pain points your audience faces daily", trending_source: 'ai', hashtags: ['#mistakes', '#tips', '#learning'] },
    { id: 5, title: "The Fastest Way to Learn Any New Skill", description: "Practical tutorial that can be applied immediately", trending_source: 'ai', hashtags: ['#tutorial', '#skillup', '#learning'] },
    { id: 6, title: "Things I Wish I Knew Before Starting", description: "Share hard-earned lessons to help beginners avoid pitfalls", trending_source: 'ai', hashtags: ['#beginner', '#advice', '#lessons'] },
    { id: 7, title: "Honest Review: Is This Worth the Hype?", description: "Give your audience an authentic take on trending products", trending_source: 'ai', hashtags: ['#review', '#honest', '#trending'] },
    { id: 8, title: "A Day in My Life as a Creator", description: "Behind the scenes content that builds authentic connection", trending_source: 'ai', hashtags: ['#dayinmylife', '#creator', '#behindthescenes'] },
    { id: 9, title: "Unpopular Opinions That Changed My Perspective", description: "Challenge conventional thinking and spark engagement", trending_source: 'ai', hashtags: ['#unpopularopinion', '#perspective', '#debate'] },
  ],
  hi: [
    { id: 1, title: "5 सुबह की आदतें जिन्होंने मेरी ज़िंदगी बदल दी", description: "व्यक्तिगत उत्पादकता टिप्स साझा करें जो आपके दर्शकों से जुड़ें", trending_source: 'ai', hashtags: ['#morningroutine', '#productivity', '#habits'] },
    { id: 2, title: "वो सच जो कोई नहीं बताता", description: "अंदरूनी जानकारी प्रकट करें जो विश्वास और अधिकार बनाती है", trending_source: 'ai', hashtags: ['#truth', '#insider', '#facts'] },
    { id: 3, title: "30 दिनों में शुरुआत से प्रो तक", description: "अपनी यात्रा का दस्तावेज़ीकरण करें और दूसरों को प्रेरित करें", trending_source: 'ai', hashtags: ['#challenge', '#30days', '#growth'] },
    { id: 4, title: "यह गलती करना बंद करें", description: "आम समस्याओं को संबोधित करें जो आपके दर्शक रोज़ाना झेलते हैं", trending_source: 'ai', hashtags: ['#mistakes', '#tips', '#learning'] },
    { id: 5, title: "कोई भी नया स्किल सीखने का सबसे तेज़ तरीका", description: "व्यावहारिक ट्यूटोरियल जो तुरंत लागू किया जा सके", trending_source: 'ai', hashtags: ['#tutorial', '#skillup', '#learning'] },
    { id: 6, title: "काश मुझे यह पहले पता होता", description: "कड़ी मेहनत से सीखे गए सबक नए लोगों की मदद के लिए", trending_source: 'ai', hashtags: ['#advice', '#lessons', '#beginner'] },
    { id: 7, title: "ईमानदार रिव्यू: क्या यह इतना अच्छा है?", description: "ट्रेंडिंग प्रोडक्ट्स पर अपनी सच्ची राय दें", trending_source: 'ai', hashtags: ['#review', '#honest', '#trending'] },
    { id: 8, title: "एक क्रिएटर के रूप में मेरा पूरा दिन", description: "बिहाइंड द सीन्स कंटेंट जो प्रामाणिक कनेक्शन बनाता है", trending_source: 'ai', hashtags: ['#dayinmylife', '#creator', '#behindthescenes'] },
    { id: 9, title: "अनपॉपुलर ओपिनियन जो आपकी सोच बदल दे", description: "पारंपरिक सोच को चुनौती दें और जुड़ाव बढ़ाएं", trending_source: 'ai', hashtags: ['#unpopularopinion', '#perspective', '#debate'] },
  ],
};

// Get fallback topics based on language
export const getFallbackTopics = (lang: string): Topic[] => {
  return fallbackTopicsByLang[lang] || fallbackTopicsByLang.en;
};
