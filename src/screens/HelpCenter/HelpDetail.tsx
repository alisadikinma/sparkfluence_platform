import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { FadeIn } from '../../components/animations';
import { FAQAccordion } from './components/FAQAccordion';
import { ContactCard } from './components/ContactCard';
import { getCategoryBySlug } from './data/helpData';
import { useLanguage } from '../../contexts/LanguageContext';

export const HelpDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const category = slug ? getCategoryBySlug(slug, t) : null;

  if (!category) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">Category Not Found</h1>
          <button
            onClick={() => navigate('/help')}
            className="btn-gradient text-white px-6 py-3 rounded-xl"
          >
            {t.common.backTo} {t.nav.helpCenter}
          </button>
        </div>
      </div>
    );
  }

  const Icon = category.icon;
  const gradient = category.gradient || 'from-primary to-accent-pink';

  return (
    <div className="min-h-screen bg-page">
      {/* Header Section */}
      <section className="pt-8 md:pt-12 pb-8 bg-surface/50">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6">
          {/* Back Button */}
          <FadeIn direction="up">
            <motion.button
              onClick={() => navigate('/help')}
              className="
                inline-flex items-center gap-2 mb-6
                text-text-secondary hover:text-primary
                transition-colors group
              "
              whileHover={{ x: -4 }}
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              {t.common.backTo} {t.nav.helpCenter}
            </motion.button>
          </FadeIn>

          {/* Breadcrumb */}
          <FadeIn direction="up" delay={0.05}>
            <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
              <Link to="/help" className="hover:text-primary transition-colors">
                {t.nav.helpCenter}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-text-secondary">{category.title}</span>
            </nav>
          </FadeIn>

          {/* Category Header - Colorful Gradient Icon */}
          <FadeIn direction="up" delay={0.1}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary">
                  {category.title}
                </h1>
                <p className="text-text-secondary">{category.description}</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6">
          <FadeIn direction="up">
            <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-6">
              {t.help.faqTitle}
            </h2>
          </FadeIn>

          <FAQAccordion faqs={category.faqs} />
        </div>
      </section>

      {/* Still Need Help Section */}
      <section className="pb-20 md:pb-28">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6">
          <ContactCard />
        </div>
      </section>
    </div>
  );
};
