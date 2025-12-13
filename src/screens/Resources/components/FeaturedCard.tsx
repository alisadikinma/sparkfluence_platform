import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Article } from '../data/articles';
import { useLanguage } from '../../../contexts/LanguageContext';

interface FeaturedCardProps {
  article: Article;
}

export const FeaturedCard: React.FC<FeaturedCardProps> = ({ article }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Get translated content, fallback to original if not found
  const articleTranslation = t.articles[article.id as keyof typeof t.articles];
  const title = articleTranslation?.title || article.title;
  const description = articleTranslation?.description || article.description;

  return (
    <motion.div
      onClick={() => navigate(`/resources/${article.slug}`)}
      className="
        group relative overflow-hidden rounded-2xl cursor-pointer
        bg-gradient-to-br from-primary/20 via-accent-pink/10 to-surface
        border border-border-default
      "
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Text Content */}
        <div className="p-6 md:p-8 flex flex-col justify-center order-2 md:order-1">
          {/* Category Badge */}
          <span className="inline-flex self-start px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
            {t.common.featured}
          </span>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-base text-text-secondary mb-6 line-clamp-3">
            {description}
          </p>

          {/* Read More */}
          <motion.span
            className="inline-flex items-center gap-2 text-primary font-semibold"
            whileHover={{ x: 4 }}
          >
            {t.resources.readMore}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.span>
        </div>

        {/* Image */}
        <div className="relative aspect-video md:aspect-auto md:h-full order-1 md:order-2">
          <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent md:bg-gradient-to-l z-10" />
          <img
            src={article.thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1a24/8B5CF6?text=Featured';
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
