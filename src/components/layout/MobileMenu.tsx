import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useLanguage } from '../../contexts/LanguageContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: { label: string; href: string }[];
  currentPath: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  navLinks,
  currentPath,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleCTAClick = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-[85vw] max-w-[320px] bg-page/95 backdrop-blur-xl border-l border-border-default shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <span className="text-lg font-semibold text-text-primary">{t.nav.menu}</span>
          <motion.button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
            whileTap={{ scale: 0.9 }}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Navigation Links */}
        <nav className="py-2 flex-1 overflow-y-auto">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              <Link
                to={link.href}
                onClick={onClose}
                className={`
                  flex items-center h-[60px] px-6 text-xl font-medium
                  border-b border-border-default
                  transition-colors
                  ${currentPath === link.href
                    ? 'text-primary bg-primary/10'
                    : 'text-text-primary hover:bg-surface'
                  }
                `}
              >
                {link.label}
                {currentPath === link.href && (
                  <motion.div
                    layoutId="mobile-active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            </motion.div>
          ))}

          {/* Language Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: navLinks.length * 0.05 + 0.15 }}
            className="px-4 py-4 border-b border-border-default"
          >
            <div className="flex items-center gap-2 mb-3 text-text-secondary">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{t.common.language}</span>
            </div>
            <LanguageSwitcher variant="list" />
          </motion.div>
        </nav>

        {/* Bottom Section */}
        <div className="p-6 border-t border-border-default bg-surface/50">
          {/* Theme Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-4"
          >
            <span className="text-sm text-text-secondary">{t.common.theme}</span>
            <ThemeToggle />
          </motion.div>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={handleCTAClick}
            className="w-full btn-gradient text-white py-4 rounded-xl font-semibold text-lg"
            whileTap={{ scale: 0.98 }}
          >
            {t.common.startFree}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
