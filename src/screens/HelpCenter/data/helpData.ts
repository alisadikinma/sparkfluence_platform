import {
  Sparkles,
  PenTool,
  Palette,
  Film,
  Coins,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';
import { TranslationKeys } from '../../../i18n';

export interface HelpCategory {
  id: string;
  slug: string;
  titleKey: keyof TranslationKeys['help']['categories'];
  icon: LucideIcon;
  articleCount: number;
  gradient: string;
  faqs: FAQ[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// Static category config (without translations)
const categoryConfig = [
  {
    id: 'getting-started',
    slug: 'getting-started',
    titleKey: 'gettingStarted' as const,
    icon: Sparkles,
    gradient: 'from-cyan-400 to-teal-500',
    articleCount: 8,
  },
  {
    id: 'script-lab',
    slug: 'script-lab',
    titleKey: 'scriptLab' as const,
    icon: PenTool,
    gradient: 'from-violet-400 to-fuchsia-500',
    articleCount: 12,
  },
  {
    id: 'visual-forge',
    slug: 'visual-forge',
    titleKey: 'visualForge' as const,
    icon: Palette,
    gradient: 'from-orange-400 to-amber-500',
    articleCount: 10,
  },
  {
    id: 'video-genie',
    slug: 'video-genie',
    titleKey: 'videoGenie' as const,
    icon: Film,
    gradient: 'from-blue-400 to-cyan-500',
    articleCount: 15,
  },
  {
    id: 'pricing-billing',
    slug: 'pricing-billing',
    titleKey: 'pricingBilling' as const,
    icon: Coins,
    gradient: 'from-emerald-400 to-green-500',
    articleCount: 6,
  },
  {
    id: 'account-security',
    slug: 'account-security',
    titleKey: 'accountSecurity' as const,
    icon: ShieldCheck,
    gradient: 'from-rose-400 to-red-500',
    articleCount: 9,
  },
];

// FAQs data (English - can be translated later)
const faqsData: Record<string, FAQ[]> = {
  'getting-started': [
    {
      id: 'gs-1',
      question: 'How do I create my first video?',
      answer: 'Creating your first video is easy! After signing up, you\'ll be guided through our onboarding process. Simply choose a topic or enter your own idea, select your preferred style, and let our AI generate a complete video with script, images, and voiceover. The entire process takes just a few minutes.',
    },
    {
      id: 'gs-2',
      question: 'What platforms can I publish to?',
      answer: 'Sparkfluence supports direct publishing to TikTok, Instagram Reels, and YouTube Shorts. You can also download your videos in various formats to upload manually to any platform of your choice.',
    },
    {
      id: 'gs-3',
      question: 'How long does it take to generate a video?',
      answer: 'Most videos are generated within 2-5 minutes, depending on the length and complexity. Our AI works quickly to create your script, generate images, produce voiceover, and combine everything into a polished final video.',
    },
    {
      id: 'gs-4',
      question: 'Can I edit the AI-generated content?',
      answer: 'Absolutely! You have full control over every aspect of your video. You can edit the script, regenerate individual images, adjust timing, change the voiceover style, and add background music before finalizing your video.',
    },
    {
      id: 'gs-5',
      question: 'What languages are supported?',
      answer: 'Currently, Sparkfluence supports Indonesian, English, Hindi, and Spanish for both script generation and voiceover. We\'re constantly adding new languages based on user feedback.',
    },
  ],
  'script-lab': [
    {
      id: 'sl-1',
      question: 'How does the AI script generator work?',
      answer: 'Our Script Lab uses advanced AI models trained on viral content patterns. Simply enter a topic or idea, and the AI analyzes trending formats, hooks, and storytelling structures to create an engaging script optimized for your chosen platform.',
    },
    {
      id: 'sl-2',
      question: 'Can I customize the script tone and style?',
      answer: 'Yes! You can choose from various tones including casual, professional, humorous, educational, and dramatic. You can also specify your target audience and preferred content style during generation.',
    },
    {
      id: 'sl-3',
      question: 'What makes a good video script prompt?',
      answer: 'The best prompts are specific and include: your main topic, target audience, desired emotion or reaction, and any key points you want covered. For example: "Create a 60-second educational video about sleep tips for busy professionals, with a friendly and encouraging tone."',
    },
    {
      id: 'sl-4',
      question: 'How many scripts can I generate?',
      answer: 'Free users can generate 2 scripts per month. Premium and Enterprise users enjoy unlimited script generation. Each script includes multiple segments with hooks, body content, and calls-to-action.',
    },
  ],
  'visual-forge': [
    {
      id: 'vf-1',
      question: 'What image styles are available?',
      answer: 'Visual Forge offers multiple styles including Cinematic, Realistic, Animated, Minimalist, and Abstract. Each style is optimized for different content types and audiences.',
    },
    {
      id: 'vf-2',
      question: 'Can I upload my own images?',
      answer: 'Yes! You can upload your own images to use alongside AI-generated visuals. This is great for adding personal branding, product photos, or specific visuals that represent your content.',
    },
    {
      id: 'vf-3',
      question: 'What resolution are the generated images?',
      answer: 'All images are generated in high resolution suitable for social media platforms. Standard output is 1080x1920 pixels (9:16 vertical format), optimized for TikTok, Instagram Reels, and YouTube Shorts.',
    },
    {
      id: 'vf-4',
      question: 'Are the AI-generated images copyright-free?',
      answer: 'Yes! All images generated through Visual Forge are yours to use commercially without attribution. You retain full rights to use them in your content across any platform.',
    },
  ],
  'video-genie': [
    {
      id: 'vg-1',
      question: 'How does the AI voiceover work?',
      answer: 'Video Genie uses advanced text-to-speech technology to generate natural-sounding voiceovers in multiple languages and voices. The AI matches the tone of your script and adds appropriate pacing and emphasis.',
    },
    {
      id: 'vg-2',
      question: 'Can I use my own voice instead?',
      answer: 'Currently, Video Genie focuses on AI-generated voiceovers for consistency and speed. However, you can download your video without voiceover and add your own voice recording using external editing software.',
    },
    {
      id: 'vg-3',
      question: 'What video formats are supported for export?',
      answer: 'Videos can be exported in MP4 format at 720p or 1080p resolution. The default aspect ratio is 9:16 for vertical videos, but you can also generate 1:1 (square) and 16:9 (horizontal) formats.',
    },
    {
      id: 'vg-4',
      question: 'How do I add background music?',
      answer: 'After your video segments are generated, you can choose from our library of royalty-free background music. Select a track that matches your content\'s mood, and adjust the volume to balance with your voiceover.',
    },
    {
      id: 'vg-5',
      question: 'Why is my video taking longer than expected?',
      answer: 'Video generation time depends on length, complexity, and current server load. Most videos complete within 5 minutes. If your video is taking longer, please check our status page or try again during off-peak hours.',
    },
  ],
  'pricing-billing': [
    {
      id: 'pb-1',
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards (Visa, Mastercard), bank transfers, and various local payment methods including GoPay, OVO, and DANA for Indonesian users.',
    },
    {
      id: 'pb-2',
      question: 'How do I upgrade my plan?',
      answer: 'Go to Settings > Plan & Billing and click "Upgrade". Choose your desired plan and complete the payment. Your new features will be available immediately, and you\'ll be charged the prorated difference.',
    },
    {
      id: 'pb-3',
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes! You can cancel your subscription at any time from Settings > Plan & Billing. Your access will continue until the end of your current billing period, and you won\'t be charged again.',
    },
    {
      id: 'pb-4',
      question: 'Do you offer refunds?',
      answer: 'We offer a 7-day money-back guarantee for new Premium and Enterprise subscribers. If you\'re not satisfied within the first 7 days, contact our support team for a full refund.',
    },
    {
      id: 'pb-5',
      question: 'What happens when I run out of tokens?',
      answer: 'Free users receive 500 tokens monthly. When depleted, you can wait for the next month\'s refresh or upgrade to Premium for unlimited usage. Premium and Enterprise users have unlimited tokens.',
    },
  ],
  'account-security': [
    {
      id: 'as-1',
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link. The link expires after 24 hours for security.',
    },
    {
      id: 'as-2',
      question: 'How do I enable two-factor authentication?',
      answer: 'Go to Settings > Security and click "Enable 2FA". You can use an authenticator app like Google Authenticator or receive codes via SMS.',
    },
    {
      id: 'as-3',
      question: 'Can I delete my account?',
      answer: 'Yes. Go to Settings > Account and scroll to "Delete Account". This action is permanent and will remove all your data, videos, and subscription. We recommend downloading your content first.',
    },
    {
      id: 'as-4',
      question: 'How is my data protected?',
      answer: 'We use industry-standard encryption for all data transmission and storage. Your content is stored securely and never shared with third parties. See our Privacy Policy for complete details.',
    },
    {
      id: 'as-5',
      question: 'Can I change my email address?',
      answer: 'Yes! Go to Settings > Profile and click "Change Email". You\'ll need to verify your new email address before the change takes effect.',
    },
  ],
};

// Export types for use with translations
export interface TranslatedCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  articleCount: number;
  gradient: string;
  faqs: FAQ[];
}

// Function to get categories with translations
export const getTranslatedCategories = (t: TranslationKeys): TranslatedCategory[] => {
  return categoryConfig.map(cat => ({
    ...cat,
    title: t.help.categories[cat.titleKey].title,
    description: t.help.categories[cat.titleKey].description,
    faqs: faqsData[cat.slug] || [],
  }));
};

// Legacy export for backwards compatibility
export const helpCategories = categoryConfig.map(cat => ({
  ...cat,
  title: cat.titleKey, // Will be overridden by component
  description: '',
  faqs: faqsData[cat.slug] || [],
}));

export const getCategoryBySlug = (slug: string, t?: TranslationKeys): TranslatedCategory | undefined => {
  const cat = categoryConfig.find(c => c.slug === slug);
  if (!cat) return undefined;

  if (t) {
    return {
      ...cat,
      title: t.help.categories[cat.titleKey].title,
      description: t.help.categories[cat.titleKey].description,
      faqs: faqsData[cat.slug] || [],
    };
  }

  // Fallback without translations
  return {
    ...cat,
    title: cat.titleKey,
    description: '',
    faqs: faqsData[cat.slug] || [],
  };
};

export const searchFAQs = (query: string): { category: TranslatedCategory; faq: FAQ }[] => {
  const results: { category: TranslatedCategory; faq: FAQ }[] = [];
  const lowerQuery = query.toLowerCase();

  categoryConfig.forEach((cat) => {
    const faqs = faqsData[cat.slug] || [];
    faqs.forEach((faq) => {
      if (
        faq.question.toLowerCase().includes(lowerQuery) ||
        faq.answer.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          category: {
            ...cat,
            title: cat.titleKey,
            description: '',
            faqs,
          },
          faq,
        });
      }
    });
  });

  return results;
};
