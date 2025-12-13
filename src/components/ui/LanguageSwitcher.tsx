import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../i18n';

interface LanguageOption {
  code: Language;
  name: string;
  flag: React.ReactNode;
}

// Flag SVG Components
const IndonesiaFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="256" fill="#f0f0f0" />
    <path d="M0 256C0 114.616 114.616 0 256 0s256 114.616 256 256" fill="#a2001d" />
    <path d="M512 256c0 141.384-114.616 256-256 256S0 397.384 0 256" fill="#f0f0f0" />
  </svg>
);

const IndiaFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="256" fill="#f0f0f0" />
    <path d="M256 0C154.506 0 66.81 59.065 25.402 144.696h461.195C445.19 59.065 357.493 0 256 0z" fill="#ff9811" />
    <path d="M256 512c101.493 0 189.19-59.065 230.598-144.696H25.402C66.81 452.935 154.506 512 256 512z" fill="#6da544" />
    <circle cx="256" cy="256" r="89.043" fill="#0052b4" />
    <circle cx="256" cy="256" r="55.652" fill="#f0f0f0" />
    <circle cx="256" cy="256" r="26.122" fill="#0052b4" />
  </svg>
);

const UKFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="256" fill="#f0f0f0" />
    <g fill="#0052b4">
      <path d="M52.92 100.142c-20.109 26.163-35.272 56.318-44.101 89.077h133.178L52.92 100.142zM503.181 189.219c-8.829-32.758-23.993-62.913-44.101-89.076l-89.075 89.076h133.176zM8.819 322.784c8.83 32.758 23.993 62.913 44.101 89.075l89.074-89.075H8.819zM411.858 52.921c-26.163-20.109-56.317-35.272-89.076-44.102v133.177l89.076-89.075zM100.142 459.079c26.163 20.109 56.318 35.272 89.076 44.102V370.005l-89.076 89.074zM189.217 8.819c-32.758 8.83-62.913 23.993-89.075 44.101l89.075 89.075V8.819zM322.783 503.181c32.758-8.83 62.913-23.993 89.075-44.101l-89.075-89.075v133.176zM370.005 322.784l89.075 89.076c20.108-26.162 35.272-56.318 44.101-89.076H370.005z" />
    </g>
    <g fill="#d80027">
      <path d="M509.833 222.609H289.392V2.167A258.556 258.556 0 00256 0c-11.319 0-22.461.744-33.391 2.167v220.441H2.167A258.556 258.556 0 000 256c0 11.319.744 22.461 2.167 33.391h220.441v220.442a258.35 258.35 0 0066.783 0V289.392h220.442A258.533 258.533 0 00512 256c0-11.317-.744-22.461-2.167-33.391z" />
      <path d="M322.783 322.784L437.019 437.02a256.636 256.636 0 0015.048-16.435l-97.802-97.802h-31.482v.001zM189.217 322.784h-.002L74.98 437.019a256.636 256.636 0 0016.435 15.048l97.802-97.804v-31.479zM189.217 189.219v-.002L74.981 74.98a256.636 256.636 0 00-15.048 16.435l97.803 97.803h31.481zM322.783 189.219L437.02 74.981a256.328 256.328 0 00-16.435-15.047l-97.802 97.803v31.482z" />
    </g>
  </svg>
);

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: <UKFlag /> },
  { code: 'id', name: 'Indonesia', flag: <IndonesiaFlag /> },
  { code: 'hi', name: 'हिन्दी', flag: <IndiaFlag /> },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'list';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (lang: LanguageOption) => {
    setLanguage(lang.code);
    setIsOpen(false);
  };

  // List variant (for mobile menu)
  if (variant === 'list') {
    return (
      <div className={`space-y-1 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelectLanguage(lang)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              transition-colors text-left
              ${language === lang.code
                ? 'bg-primary/10 text-primary'
                : 'text-text-primary hover:bg-surface'
              }
            `}
          >
            <span className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
              {lang.flag}
            </span>
            <span className="font-medium">{lang.name}</span>
            {language === lang.code && (
              <motion.div
                layoutId="lang-active"
                className="ml-auto w-2 h-2 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (for desktop navbar)
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <span className="w-6 h-6 rounded-full overflow-hidden">
          {currentLang.flag}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="
              absolute right-0 top-full mt-2 
              min-w-[160px] p-2
              bg-card border border-border-default
              rounded-xl shadow-lg
              z-50
            "
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-colors text-left
                  ${language === lang.code
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-primary hover:bg-surface'
                  }
                `}
              >
                <span className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                  {lang.flag}
                </span>
                <span className="text-sm font-medium">{lang.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
