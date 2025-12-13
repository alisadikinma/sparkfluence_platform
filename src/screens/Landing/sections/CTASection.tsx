import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20 lg:py-28 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary via-accent-pink to-accent-cyan"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ backgroundSize: '200% 200%' }}
      />

      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [null, '-100%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-6 text-center">
        <FadeIn direction="up">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              Join 1,000+ Creators
            </span>
          </motion.div>
        </FadeIn>

        <FadeIn direction="up" delay={0.1}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {t.cta.title}{' '}
            <span className="underline decoration-wavy decoration-white/50 underline-offset-8">
              {t.cta.titleHighlight}
            </span>
            ?
          </h2>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
            {t.cta.description}
          </p>
        </FadeIn>

        <FadeIn direction="up" delay={0.3}>
          <div className="flex flex-col items-center gap-4">
            <motion.button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-pill bg-white text-primary font-bold text-lg shadow-2xl group"
              whileHover={{ scale: 1.05, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.98 }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(255,255,255,0.4)',
                  '0 0 0 20px rgba(255,255,255,0)',
                ],
              }}
              transition={{
                boxShadow: {
                  duration: 1.5,
                  repeat: Infinity,
                },
              }}
            >
              {t.cta.button}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <span className="text-sm text-white/70">{t.cta.noCreditCard}</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
