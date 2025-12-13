import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CategoryCardProps {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  articleCount: number;
  gradient?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  slug,
  title,
  description,
  icon: Icon,
  articleCount,
  gradient = 'from-primary to-accent-pink',
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <motion.div
      onClick={() => navigate(`/help/${slug}`)}
      className="
        group cursor-pointer p-6 rounded-2xl
        bg-card border border-border-default
        hover:border-primary/50 transition-all
      "
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Colorful Gradient Icon */}
      <motion.div
        className={`
          w-14 h-14 rounded-xl mb-5
          bg-gradient-to-br ${gradient}
          flex items-center justify-center
          shadow-lg
        `}
        whileHover={{ rotate: 5, scale: 1.05 }}
      >
        <Icon className="w-7 h-7 text-white drop-shadow-sm" />
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-4">
        {description}
      </p>

      {/* Article Count & Arrow */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">
          {articleCount} {t.common.articles}
        </span>
        <motion.div
          className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ x: -5 }}
          whileHover={{ x: 0 }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.div>
      </div>
    </motion.div>
  );
};
