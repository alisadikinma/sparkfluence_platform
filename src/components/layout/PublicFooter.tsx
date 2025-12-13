import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Youtube, Twitter, Facebook } from 'lucide-react';
import { FadeIn } from '../animations';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const socialLinks = [
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
];

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  const siteMapLinks = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.resources, href: '/resources' },
    { label: t.nav.price, href: '/pricing' },
    { label: t.nav.helpCenter, href: '/help' },
  ];

  const infoLinks = [
    { label: 'Terms of Services', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <footer className="bg-surface border-t border-border-default">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-6">
        {/* Main Footer Content */}
        <div className="py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {/* Column 1: Brand */}
            <FadeIn direction="up" className="md:col-span-2 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-3 mb-4">
                <img
                  src="/logo.png"
                  alt="Sparkfluence"
                  className="w-10 h-10"
                />
                <span className="text-xl font-semibold text-text-primary">
                  SPARKFLUENCE
                </span>
              </Link>
              <p className="text-text-secondary text-base mb-6 max-w-xs">
                {t.footer.description}
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-page text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </FadeIn>

            {/* Column 2: Site Map */}
            <FadeIn direction="up" delay={0.1}>
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                Site Map
              </h3>
              <ul className="space-y-3">
                {siteMapLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FadeIn>

            {/* Column 3: Information */}
            <FadeIn direction="up" delay={0.2}>
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                Information
              </h3>
              <ul className="space-y-3">
                {infoLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FadeIn>

            {/* Column 4: Language Selector */}
            <FadeIn direction="up" delay={0.3}>
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                {t.common.language}
              </h3>
              <LanguageSwitcher variant="list" />
            </FadeIn>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border-default">
          <FadeIn direction="up" delay={0.4}>
            <p className="text-sm text-text-muted text-center md:text-left">
              © {currentYear} AI Studio. {t.footer.allRightsReserved}
            </p>
          </FadeIn>
        </div>
      </div>
    </footer>
  );
};

// Footer Link with hover animation
interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => {
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="relative">
          {children}
          <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
        </span>
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="group inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
    >
      <span className="relative">
        {children}
        <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  );
};
