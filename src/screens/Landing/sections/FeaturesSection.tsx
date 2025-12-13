import React from 'react';
import { motion } from 'framer-motion';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const FeaturesSection: React.FC = () => {
  const { t } = useLanguage();

  const features = [
    {
      image: '/mockups/Without-manual-editing.png',
      title: t.features.cards.noEditing.title,
      description: t.features.cards.noEditing.description,
    },
    {
      image: '/mockups/Without-professional-scriptwriter.png',
      title: t.features.cards.noScriptwriter.title,
      description: t.features.cards.noScriptwriter.description,
    },
    {
      image: '/mockups/no-need-manual-upload.png',
      title: t.features.cards.noManualUpload.title,
      description: t.features.cards.noManualUpload.description,
    },
  ];

  return (
    <section className="py-16 md:py-20 lg:py-28 relative overflow-hidden">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-transparent" />

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-text-muted/20"
            style={{
              left: `${10 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 35}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
        {/* Section Header */}
        <FadeIn direction="up" className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 italic">
            {t.features.title}{' '}
            <span className="text-gradient">{t.features.titleHighlight1}</span>,
            <br />
            {t.features.subtitle}{' '}
            <span className="text-gradient">{t.features.titleHighlight2}</span>.
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            {t.features.description}
          </p>
        </FadeIn>

        {/* Feature Cards Grid - Equal Height */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.1} direction="up" className="h-full">
              <FeatureCard {...feature} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  image: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ image, title, description }) => {
  return (
    <motion.div
      className="group relative h-full flex flex-col rounded-2xl bg-card border border-border-default transition-all duration-300 hover:border-primary/50 overflow-hidden"
      whileHover={{ y: -4 }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-accent-pink/5" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Image - Fixed height container */}
        <div className="w-full h-[220px] md:h-[240px] flex items-center justify-center p-6 md:p-8 flex-shrink-0">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Content - Flex grow to fill remaining space */}
        <div className="px-6 pb-6 md:px-8 md:pb-8 text-center flex flex-col flex-grow">
          {/* Title */}
          <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-3">
            {title}
          </h3>

          {/* Description - Flex grow to push to consistent bottom */}
          <p className="text-base text-text-secondary flex-grow">
            {description}
          </p>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-text-muted/30" />
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-text-muted/30" />
    </motion.div>
  );
};
