import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className={`
        relative w-full max-w-[600px] mx-auto
        ${isFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-page' : ''}
        rounded-full overflow-hidden transition-all
      `}
      animate={{
        scale: isFocused ? 1.02 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Search Icon */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className={`w-5 h-5 ${isFocused ? 'text-primary' : 'text-text-muted'}`} />
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="
          w-full h-12 md:h-14 pl-14 pr-12
          bg-card border border-border-default
          rounded-full
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-primary
          transition-colors
        "
      />

      {/* Clear Button */}
      {value && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-surface transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </motion.button>
      )}

      {/* Search Button (Mobile) */}
      <motion.button
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-primary text-white md:hidden"
        whileTap={{ scale: 0.9 }}
        style={{ display: value ? 'none' : undefined }}
      >
        <Search className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
