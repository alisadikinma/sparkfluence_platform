import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Sparkles, Zap, Users, TrendingUp } from 'lucide-react';
import { TextReveal, FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const { t } = useLanguage();

  const mockupY = useTransform(scrollY, [0, 500], [0, 50]);
  // Removed opacity transform - causes blank page effect on mobile

  return (
    <section className="relative overflow-hidden">
      {/* === ANIMATED BACKGROUND === */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/30 via-accent-pink/10 to-transparent"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-accent-cyan/20 via-transparent to-transparent" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-pink/20 rounded-full blur-[80px]"
          animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* === MAIN CONTENT === */}
      <div
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-12 lg:pb-16"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-16">
          
          {/* Left: Text Content */}
          <div className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            {/* Badge */}
            <FadeIn delay={0}>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-text-secondary">
                  {t.hero.badge}
                </span>
              </motion.div>
            </FadeIn>

            {/* Title - Larger */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-text-primary mb-5 leading-[1.1]">
              <TextReveal text={t.hero.titleLine1} delay={0.1} />
              <br />
              <span className="text-gradient">
                <TextReveal text={t.hero.titleHighlight} delay={0.3} />
              </span>
              <br />
              <TextReveal text={t.hero.titleLine2} delay={0.5} />
            </h1>

            {/* Subtitle */}
            <FadeIn delay={0.7} direction="up">
              <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-xl mx-auto lg:mx-0 mb-8">
                {t.hero.description}
              </p>
            </FadeIn>

            {/* CTA Button */}
            <FadeIn delay={0.9} direction="up">
              <div className="flex items-center justify-center lg:justify-start">
                <motion.button
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto btn-gradient text-white px-8 py-4 rounded-pill font-semibold text-lg flex items-center justify-center gap-2 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t.common.getStarted}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </div>
            </FadeIn>

            {/* Trust Badges */}
            <FadeIn delay={1.1} direction="up">
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[
                      'https://randomuser.me/api/portraits/women/44.jpg',
                      'https://randomuser.me/api/portraits/men/32.jpg',
                      'https://randomuser.me/api/portraits/women/68.jpg',
                      'https://randomuser.me/api/portraits/men/75.jpg',
                    ].map((avatar, i) => (
                      <img
                        key={i}
                        src={avatar}
                        alt={`Creator ${i + 1}`}
                        className="w-8 h-8 rounded-full border-2 border-page object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-sm">{t.hero.trustedBy}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                  <span className="text-sm ml-1">4.9/5 rating</span>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right: Mockup with floating cards - LARGER */}
          <div className="flex-1 relative hidden md:flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[580px]">
              
              {/* Main Dashboard Mockup */}
              <motion.div
                style={{ y: mockupY }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="relative"
              >
                <div className="glass rounded-2xl p-2 shadow-2xl">
                  <img 
                    src="/mockups/dashboard-preview.png" 
                    alt="Sparkfluence Dashboard"
                    className="w-full h-auto rounded-xl"
                  />
                </div>
              </motion.div>

              {/* Floating Card - TOP LEFT: Insight */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.8 },
                  scale: { duration: 0.5, delay: 0.8 },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }
                }}
                className="absolute -top-4 -left-4 z-30"
              >
                <div className="glass rounded-xl p-3 shadow-lg glow-purple-sm">
                  <p className="text-xs text-text-muted mb-1">Insight</p>
                  <p className="text-xl font-bold text-primary">+127%</p>
                  <p className="text-xs text-text-muted">Engagement</p>
                </div>
              </motion.div>

              {/* Floating Card - BOTTOM RIGHT: Script Lab */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, 10, 0] }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 1 },
                  scale: { duration: 0.5, delay: 1 },
                  y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }
                }}
                className="absolute -bottom-4 -right-4 z-30"
              >
                <div className="glass rounded-xl p-3 shadow-lg">
                  <p className="text-xs text-text-muted mb-2">Script Lab</p>
                  <div className="space-y-1.5 w-28">
                    <div className="h-2 bg-surface rounded w-full" />
                    <div className="h-2 bg-surface rounded w-3/4" />
                    <div className="h-2 bg-surface rounded w-5/6" />
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Mobile: Simple mockup preview */}
          <div className="md:hidden w-full">
            <FadeIn delay={0.5} direction="up">
              <div className="glass rounded-2xl p-2 shadow-xl max-w-sm mx-auto">
                <img 
                  src="/mockups/dashboard-preview.png" 
                  alt="Sparkfluence Dashboard"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </FadeIn>
          </div>

        </div>

        {/* === STATS BAR === */}
        <FadeIn delay={1.3} direction="up">
          <div className="mt-16 lg:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-text-primary">10x</p>
              <p className="text-sm text-text-muted">Faster Creation</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-pink/10 mx-auto mb-3">
                <Users className="w-6 h-6 text-accent-pink" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-text-primary">5K+</p>
              <p className="text-sm text-text-muted">Active Creators</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-cyan/10 mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-cyan" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-text-primary">50K+</p>
              <p className="text-sm text-text-muted">Videos Generated</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mx-auto mb-3">
                <Play className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-text-primary">1B+</p>
              <p className="text-sm text-text-muted">Total Views</p>
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
};
