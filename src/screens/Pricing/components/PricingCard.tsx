import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown, Building2, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface PricingCardProps {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  originalPrice?: number;
  yearlyPrice?: number;
  originalYearlyPrice?: number;
  yearlyPerMonth?: number;
  currency: string;
  sparks: number;
  bonusSparks?: number;
  savings?: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  discountBadge?: string;
  locale?: string;
  billingCycle: 'monthly' | 'yearly';
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  business: Building2,
};

export const PricingCard: React.FC<PricingCardProps> = ({
  id,
  name,
  description,
  monthlyPrice,
  originalPrice = 0,
  yearlyPrice = 0,
  originalYearlyPrice = 0,
  yearlyPerMonth = 0,
  currency,
  sparks,
  bonusSparks = 0,
  savings = 0,
  features,
  cta,
  highlighted = false,
  badge,
  discountBadge,
  locale = 'en-US',
  billingCycle,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const Icon = iconMap[id] || Sparkles;

  const isYearly = billingCycle === 'yearly';
  const isFree = id === 'free';
  const displayPrice = isFree ? 0 : (isYearly ? yearlyPerMonth : monthlyPrice);
  const totalYearlyPrice = yearlyPrice;

  const handleClick = async () => {
    if (isFree) {
      navigate(user ? '/dashboard' : '/register');
      return;
    }

    if (!user || !session) {
      // Not logged in, redirect to register with plan info
      navigate('/register', { state: { planId: id, billingCycle } });
      return;
    }

    // Logged in, create checkout
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          priceType: 'subscription',
          planId: id,
          billingCycle: billingCycle as 'monthly' | 'yearly',
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data.data?.url) {
        window.location.href = response.data.data.url;
      } else {
        throw new Error(response.data?.error?.message || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Could show error toast here
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    if (amount === 0) return '0';
    
    const isUSD = currency === '$';
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: isUSD ? 2 : 0,
      maximumFractionDigits: isUSD ? 2 : 0,
    };
    
    return new Intl.NumberFormat(locale, options).format(amount);
  };

  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat(locale).format(amount);
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
      <p className="text-sm text-text-secondary mb-4">
        {description}
      </p>

      {/* Price */}
      <div className="mb-2">
        {/* Strikethrough original price - Monthly */}
        {!isFree && !isYearly && originalPrice > 0 && originalPrice > monthlyPrice && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg text-text-muted line-through">
              {currency}{formatPrice(originalPrice)}
            </span>
            {discountBadge && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold">
                {discountBadge}
              </span>
            )}
          </div>
        )}

        {/* Strikethrough original price - Yearly (per month) */}
        {!isFree && isYearly && originalYearlyPrice > 0 && originalYearlyPrice > yearlyPrice && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg text-text-muted line-through">
              {currency}{formatPrice(Math.round(originalYearlyPrice / 12))}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold">
              -67%
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1">
          <span className="text-lg text-text-secondary">{currency}</span>
          <span className="text-4xl font-bold text-text-primary">
            {formatPrice(displayPrice)}
          </span>
          {!isFree && (
            <span className="text-base text-text-muted">/{t.common.perMonth.replace('/', '')}</span>
          )}
        </div>

        {/* Yearly billing info */}
        {!isFree && isYearly && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              {originalYearlyPrice > 0 && originalYearlyPrice > yearlyPrice && (
                <span className="text-sm text-text-muted line-through">
                  {currency}{formatPrice(originalYearlyPrice)}
                </span>
              )}
              <span className="text-sm text-text-secondary font-medium">
                {currency}{formatPrice(totalYearlyPrice)}
              </span>
            </div>
            {savings > 0 && (
              <p className="text-sm text-green-500 font-medium">
                {t.pricing.save} {currency}{formatPrice(savings)}
              </p>
            )}
          </div>
        )}

        {/* Monthly billing info */}
        {!isFree && !isYearly && (
          <p className="mt-2 text-sm text-text-muted">
            {t.pricing.billedMonthly}
          </p>
        )}
      </div>

      {/* Sparks Badge */}
      <div className={`
        mt-2 mb-6 p-3 rounded-xl
        ${highlighted ? 'bg-primary/10 border border-primary/20' : 'bg-surface border border-border-default'}
      `}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">{t.pricing.sparks} ⚡</span>
          <div className="text-right">
            <span className={`text-lg font-bold ${highlighted ? 'text-primary' : 'text-text-primary'}`}>
              {formatCredits(sparks)}
            </span>
            {isYearly && bonusSparks > 0 && (
              <span className="ml-1 text-xs text-green-500 font-medium">
                (+{formatCredits(bonusSparks)} bonus)
              </span>
            )}
          </div>
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
            className="flex items-start gap-3"
          >
            <div className={`
              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
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
        onClick={handleClick}
        disabled={loading}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-base transition-all mt-auto
          ${highlighted
            ? 'btn-gradient text-white'
            : 'bg-transparent border border-border-default text-text-primary hover:bg-surface hover:border-primary/50'
          }
          ${loading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        ) : (
          cta
        )}
      </motion.button>
    </motion.div>
  );
};
