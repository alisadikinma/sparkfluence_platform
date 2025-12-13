import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative w-14 h-8 rounded-full p-1
        bg-surface border border-border-default
        transition-colors duration-300
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track Background */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        initial={false}
        animate={{
          backgroundColor: isDark ? '#1E1E2E' : '#E0E7FF',
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Sliding Circle */}
      <motion.div
        className="relative w-6 h-6 rounded-full shadow-md flex items-center justify-center"
        initial={false}
        animate={{
          x: isDark ? 24 : 0,
          backgroundColor: isDark ? '#8B5CF6' : '#FCD34D',
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {/* Sun Icon */}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-yellow-900"
          initial={false}
          animate={{
            scale: isDark ? 0 : 1,
            rotate: isDark ? -90 : 0,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </motion.svg>

        {/* Moon Icon */}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-white absolute"
          initial={false}
          animate={{
            scale: isDark ? 1 : 0,
            rotate: isDark ? 0 : 90,
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </motion.svg>
      </motion.div>

      {/* Stars (visible in dark mode) */}
      <motion.div
        className="absolute top-1.5 left-2"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.2, delay: isDark ? 0.1 : 0 }}
      >
        <div className="w-1 h-1 bg-white rounded-full" />
      </motion.div>
      <motion.div
        className="absolute top-3 left-4"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.2, delay: isDark ? 0.15 : 0 }}
      >
        <div className="w-0.5 h-0.5 bg-white/70 rounded-full" />
      </motion.div>
    </motion.button>
  );
};
