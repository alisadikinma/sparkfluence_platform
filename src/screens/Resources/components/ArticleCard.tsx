import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Article } from '../data/articles';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ArticleCardProps {
  article: Article;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Get translated title, fallback to original if not found
  const articleTranslation = t.articles[article.id as keyof typeof t.articles];
  const title = articleTranslation?.title || article.title;

  return (
    <motion.div
      onClick={() => navigate(`/resources/${article.slug}`)}
      className="group cursor-pointer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
        <img
          src={article.thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/1a1a24/8B5CF6?text=Article';
          }}
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
      </div>

      {/* Title */}
      <h4 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h4>
    </motion.div>
  );
};
