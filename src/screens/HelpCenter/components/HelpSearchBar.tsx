import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchFAQs, HelpCategory, FAQ } from '../data/helpData';

interface HelpSearchBarProps {
  placeholder?: string;
}

export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({
  placeholder = 'Search for help...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<{ category: HelpCategory; faq: FAQ }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = searchFAQs(query);
      setResults(searchResults.slice(0, 5)); // Limit to 5 results
    } else {
      setResults([]);
    }
  }, [query]);

  const handleResultClick = (category: HelpCategory) => {
    setQuery('');
    setResults([]);
    navigate(`/help/${category.slug}`);
  };

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      <motion.div
        className={`
          relative rounded-full overflow-hidden transition-all
          ${isFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-page' : ''}
        `}
        animate={{ scale: isFocused ? 1.02 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Search Icon */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className={`w-5 h-5 ${isFocused ? 'text-primary' : 'text-text-muted'}`} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
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
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </motion.button>
        )}
      </motion.div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {results.length > 0 && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="
              absolute top-full left-0 right-0 mt-2
              bg-card border border-border-default rounded-xl
              shadow-xl overflow-hidden z-50
            "
          >
            {results.map(({ category, faq }, index) => (
              <motion.button
                key={faq.id}
                onClick={() => handleResultClick(category)}
                className="
                  w-full flex items-start gap-3 p-4 text-left
                  hover:bg-surface transition-colors
                  border-b border-border-default last:border-b-0
                "
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <category.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary line-clamp-1">
                    {faq.question}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {category.title}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
