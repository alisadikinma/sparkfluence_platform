import React from 'react';
import { FadeIn } from '../../components/animations';
import { PricingCard } from './components/PricingCard';
import { ComparisonTable } from './components/ComparisonTable';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrencyConfig, getPrice, basePricesIDR } from '../../lib/currency';

export const Pricing: React.FC = () => {
  const { t, language } = useLanguage();
  const currency = getCurrencyConfig(language);

  const pricingPlans = [
    {
      id: 'free',
      name: t.pricing.plans.free.name,
      description: t.pricing.plans.free.description,
      price: 0,
      currency: currency.symbol,
      period: null,
      features: t.pricing.plans.free.features,
      cta: t.pricing.startFree,
      highlighted: false,
    },
    {
      id: 'premium',
      name: t.pricing.plans.premium.name,
      description: t.pricing.plans.premium.description,
      price: getPrice(basePricesIDR.premium, language),
      currency: currency.symbol,
      period: t.pricing.perMonth,
      features: t.pricing.plans.premium.features,
      cta: t.pricing.choosePlan,
      highlighted: true,
      badge: t.pricing.popular,
    },
    {
      id: 'enterprise',
      name: t.pricing.plans.enterprise.name,
      description: t.pricing.plans.enterprise.description,
      price: getPrice(basePricesIDR.enterprise, language),
      currency: currency.symbol,
      period: t.pricing.perMonth,
      features: t.pricing.plans.enterprise.features,
      cta: t.pricing.choosePlan,
      highlighted: false,
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
        <section className="pt-8 md:pt-12 lg:pt-16 pb-12 md:pb-16">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6 text-center">
            <FadeIn direction="up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4">
                {t.pricing.title}{' '}
                <span className="text-gradient">{t.pricing.titleHighlight}</span>
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.1}>
              <p className="text-lg text-text-secondary max-w-xl mx-auto">
                {t.pricing.subtitle}
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16 md:pb-20">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
            {/* Mobile: Premium First */}
            <div className="flex flex-col lg:hidden gap-6">
              {/* Premium Card First on Mobile */}
              <FadeIn direction="up" delay={0}>
                <PricingCard {...pricingPlans[1]} locale={currency.locale} />
              </FadeIn>
              <FadeIn direction="up" delay={0.1}>
                <PricingCard {...pricingPlans[0]} locale={currency.locale} />
              </FadeIn>
              <FadeIn direction="up" delay={0.2}>
                <PricingCard {...pricingPlans[2]} locale={currency.locale} />
              </FadeIn>
            </div>

            {/* Desktop: Normal Order */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-stretch">
              {pricingPlans.map((plan, index) => (
                <FadeIn key={plan.id} direction="up" delay={index * 0.1}>
                  <PricingCard {...plan} locale={currency.locale} />
                </FadeIn>
              ))}
            </div>
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
