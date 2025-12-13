import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const ContactCard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <FadeIn direction="up">
      <div className="
        relative overflow-hidden rounded-2xl p-8 md:p-12
        bg-gradient-to-br from-primary/20 via-accent-pink/10 to-surface
        border border-border-default
      ">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-pink/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
            {t.help.contactTitle}
          </h3>
          <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
            {t.help.contactDescription}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Email Support */}
            <motion.a
              href="mailto:support@sparkfluence.com"
              className="
                w-full sm:w-auto inline-flex items-center justify-center gap-2
                px-6 py-3.5 rounded-xl
                btn-gradient text-white font-semibold
                group
              "
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Mail className="w-5 h-5" />
              {t.help.contactButton}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </motion.a>

            {/* Live Chat */}
            <motion.button
              className="
                w-full sm:w-auto inline-flex items-center justify-center gap-2
                px-6 py-3.5 rounded-xl
                bg-card border border-border-default
                text-text-primary font-semibold
                hover:bg-surface hover:border-primary/50
                transition-all group
              "
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className="w-5 h-5" />
              Live Chat
            </motion.button>
          </div>

          {/* Response Time */}
          <p className="text-sm text-text-muted mt-6">
            Average response time: <span className="text-primary font-medium">under 2 hours</span>
          </p>
        </div>
      </div>
    </FadeIn>
  );
};
