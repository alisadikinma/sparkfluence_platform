import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn } from '../../components/animations';
import { SearchBar } from './components/SearchBar';
import { FeaturedCard } from './components/FeaturedCard';
import { ArticleCard } from './components/ArticleCard';
import { articles, categories, featuredArticle, getArticlesByCategory } from './data/articles';
import { useLanguage } from '../../contexts/LanguageContext';

export const Resources: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter articles based on search (searches translated titles too)
  const filteredArticles = searchQuery
    ? articles.filter((article) => {
        const articleTranslation = t.articles[article.id as keyof typeof t.articles];
        const title = articleTranslation?.title || article.title;
        const description = articleTranslation?.description || article.description;
        
        return (
          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : null;

  return (
    <div className="min-h-screen bg-page">
      {/* Header Section */}
      <section className="pt-8 md:pt-12 lg:pt-16 pb-8 md:pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6 text-center">
          <FadeIn direction="up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4">
              {t.resources.title}{' '}
              <span className="text-gradient">{t.resources.titleHighlight}</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
              {t.resources.description}
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t.resources.searchPlaceholder}
            />
          </FadeIn>
        </div>
      </section>

      {/* Search Results */}
      {searchQuery && filteredArticles && (
        <section className="pb-12">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            <FadeIn direction="up">
              <p className="text-text-secondary mb-6">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'hasil' : 'hasil'} "{searchQuery}"
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Main Content (when not searching) */}
      {!searchQuery && (
        <>
          {/* Featured Article */}
          <section className="pb-12 md:pb-16">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
              <FadeIn direction="up" delay={0.3}>
                <FeaturedCard article={featuredArticle} />
              </FadeIn>
            </div>
          </section>

          {/* Category Sections */}
          {categories.map((category, categoryIndex) => {
            const categoryArticles = getArticlesByCategory(category.id).slice(0, 6);
            // Get translated category name
            const categoryName = t.resourceCategories[category.id as keyof typeof t.resourceCategories] || category.name;

            return (
              <section key={category.id} className="pb-12 md:pb-16">
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
                  {/* Category Header */}
                  <FadeIn direction="up" delay={categoryIndex * 0.1}>
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-8">
                      {categoryName}
                    </h2>
                  </FadeIn>

                  {/* Articles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {categoryArticles.map((article, index) => (
                      <FadeIn key={article.id} direction="up" delay={index * 0.05}>
                        <ArticleCard article={article} />
                      </FadeIn>
                    ))}
                  </div>

                  {/* View All Button */}
                  <FadeIn direction="up">
                    <div className="flex justify-center">
                      <motion.button
                        className="
                          inline-flex items-center gap-2 px-6 py-3
                          rounded-xl border border-border-default
                          text-text-primary hover:bg-surface hover:border-primary/50
                          transition-all group
                        "
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t.common.viewAll}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </motion.button>
                    </div>
                  </FadeIn>
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};
