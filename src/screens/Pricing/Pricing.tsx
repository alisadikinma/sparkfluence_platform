import React, { useState } from 'react';
import { FadeIn } from '../../components/animations';
import { PricingCard } from './components/PricingCard';
import { ComparisonTable } from './components/ComparisonTable';
import { TopUpPackages } from './components/TopUpPackages';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrencyConfig, getPrice, basePricesIDR, yearlyPricesIDR, originalPricesIDR, originalYearlyPricesIDR, creditsPerTier, getYearlySavings, getBonusCredits, sparksPerTier } from '../../lib/currency';

export const Pricing: React.FC = () => {
  const { t, language } = useLanguage();
  const currency = getCurrencyConfig(language);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const isYearly = billingCycle === 'yearly';

  const pricingPlans = [
    {
      id: 'free',
      name: t.pricing.plans.free.name,
      description: t.pricing.plans.free.description,
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: currency.symbol,
      sparks: sparksPerTier.free,
      bonusSparks: 0,
      features: t.pricing.plans.free.features,
      cta: t.pricing.startFree,
      highlighted: false,
    },
    {
      id: 'starter',
      name: t.pricing.plans.starter.name,
      description: t.pricing.plans.starter.description,
      monthlyPrice: getPrice(basePricesIDR.starter, language),
      originalPrice: getPrice(originalPricesIDR.starter, language),
      yearlyPrice: getPrice(yearlyPricesIDR.starter, language),
      originalYearlyPrice: getPrice(originalYearlyPricesIDR.starter, language),
      yearlyPerMonth: getPrice(Math.round(yearlyPricesIDR.starter / 12), language),
      currency: currency.symbol,
      sparks: isYearly ? creditsPerTier.starter.yearly : creditsPerTier.starter.monthly,
      bonusSparks: isYearly ? getBonusCredits('starter') : 0,
      savings: isYearly ? getYearlySavings('starter', language) : 0,
      features: t.pricing.plans.starter.features,
      cta: t.pricing.choosePlan,
      highlighted: false,
      discountBadge: '-50%',
    },
    {
      id: 'pro',
      name: t.pricing.plans.pro.name,
      description: t.pricing.plans.pro.description,
      monthlyPrice: getPrice(basePricesIDR.pro, language),
      originalPrice: getPrice(originalPricesIDR.pro, language),
      yearlyPrice: getPrice(yearlyPricesIDR.pro, language),
      originalYearlyPrice: getPrice(originalYearlyPricesIDR.pro, language),
      yearlyPerMonth: getPrice(Math.round(yearlyPricesIDR.pro / 12), language),
      currency: currency.symbol,
      sparks: isYearly ? creditsPerTier.pro.yearly : creditsPerTier.pro.monthly,
      bonusSparks: isYearly ? getBonusCredits('pro') : 0,
      savings: isYearly ? getYearlySavings('pro', language) : 0,
      features: t.pricing.plans.pro.features,
      cta: t.pricing.choosePlan,
      highlighted: true,
      badge: t.pricing.popular,
      discountBadge: '-50%',
    },
    {
      id: 'business',
      name: t.pricing.plans.business.name,
      description: t.pricing.plans.business.description,
      monthlyPrice: getPrice(basePricesIDR.business, language),
      originalPrice: getPrice(originalPricesIDR.business, language),
      yearlyPrice: getPrice(yearlyPricesIDR.business, language),
      originalYearlyPrice: getPrice(originalYearlyPricesIDR.business, language),
      yearlyPerMonth: getPrice(Math.round(yearlyPricesIDR.business / 12), language),
      currency: currency.symbol,
      sparks: isYearly ? creditsPerTier.business.yearly : creditsPerTier.business.monthly,
      bonusSparks: isYearly ? getBonusCredits('business') : 0,
      savings: isYearly ? getYearlySavings('business', language) : 0,
      features: t.pricing.plans.business.features,
      cta: t.pricing.choosePlan,
      highlighted: false,
      discountBadge: '-50%',
    },
  ];

  return (
    <div className="min-h-screen bg-page">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/20 via-accent-pink/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <section className="pt-8 md:pt-12 lg:pt-16 pb-8 md:pb-12">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6 text-center">
            <FadeIn direction="up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4">
                {t.pricing.title}{' '}
                <span className="text-gradient">{t.pricing.titleHighlight}</span>
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.1}>
              <p className="text-lg text-text-secondary max-w-xl mx-auto mb-8">
                {t.pricing.subtitle}
              </p>
            </FadeIn>

            {/* Billing Toggle */}
            <FadeIn direction="up" delay={0.2}>
              <div className="inline-flex items-center gap-3 p-1.5 rounded-xl bg-surface border border-border-default">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t.pricing.monthly}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t.pricing.yearly}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    billingCycle === 'yearly'
                      ? 'bg-white/20 text-white'
                      : 'bg-green-500/20 text-green-500'
                  }`}>
                    {t.pricing.savePercent}
                  </span>
                </button>
              </div>
            </FadeIn>

            {isYearly && (
              <FadeIn direction="up" delay={0.3}>
                <p className="mt-4 text-sm text-green-500 font-medium">
                  🎁 {t.pricing.yearlyBonus}
                </p>
              </FadeIn>
            )}
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16 md:pb-20">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            {/* Mobile: Pro First */}
            <div className="flex flex-col lg:hidden gap-6">
              {/* Pro Card First on Mobile */}
              <FadeIn direction="up" delay={0}>
                <PricingCard 
                  {...pricingPlans[2]} 
                  locale={currency.locale} 
                  billingCycle={billingCycle}
                />
              </FadeIn>
              <FadeIn direction="up" delay={0.1}>
                <PricingCard 
                  {...pricingPlans[1]} 
                  locale={currency.locale}
                  billingCycle={billingCycle}
                />
              </FadeIn>
              <FadeIn direction="up" delay={0.2}>
                <PricingCard 
                  {...pricingPlans[0]} 
                  locale={currency.locale}
                  billingCycle={billingCycle}
                />
              </FadeIn>
              <FadeIn direction="up" delay={0.3}>
                <PricingCard 
                  {...pricingPlans[3]} 
                  locale={currency.locale}
                  billingCycle={billingCycle}
                />
              </FadeIn>
            </div>

            {/* Desktop: Grid */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6 items-stretch">
              {pricingPlans.map((plan, index) => (
                <FadeIn key={plan.id} direction="up" delay={index * 0.1}>
                  <PricingCard 
                    {...plan} 
                    locale={currency.locale}
                    billingCycle={billingCycle}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Top-Up Section */}
        <section className="pb-16 md:pb-20">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            <TopUpPackages />
          </div>
        </section>

        {/* Comparison Table */}
        <section className="pb-20 md:pb-28">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            <ComparisonTable />
          </div>
        </section>
      </div>
    </div>
  );
};
