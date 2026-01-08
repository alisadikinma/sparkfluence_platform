import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import { FadeIn } from '../../../components/animations';
import { useLanguage } from '../../../contexts/LanguageContext';

export const ComparisonTable: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'free' | 'starter' | 'pro' | 'business'>('pro');

  const comparisonData = {
    headers: [
      t.pricing.features, 
      t.pricing.plans.free.name, 
      t.pricing.plans.starter.name, 
      t.pricing.plans.pro.name, 
      t.pricing.plans.business.name
    ],
    sections: [
      {
        title: 'Sparks ⚡',
        rows: [
          { 
            feature: 'Monthly Sparks', 
            free: '30', 
            starter: '1,000', 
            pro: '3,000', 
            business: '10,000' 
          },
          { 
            feature: t.pricing.comparison.topUp, 
            free: false, 
            starter: true, 
            pro: true, 
            business: true 
          },
        ],
      },
      {
        title: 'AI Tools',
        rows: [
          { 
            feature: 'Viral Script Gen (5⚡)', 
            free: true, 
            starter: true, 
            pro: true, 
            business: true 
          },
          { 
            feature: 'Visual Forge (10⚡/image)', 
            free: false, 
            starter: true, 
            pro: true, 
            business: true 
          },
          { 
            feature: 'Video Genie (15⚡/video)', 
            free: false, 
            starter: true, 
            pro: true, 
            business: true 
          },
          { 
            feature: 'Script Lab (100⚡/full video)', 
            free: false, 
            starter: true, 
            pro: true, 
            business: true 
          },
        ],
      },
      {
        title: t.pricing.comparison.generation,
        rows: [
          { 
            feature: t.pricing.comparison.videoQuality, 
            free: '-', 
            starter: '1080p', 
            pro: '1080p', 
            business: '1080p' 
          },
          { 
            feature: t.pricing.comparison.watermark, 
            free: '-', 
            starter: false, 
            pro: false, 
            business: false 
          },
        ],
      },
      {
        title: t.pricing.comparison.publishing,
        rows: [
          { 
            feature: t.pricing.comparison.autoPosting, 
            free: false, 
            starter: false, 
            pro: false, 
            business: true 
          },
        ],
      },
      {
        title: 'Support',
        rows: [
          { 
            feature: t.pricing.comparison.prioritySupport, 
            free: false, 
            starter: false, 
            pro: true, 
            business: true 
          },
        ],
      },
    ],
  };

  return (
    <FadeIn direction="up">
      <div className="bg-card rounded-2xl border border-border-default overflow-hidden">
        {/* Section Title */}
        <div className="p-6 border-b border-border-default">
          <h3 className="text-xl font-bold text-text-primary text-center">
            {t.pricing.comparison.title}
          </h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                {comparisonData.headers.map((header, index) => (
                  <th
                    key={header}
                    className={`
                      px-6 py-5 text-left font-semibold
                      ${index === 0 ? 'text-text-primary w-1/4' : 'text-text-secondary text-center'}
                      ${index === 3 ? 'bg-primary/5' : ''}
                    `}
                  >
                    {header}
                    {index === 3 && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-white">
                        {t.pricing.popular}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.sections.map((section, sectionIndex) => (
                <React.Fragment key={section.title}>
                  {/* Section Header */}
                  <tr className="bg-surface/50">
                    <td colSpan={5} className="px-6 py-3">
                      <span className="text-sm font-semibold text-text-primary">
                        {section.title}
                      </span>
                    </td>
                  </tr>
                  {/* Section Rows */}
                  {section.rows.map((row, rowIndex) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (sectionIndex * section.rows.length + rowIndex) * 0.02 }}
                      className="border-b border-border-default last:border-b-0 hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-text-secondary text-sm">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <CellValue value={row.free} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <CellValue value={row.starter} />
                      </td>
                      <td className="px-6 py-4 text-center bg-primary/5">
                        <CellValue value={row.pro} highlight />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <CellValue value={row.business} />
                      </td>
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Tab View */}
        <div className="lg:hidden">
          {/* Tab Switcher */}
          <div className="flex border-b border-border-default overflow-x-auto">
            {(['free', 'starter', 'pro', 'business'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 min-w-[80px] py-4 text-xs font-semibold capitalize transition-colors whitespace-nowrap px-2
                  ${activeTab === tab
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-text-secondary'
                  }
                `}
              >
                {t.pricing.plans[tab].name}
                {tab === 'pro' && (
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
            >
              {comparisonData.sections.map((section) => (
                <div key={section.title}>
                  {/* Section Header */}
                  <div className="px-4 py-3 bg-surface/50">
                    <span className="text-sm font-semibold text-text-primary">
                      {section.title}
                    </span>
                  </div>
                  {/* Section Rows */}
                  <div className="divide-y divide-border-default">
                    {section.rows.map((row) => (
                      <div key={row.feature} className="flex items-center justify-between px-4 py-4">
                        <span className="text-sm text-text-secondary">{row.feature}</span>
                        <CellValue value={row[activeTab]} highlight={activeTab === 'pro'} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA Row - Desktop */}
        <div className="hidden lg:grid grid-cols-5 border-t border-border-default">
          <div className="px-6 py-5" />
          <div className="px-6 py-5">
            <CTAButton variant="outline" label={t.pricing.startFree} />
          </div>
          <div className="px-6 py-5">
            <CTAButton variant="outline" label={t.pricing.choosePlan} />
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
  // Handle "watermark" special case - true means HAS watermark (bad), false means NO watermark (good)
  if (typeof value === 'boolean') {
    return value ? (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        className={`
          w-6 h-6 rounded-full flex items-center justify-center mx-auto
          ${highlight ? 'bg-primary text-white' : 'bg-green-500/20 text-green-500'}
        `}
      >
        <Check className="w-4 h-4" />
      </motion.div>
    ) : (
      <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center mx-auto">
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
