import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Info, Loader2 } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getCurrencyConfig, getPrice, topUpPackagesIDR } from '../../../lib/currency';
import { supabase } from '../../../lib/supabase';

export const TopUpPackages: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, session } = useAuth();
  const currency = getCurrencyConfig(language);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const packages = topUpPackagesIDR.map(pkg => ({
    ...pkg,
    price: getPrice(pkg.price, language),
    pricePerSpark: getPrice(Math.round(pkg.price / pkg.sparks), language),
  }));

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: currency.code === 'USD' ? 2 : 0,
      maximumFractionDigits: currency.code === 'USD' ? 2 : 0,
    }).format(amount);
  };

  const handleTopUp = async (packageId: string) => {
    if (!user || !session) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    try {
      setLoadingId(packageId);
      const response = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          priceType: 'topup',
          planId: packageId,
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
      console.error('Top-up error:', error);
      // Could show error toast here
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <FadeIn direction="up">
      <div id="topup" className="bg-card rounded-2xl border border-border-default p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-1">
              {t.pricing.topUp.title}
            </h3>
            <p className="text-sm text-text-secondary">
              {t.pricing.topUp.description}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">
              {t.pricing.topUp.subscriberOnly}
            </span>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-5 rounded-xl bg-surface border border-border-default hover:border-primary/50 transition-all cursor-pointer"
              whileHover={{ y: -4 }}
              onClick={() => handleTopUp(pkg.id)}
            >
              {/* Loading Overlay */}
              {loadingId === pkg.id && (
                <div className="absolute inset-0 bg-surface/80 rounded-xl flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}

              {/* Package Name */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text-primary capitalize">
                  {t.pricing.topUp.packages[pkg.id as keyof typeof t.pricing.topUp.packages] || pkg.id}
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Sparks */}
              <div className="mb-3">
                <span className="text-3xl font-bold text-text-primary">{pkg.sparks.toLocaleString()}</span>
                <span className="text-sm text-text-muted ml-1">{t.pricing.sparks} ⚡</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-lg font-bold text-primary">
                  {currency.symbol}{formatPrice(pkg.price)}
                </span>
              </div>

              {/* Per Spark */}
              <p className="text-xs text-text-muted">
                {currency.symbol}{formatPrice(pkg.pricePerSpark)} / Spark
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-6 pt-6 border-t border-border-default">
          <p className="text-xs text-text-muted text-center">
            {t.pricing.topUp.note}
          </p>
        </div>
      </div>
    </FadeIn>
  );
};
