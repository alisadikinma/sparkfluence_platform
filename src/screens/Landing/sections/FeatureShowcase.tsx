import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calendar, FileText, Image, Video, ArrowRight } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const FeatureShowcase: React.FC = () => {
  const { t } = useLanguage();

  const showcaseFeatures = [
    {
      id: 'planner',
      badge: t.showcase.planner.badge,
      title: t.showcase.planner.title,
      description: t.showcase.planner.description,
      image: '/mockups/planner-feature.png',
      icon: Calendar,
      cta: t.common.tryNow,
      layout: 'image-right' as const,
    },
    {
      id: 'script-lab',
      badge: t.showcase.scriptLab.badge,
      title: t.showcase.scriptLab.title,
      description: t.showcase.scriptLab.description,
      image: '/mockups/script-lab-feature.png',
      icon: FileText,
      cta: t.common.tryNow,
      layout: 'image-left' as const,
    },
    {
      id: 'visual-forge',
      badge: t.showcase.visualForge.badge,
      title: t.showcase.visualForge.title,
      description: t.showcase.visualForge.description,
      image: '/mockups/visual-forge-feature.png',
      icon: Image,
      cta: t.common.tryNow,
      layout: 'image-right' as const,
    },
    {
      id: 'video-genie',
      badge: t.showcase.videoGenie.badge,
      title: t.showcase.videoGenie.title,
      description: t.showcase.videoGenie.description,
      image: '/mockups/video-genie-feature.png',
      icon: Video,
      cta: t.common.tryNow,
      layout: 'image-left' as const,
    },
  ];

  return (
    <section className="py-16 md:py-20 lg:py-28">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6 space-y-20 md:space-y-32">
        {showcaseFeatures.map((feature, index) => (
          <ShowcaseItem key={feature.id} {...feature} index={index} />
        ))}
      </div>
    </section>
  );
};

interface ShowcaseItemProps {
  badge: string;
  title: string;
  description: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  cta: string;
  layout: 'image-left' | 'image-right';
  index: number;
}

const ShowcaseItem: React.FC<ShowcaseItemProps> = ({
  badge,
  title,
  description,
  image,
  icon: Icon,
  cta,
  layout,
  index,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);

  const isImageRight = layout === 'image-right';

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        isImageRight ? '' : 'lg:[&>*:first-child]:order-2'
      }`}
    >
      {/* Text Content */}
      <FadeIn direction={isImageRight ? 'right' : 'left'} delay={0.1}>
        <div className="space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-primary">{badge}</span>
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary">
            {title}
          </h3>

          {/* Description */}
          <p className="text-lg text-text-secondary">
            {description}
          </p>

          {/* CTA Button */}
          <motion.button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-default text-text-primary hover:bg-surface hover:border-primary/50 transition-all group"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            {cta}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </FadeIn>

      {/* Image */}
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="relative"
      >
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          {/* Glow behind image */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-pink/20 blur-3xl -z-10 scale-110" />

          {/* Feature mockup image */}
          <img 
            src={image} 
            alt={`${badge} Feature`}
            className="w-full h-auto rounded-2xl border border-border-default"
          />

          {/* Glass overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-2xl"
          />
        </div>
      </motion.div>
    </div>
  );
};
