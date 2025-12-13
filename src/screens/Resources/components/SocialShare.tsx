import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Twitter, Mail, MessageCircle } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title: string;
}

const shareButtons = [
  { icon: Link2, label: 'Copy Link', action: 'copy' },
  { icon: Twitter, label: 'Twitter', action: 'twitter' },
  { icon: Mail, label: 'Email', action: 'email' },
  { icon: MessageCircle, label: 'WhatsApp', action: 'whatsapp' },
];

export const SocialShare: React.FC<SocialShareProps> = ({ url, title }) => {
  const handleShare = async (action: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    switch (action) {
      case 'copy':
        await navigator.clipboard.writeText(url);
        // You could add a toast notification here
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodedTitle}&body=${encodedUrl}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank');
        break;
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col gap-3 fixed left-8 top-1/2 -translate-y-1/2 z-40">
        {shareButtons.map((button, index) => (
          <motion.button
            key={button.label}
            onClick={() => handleShare(button.action)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="
              w-10 h-10 rounded-full
              bg-card border border-border-default
              flex items-center justify-center
              text-text-muted hover:text-primary hover:border-primary/50
              transition-colors
            "
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={button.label}
          >
            <button.icon className="w-5 h-5" />
          </motion.button>
        ))}
      </div>

      {/* Mobile Bottom Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="
          lg:hidden fixed bottom-0 left-0 right-0 z-40
          h-[60px] px-4
          bg-card/80 backdrop-blur-lg border-t border-border-default
          flex items-center justify-around
        "
      >
        {shareButtons.map((button) => (
          <motion.button
            key={button.label}
            onClick={() => handleShare(button.action)}
            className="
              flex flex-col items-center gap-1
              text-text-muted hover:text-primary
              transition-colors
            "
            whileTap={{ scale: 0.9 }}
          >
            <button.icon className="w-5 h-5" />
            <span className="text-xs">{button.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </>
  );
};
