import React from 'react';
import { FadeIn } from '../../components/animations';
import { HelpSearchBar } from './components/HelpSearchBar';
import { CategoryCard } from './components/CategoryCard';
import { ContactCard } from './components/ContactCard';
import { getTranslatedCategories } from './data/helpData';
import { useLanguage } from '../../contexts/LanguageContext';

export const HelpCenter: React.FC = () => {
  const { t } = useLanguage();
  const categories = getTranslatedCategories(t);

  return (
    <div className="min-h-screen bg-page">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/15 via-accent-pink/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <section className="pt-8 md:pt-12 lg:pt-16 pb-12 md:pb-16">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6 text-center">
            <FadeIn direction="up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4">
                {t.help.title}{' '}
                <span className="text-gradient">{t.help.titleHighlight}</span>?
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.1}>
              <p className="text-lg text-text-secondary max-w-xl mx-auto mb-8">
                {t.help.description}
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={0.2}>
              <HelpSearchBar placeholder={t.help.searchPlaceholder} />
            </FadeIn>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="pb-16 md:pb-20">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {categories.map((category, index) => (
                <FadeIn key={category.id} direction="up" delay={index * 0.05}>
                  <CategoryCard
                    slug={category.slug}
                    title={category.title}
                    description={category.description}
                    icon={category.icon}
                    articleCount={category.articleCount}
                    gradient={category.gradient}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="pb-20 md:pb-28">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6">
            <ContactCard />
          </div>
        </section>
      </div>
    </div>
  );
};
