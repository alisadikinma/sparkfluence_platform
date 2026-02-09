import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SliderValues {
  hookAggressiveness: number;  // 1-10
  controversyLevel: number;    // 1-10
  humorDensity: number;        // 1-10
  pacing: number;              // 1-10
  emotionalIntensity: number;  // 1-10
}

export const DEFAULT_SLIDER_VALUES: SliderValues = {
  hookAggressiveness: 5,
  controversyLevel: 3,
  humorDensity: 4,
  pacing: 6,
  emotionalIntensity: 5,
};

interface TuningSlidersProps {
  values: SliderValues;
  onChange: (values: SliderValues) => void;
  onApply: () => void;
  disabled?: boolean;
}

// ============================================================================
// SLIDER CONFIG
// ============================================================================

interface SliderConfig {
  key: keyof SliderValues;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'hookAggressiveness', label: 'Hook Aggressiveness', leftLabel: 'Safe', rightLabel: 'Brutal' },
  { key: 'controversyLevel', label: 'Controversy Level', leftLabel: 'Mild', rightLabel: 'Spicy' },
  { key: 'humorDensity', label: 'Humor Density', leftLabel: 'Serious', rightLabel: 'Comedy' },
  { key: 'pacing', label: 'Pacing', leftLabel: 'Slow', rightLabel: 'Rapid' },
  { key: 'emotionalIntensity', label: 'Emotional Intensity', leftLabel: 'Subtle', rightLabel: 'Drama' },
];

// ============================================================================
// SINGLE SLIDER
// ============================================================================

const SingleSlider: React.FC<{
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}> = ({ config, value, onChange, disabled }) => {
  const percent = ((value - 1) / 9) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#A8A29E]">{config.label}</span>
        <span className="text-[10px] font-mono text-emerald-400">{value}/10</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className={`
            w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-[#262626] accent-emerald-500
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-emerald-500
            [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:cursor-pointer
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
          style={{
            background: disabled
              ? '#262626'
              : `linear-gradient(to right, #10B981 0%, #10B981 ${percent}%, #262626 ${percent}%, #262626 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[8px] text-[#57534E]">{config.leftLabel}</span>
        <span className="text-[8px] text-[#57534E]">{config.rightLabel}</span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TuningSliders: React.FC<TuningSlidersProps> = ({
  values,
  onChange,
  onApply,
  disabled = false,
}) => {
  const handleChange = (key: keyof SliderValues, value: number) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4">
      {SLIDER_CONFIGS.map((config) => (
        <SingleSlider
          key={config.key}
          config={config}
          value={values[config.key]}
          onChange={(v) => handleChange(config.key, v)}
          disabled={disabled}
        />
      ))}

      {/* Apply button */}
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className={`
          w-full py-2 rounded-lg text-[11px] font-medium
          transition-all duration-200 border
          ${disabled
            ? 'border-[#262626] bg-[#161616] text-[#57534E] cursor-not-allowed'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          }
        `}
      >
        Apply Changes
      </button>
    </div>
  );
};
