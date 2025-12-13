import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, Calendar, Clock } from 'lucide-react';
import { FadeIn } from '../../components/animations';
import { SocialShare } from './components/SocialShare';
import { getArticleBySlug } from './data/articles';
import { useLanguage } from '../../contexts/LanguageContext';

export const ResourceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const article = slug ? getArticleBySlug(slug) : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            {t.errors.notFound}
          </h1>
          <button
            onClick={() => navigate('/resources')}
            className="btn-gradient text-white px-6 py-3 rounded-xl"
          >
            {t.common.backTo} {t.resources.title}
          </button>
        </div>
      </div>
    );
  }

  // Get translated content
  const articleTranslation = t.articles[article.id as keyof typeof t.articles];
  const title = articleTranslation?.title || article.title;
  const description = articleTranslation?.description || article.description;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
  const formattedDate = new Date(article.publishedAt).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-page pb-20 lg:pb-0">
      {/* Social Share */}
      <SocialShare url={currentUrl} title={title} />

      {/* Header Section */}
      <section className="pt-8 md:pt-12 pb-8 bg-surface/50">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6">
          {/* Breadcrumb */}
          <FadeIn direction="up">
            <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
              <Link to="/resources" className="hover:text-primary transition-colors">
                {t.resources.title}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-text-secondary line-clamp-1">{title}</span>
            </nav>
          </FadeIn>

          {/* Title */}
          <FadeIn direction="up" delay={0.1}>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
              {title}
            </h1>
          </FadeIn>

          {/* Description */}
          <FadeIn direction="up" delay={0.15}>
            <p className="text-lg text-text-secondary mb-6">
              {description}
            </p>
          </FadeIn>

          {/* CTA Button */}
          <FadeIn direction="up" delay={0.2}>
            <motion.button
              onClick={() => navigate('/register')}
              className="btn-gradient text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t.common.tryNow}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </FadeIn>

          {/* Meta */}
          <FadeIn direction="up" delay={0.25}>
            <div className="flex items-center gap-4 mt-6 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {article.readTime} {t.resources.minRead}
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6 lg:pl-20">
          <div className="prose prose-lg max-w-none">
            {article.content.map((section, index) => (
              <FadeIn key={index} direction="up" delay={index * 0.05}>
                {section.type === 'heading' && (
                  <h2 className="text-xl md:text-2xl font-bold text-text-primary mt-10 mb-4">
                    {section.content}
                  </h2>
                )}
                {section.type === 'paragraph' && (
                  <p className="text-base text-text-secondary mb-6 leading-relaxed">
                    {section.content}
                  </p>
                )}
                {section.type === 'image' && section.imageUrl && (
                  <figure className="my-8">
                    <img
                      src={section.imageUrl}
                      alt={section.imageCaption || ''}
                      className="w-full rounded-xl border border-border-default"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/1a1a24/8B5CF6?text=Image';
                      }}
                    />
                    {section.imageCaption && (
                      <figcaption className="mt-3 text-sm text-text-muted text-center">
                        {section.imageCaption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
