import React, { useState, useEffect, useRef } from 'react';
import { LAYOUT_OPTIONS, type Segment } from '../types';

export const LayoutPopover: React.FC<{
  value: Segment['layout'];
  onChange: (layout: Segment['layout']) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentLabel = LAYOUT_OPTIONS.find(o => o.value === value)?.label || 'Full';

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-text-muted text-xs bg-transparent border border-border-default rounded px-1.5 py-0.5 hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex items-center gap-1"
        title="Creator layout"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="10" height="10" rx="1" />
          <line x1="6" y1="1" x2="6" y2="11" />
        </svg>
        {currentLabel}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border-default rounded-lg shadow-xl p-2 min-w-[280px]">
          <div className="grid grid-cols-5 gap-1.5">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex flex-col items-center gap-1 p-1 rounded-md transition-colors cursor-pointer ${
                  value === opt.value
                    ? 'ring-2 ring-purple-500 bg-purple-500/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <img
                  src={opt.image}
                  alt={opt.label}
                  className="w-[42px] h-[63px] object-cover rounded-sm"
                  loading="lazy"
                />
                <span className="text-[9px] text-text-muted leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
