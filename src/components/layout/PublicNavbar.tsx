import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { cn } from '../../lib/utils';

export const PublicNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const navLinks = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.resources, href: '/resources' },
    { label: t.nav.price, href: '/pricing' },
    { label: t.nav.helpCenter, href: '/help' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'glass shadow-lg'
            : 'bg-transparent'
        )}
      >
        <nav className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
          <div className="flex items-center justify-between h-16 md:h-[72px] lg:h-20">
            {/* Logo - Dynamic based on theme */}
            <Link to="/" className="flex items-center gap-2 md:gap-3 group">
              <motion.img
                src={theme === 'dark' ? '/logo-light.png' : '/logo-dark.png'}
                alt="Sparkfluence"
                className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10"
                whileHover={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              />
              <span className="text-lg md:text-xl lg:text-2xl font-bold text-text-primary">
                SPARKFLUENCE
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  isActive={location.pathname === link.href}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Theme Toggle - Always visible */}
              <ThemeToggle className="hidden sm:flex" />

              {/* Language Selector - Desktop only */}
              <LanguageSwitcher className="hidden lg:block" />

              {/* CTA Button - Hidden on mobile */}
              <motion.button
                onClick={() => navigate('/register')}
                className="hidden md:flex btn-gradient text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-pill font-medium text-sm lg:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t.common.startFree}
              </motion.button>

              {/* Mobile Menu Button */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-12 h-12 -mr-2 text-text-primary hover:bg-surface rounded-lg transition-colors"
                whileTap={{ scale: 0.9 }}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            navLinks={navLinks}
            currentPath={location.pathname}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Animated Nav Link Component
interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children, isActive }) => {
  return (
    <Link
      to={href}
      className="relative py-2 text-base font-medium text-text-secondary hover:text-text-primary transition-colors group"
    >
      {children}
      {/* Animated Underline */}
      <motion.span
        className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full"
        initial={{ width: isActive ? '100%' : '0%' }}
        animate={{ width: isActive ? '100%' : '0%' }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  );
};
