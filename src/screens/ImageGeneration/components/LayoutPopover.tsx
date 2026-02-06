import React, { useState, useEffect, useRef } from 'react';
import { LAYOUT_OPTIONS, type Segment } from '../types';

/** Inline SVG schematic for each layout type (9:16 aspect ratio, 42x63px) */
export const LayoutIcon: React.FC<{ layout: Segment['layout']; className?: string }> = ({ layout, className }) => (
  <svg
    viewBox="0 0 42 63"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Phone frame */}
    <rect x="1" y="1" width="40" height="61" rx="3" stroke="currentColor" strokeWidth="1" className="text-white/30" />

    {layout === 'full' && (
      /* Full: Creator fills entire frame */
      <rect x="2" y="2" width="38" height="59" rx="2" className="fill-purple-500/50" />
    )}

    {layout === 'split-60-40' && (<>
      {/* Left 60%: Creator */}
      <rect x="2" y="2" width="22" height="59" rx="2" className="fill-purple-500/50" />
      {/* Right 40%: B-Roll */}
      <rect x="25" y="2" width="15" height="59" rx="2" className="fill-white/15" />
    </>)}

    {layout === 'split-50-50' && (<>
      {/* Left 50%: Creator */}
      <rect x="2" y="2" width="18" height="59" rx="2" className="fill-purple-500/50" />
      {/* Right 50%: B-Roll */}
      <rect x="21" y="2" width="19" height="59" rx="2" className="fill-white/15" />
    </>)}

    {layout === 'pip' && (<>
      {/* Full background: B-Roll */}
      <rect x="2" y="2" width="38" height="59" rx="2" className="fill-white/15" />
      {/* Small PiP: Creator in bottom-right */}
      <rect x="24" y="40" width="14" height="19" rx="2" className="fill-purple-500/50" stroke="currentColor" strokeWidth="0.5" />
    </>)}

    {layout === 'creator-center' && (<>
      {/* Background: B-Roll */}
      <rect x="2" y="2" width="38" height="59" rx="2" className="fill-white/15" />
      {/* Centered Creator */}
      <rect x="8" y="10" width="26" height="43" rx="2" className="fill-purple-500/50" />
    </>)}

    {/* Creator label */}
    <text x="50%" y={layout === 'pip' ? '25' : '32'} textAnchor="middle" className="fill-purple-300" fontSize="6" fontWeight="bold">
      {layout === 'pip' ? '' : 'C'}
    </text>
  </svg>
);

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
                <LayoutIcon layout={opt.value} className="w-[42px] h-[63px]" />
                <span className="text-[9px] text-text-muted leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
