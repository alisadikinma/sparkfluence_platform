import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';

interface PricingCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  period: string | null;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  locale?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  premium: Zap,
  enterprise: Building2,
};

export const PricingCard: React.FC<PricingCardProps> = ({
  id,
  name,
  description,
  price,
  currency,
  period,
  features,
  cta,
  highlighted = false,
  badge,
  locale = 'en-US',
}) => {
  const navigate = useNavigate();
  const Icon = iconMap[id] || Sparkles;

  const formatPrice = (amount: number) => {
    if (amount === 0) return '0';
    
    // Determine decimal places based on currency
    const isUSD = currency === '$';
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: isUSD ? 2 : 0,
      maximumFractionDigits: isUSD ? 2 : 0,
    };
    
    return new Intl.NumberFormat(locale, options).format(amount);
  };

  return (
    <motion.div
      className={`
        relative rounded-2xl p-6 md:p-8 h-full flex flex-col
        ${highlighted
          ? 'bg-card gradient-border'
          : 'bg-card border border-border-default'
        }
      `}
      whileHover={{ y: highlighted ? -8 : -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect for highlighted card */}
      {highlighted && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent-pink/20 blur-xl -z-10"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Badge */}
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <span className="px-4 py-1.5 rounded-full bg-primary text-white text-sm font-semibold shadow-lg">
            {badge}
          </span>
        </motion.div>
      )}

      {/* Icon */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center mb-5
        ${highlighted ? 'bg-primary/20' : 'bg-surface'}
      `}>
        <Icon className={`w-6 h-6 ${highlighted ? 'text-primary' : 'text-text-secondary'}`} />
      </div>

      {/* Plan Name */}
      <h3 className="text-2xl font-bold text-text-primary mb-2">
        {name}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-6">
        {description}
      </p>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-base text-text-secondary">{currency}</span>
          <span className="text-4xl font-bold text-text-primary">
            {formatPrice(price)}
          </span>
          {period && (
            <span className="text-base text-text-muted">{period}</span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className={`
              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
              ${highlighted ? 'bg-primary/20 text-primary' : 'bg-surface text-text-secondary'}
            `}>
              <Check className="w-3 h-3" />
            </div>
            <span className="text-sm text-text-secondary">{feature}</span>
          </motion.li>
        ))}
      </ul>

      {/* CTA Button */}
      <motion.button
        onClick={() => navigate('/register')}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-base transition-all mt-auto
          ${highlighted
            ? 'btn-gradient text-white'
            : 'bg-transparent border border-border-default text-text-primary hover:bg-surface hover:border-primary/50'
          }
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {cta}
      </motion.button>
    </motion.div>
  );
};
