import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const ComparisonTable: React.FC = () => {
  const { t } = useLanguage();
  // Mobile: Tab-based view
  const [activeTab, setActiveTab] = useState<'free' | 'premium' | 'enterprise'>('premium');

  const comparisonData = {
    headers: [t.pricing.features, t.pricing.plans.free.name, t.pricing.plans.premium.name, t.pricing.plans.enterprise.name],
    rows: [
      { feature: 'Token', free: '500', premium: t.common.unlimited, enterprise: t.common.unlimited },
      { feature: 'Script Lab', free: '2 generate / ' + t.common.monthly.toLowerCase(), premium: t.common.unlimited, enterprise: t.common.unlimited },
      { feature: 'Visual Forge', free: '2 generate / ' + t.common.monthly.toLowerCase(), premium: t.common.unlimited, enterprise: t.common.unlimited },
      { feature: 'Video Genie', free: '2 generate / ' + t.common.monthly.toLowerCase(), premium: t.common.unlimited, enterprise: t.common.unlimited },
      { feature: 'Insight AI', free: false, premium: true, enterprise: true },
      { feature: t.nav.collaboration, free: false, premium: true, enterprise: true },
      { feature: 'Multi User', free: false, premium: false, enterprise: true },
      { feature: 'Priority Support', free: false, premium: false, enterprise: true },
    ],
  };

  return (
    <FadeIn direction="up">
      <div className="bg-card rounded-2xl border border-border-default overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                {comparisonData.headers.map((header, index) => (
                  <th
                    key={header}
                    className={`
                      px-6 py-5 text-left font-semibold
                      ${index === 0 ? 'text-text-primary' : 'text-text-secondary'}
                      ${index === 2 ? 'bg-primary/5' : ''}
                    `}
                  >
                    {header}
                    {index === 2 && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-white">
                        {t.pricing.popular}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.rows.map((row, rowIndex) => (
                <motion.tr
                  key={row.feature}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: rowIndex * 0.05 }}
                  className="border-b border-border-default last:border-b-0 hover:bg-surface/50 transition-colors"
                >
                  <td className="px-6 py-5 text-text-primary font-medium">
                    {row.feature}
                  </td>
                  <td className="px-6 py-5">
                    <CellValue value={row.free} />
                  </td>
                  <td className="px-6 py-5 bg-primary/5">
                    <CellValue value={row.premium} highlight />
                  </td>
                  <td className="px-6 py-5">
                    <CellValue value={row.enterprise} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Tab View */}
        <div className="md:hidden">
          {/* Tab Switcher */}
          <div className="flex border-b border-border-default">
            {(['free', 'premium', 'enterprise'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-4 text-sm font-semibold capitalize transition-colors
                  ${activeTab === tab
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-text-secondary'
                  }
                `}
              >
                {t.pricing.plans[tab].name}
                {tab === 'premium' && (
                  <span className="ml-1 text-xs">⭐</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-border-default"
            >
              {comparisonData.rows.map((row) => (
                <div key={row.feature} className="flex items-center justify-between px-4 py-4">
                  <span className="text-text-primary font-medium">{row.feature}</span>
                  <CellValue value={row[activeTab]} highlight={activeTab === 'premium'} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA Row */}
        <div className="hidden md:grid grid-cols-4 border-t border-border-default">
          <div className="px-6 py-5" />
          <div className="px-6 py-5">
            <CTAButton variant="outline" label={t.pricing.startFree} />
          </div>
          <div className="px-6 py-5 bg-primary/5">
            <CTAButton variant="primary" label={t.pricing.choosePlan} />
          </div>
          <div className="px-6 py-5">
            <CTAButton variant="outline" label={t.pricing.choosePlan} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
};

// Cell Value Component
interface CellValueProps {
  value: string | boolean;
  highlight?: boolean;
}

const CellValue: React.FC<CellValueProps> = ({ value, highlight }) => {
  if (typeof value === 'boolean') {
    return value ? (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        className={`
          w-6 h-6 rounded-full flex items-center justify-center
          ${highlight ? 'bg-primary text-white' : 'bg-green-500/20 text-green-500'}
        `}
      >
        <Check className="w-4 h-4" />
      </motion.div>
    ) : (
      <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center">
        <Minus className="w-4 h-4 text-text-muted" />
      </div>
    );
  }

  return (
    <span className={`text-sm ${highlight ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
      {value}
    </span>
  );
};

// CTA Button Component
interface CTAButtonProps {
  label: string;
  variant: 'primary' | 'outline';
}

const CTAButton: React.FC<CTAButtonProps> = ({ label, variant }) => {
  return (
    <motion.button
      className={`
        w-full py-3 rounded-xl font-semibold text-sm transition-all
        ${variant === 'primary'
          ? 'btn-gradient text-white'
          : 'border border-border-default text-text-primary hover:bg-surface hover:border-primary/50'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
    </motion.button>
  );
};
