export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'tips-tricks' | 'content-tips' | 'video-tips';
  thumbnail: string;
  readTime: number; // in minutes
  publishedAt: string;
  content: ArticleSection[];
}

export interface ArticleSection {
  type: 'heading' | 'paragraph' | 'image';
  content: string;
  imageUrl?: string;
  imageCaption?: string;
}

export const articles: Article[] = [
  {
    id: '1',
    slug: 'how-to-choose-best-facebook-cover-picture-maker',
    title: 'How to choose the best Facebook cover picture maker',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    category: 'tips-tricks',
    thumbnail: '/resources/article-1.png',
    readTime: 15,
    publishedAt: '2025-09-25',
    content: [
      {
        type: 'heading',
        content: 'Assessing ease of use',
      },
      {
        type: 'paragraph',
        content: 'When selecting a Facebook cover maker, prioritize ease of use. A user-friendly interface allows you to create stunning designs without frustration. Look for an FB cover maker with drag-and-drop functionality, which makes arranging elements simple and intuitive. Tutorials and guides are also essential. They help you quickly understand how to use the tools, even if you\'re a beginner.',
      },
      {
        type: 'heading',
        content: 'Exploring design features',
      },
      {
        type: 'paragraph',
        content: 'A good FB cover page maker offers a wide variety of templates and layouts. It allows you to select a design that aligns with your style. Customization options are critical, too. The best tools let you tweak fonts, colors, and images to create a cover that reflects your personality. Additionally, access to a library of stock images and graphics can save you time.',
      },
      {
        type: 'heading',
        content: 'Checking compatibility and export options',
      },
      {
        type: 'paragraph',
        content: 'Ensure your Facebook banner maker is compatible with Facebook\'s cover photo dimensions to avoid uploading issues. The tool should also offer multiple export formats, such as JPEG and PNG, giving you flexibility based on your needs. High-resolution output is another must-have feature, ensuring your cover picture looks clear and crisp on all devices.',
      },
      {
        type: 'image',
        content: '',
        imageUrl: '/resources/article-1-image-1.png',
        imageCaption: 'Performance insights dashboard',
      },
      {
        type: 'heading',
        content: 'Considering pricing and subscription plans',
      },
      {
        type: 'paragraph',
        content: 'Compare free vs. paid versions of the FB cover maker to see what features are included. The cost of premium features should be justified by the value they add, whether through advanced tools, exclusive content, or enhanced functionality. Look for discounts or bundled plans that offer more bang for your buck, ensuring you get the most value out of your investment.',
      },
    ],
  },
  {
    id: '2',
    slug: 'content-creation-workflow-optimization',
    title: 'Content creation workflow optimization',
    description: 'Learn how to streamline your content creation process for maximum efficiency.',
    category: 'content-tips',
    thumbnail: '/resources/article-2.png',
    readTime: 10,
    publishedAt: '2025-09-20',
    content: [
      {
        type: 'heading',
        content: 'Planning your content calendar',
      },
      {
        type: 'paragraph',
        content: 'A well-structured content calendar is the foundation of an efficient workflow. Start by mapping out your content themes for each month, then break them down into weekly and daily tasks. This approach helps you stay organized and ensures consistent output.',
      },
    ],
  },
  {
    id: '3',
    slug: 'video-editing-tips-for-beginners',
    title: 'Video editing tips for beginners',
    description: 'Essential tips to get started with video editing.',
    category: 'video-tips',
    thumbnail: '/resources/article-3.png',
    readTime: 12,
    publishedAt: '2025-09-18',
    content: [
      {
        type: 'heading',
        content: 'Getting started with video editing',
      },
      {
        type: 'paragraph',
        content: 'Video editing can seem daunting at first, but with the right approach, anyone can learn. Start by familiarizing yourself with your editing software interface and basic tools like cut, trim, and transitions.',
      },
    ],
  },
  {
    id: '4',
    slug: 'mastering-instagram-reels-algorithm',
    title: 'Mastering Instagram Reels algorithm',
    description: 'Discover the secrets behind the Instagram Reels algorithm and how to make it work for you.',
    category: 'tips-tricks',
    thumbnail: '/resources/article-1.png',  // reuse until more images added
    readTime: 8,
    publishedAt: '2025-09-15',
    content: [],
  },
  {
    id: '5',
    slug: 'creating-engaging-thumbnails',
    title: 'Creating engaging thumbnails that drive clicks',
    description: 'Learn the art of creating thumbnails that capture attention and increase click-through rates.',
    category: 'tips-tricks',
    thumbnail: '/resources/article-2.png',  // reuse until more images added
    readTime: 6,
    publishedAt: '2025-09-12',
    content: [],
  },
  {
    id: '6',
    slug: 'storytelling-techniques-for-social-media',
    title: 'Storytelling techniques for social media',
    description: 'Master the art of storytelling to create content that resonates with your audience.',
    category: 'content-tips',
    thumbnail: '/resources/article-3.png',  // reuse until more images added
    readTime: 11,
    publishedAt: '2025-09-10',
    content: [],
  },
  {
    id: '7',
    slug: 'building-personal-brand-online',
    title: 'Building your personal brand online',
    description: 'Step-by-step guide to establishing a strong personal brand presence.',
    category: 'content-tips',
    thumbnail: '/resources/article-1.png',  // reuse until more images added
    readTime: 14,
    publishedAt: '2025-09-08',
    content: [],
  },
  {
    id: '8',
    slug: 'audio-tips-for-better-videos',
    title: 'Audio tips for better videos',
    description: 'Improve your video quality with these essential audio tips and techniques.',
    category: 'video-tips',
    thumbnail: '/resources/article-2.png',  // reuse until more images added
    readTime: 9,
    publishedAt: '2025-09-05',
    content: [],
  },
  {
    id: '9',
    slug: 'color-grading-basics',
    title: 'Color grading basics for content creators',
    description: 'Learn fundamental color grading techniques to make your videos look professional.',
    category: 'video-tips',
    thumbnail: '/resources/article-3.png',  // reuse until more images added
    readTime: 13,
    publishedAt: '2025-09-03',
    content: [],
  },
  {
    id: '10',
    slug: 'tiktok-trends-to-follow',
    title: 'TikTok trends to follow in 2025',
    description: 'Stay ahead of the curve with these emerging TikTok trends.',
    category: 'tips-tricks',
    thumbnail: '/resources/article-1.png',  // reuse until more images added
    readTime: 7,
    publishedAt: '2025-09-01',
    content: [],
  },
  {
    id: '11',
    slug: 'repurposing-content-across-platforms',
    title: 'Repurposing content across platforms',
    description: 'Maximize your content reach by adapting it for different social media platforms.',
    category: 'content-tips',
    thumbnail: '/resources/article-2.png',  // reuse until more images added
    readTime: 10,
    publishedAt: '2025-08-28',
    content: [],
  },
  {
    id: '12',
    slug: 'mobile-video-production-guide',
    title: 'Mobile video production guide',
    description: 'Create professional-quality videos using just your smartphone.',
    category: 'video-tips',
    thumbnail: '/resources/article-3.png',  // reuse until more images added
    readTime: 15,
    publishedAt: '2025-08-25',
    content: [],
  },
];

export const categories = [
  { id: 'tips-tricks', name: 'Tips & Tricks', slug: 'tips-tricks' },
  { id: 'content-tips', name: 'Content Tips', slug: 'content-tips' },
  { id: 'video-tips', name: 'Video Tips', slug: 'video-tips' },
];

export const featuredArticle = articles[0];

export const getArticlesByCategory = (category: string) => {
  return articles.filter((article) => article.category === category);
};

export const getArticleBySlug = (slug: string) => {
  return articles.find((article) => article.slug === slug);
};
