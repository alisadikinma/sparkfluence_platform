import React, { useState } from 'react';
import { Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

export interface ImageModelSettings {
  aRoll: string;
  bRoll: string;
}

interface ModelOption {
  key: string;
  label: string;
  cost: string;
}

const A_ROLL_MODELS: ModelOption[] = [
  { key: 'fal-nano-banana-edit', label: 'Auto (Nano Banana 2)', cost: '$0.08' },
  { key: 'fal-qwen-image-2-pro-edit', label: 'Qwen Image 2 Pro', cost: '$0.075' },
  { key: 'fal-seedream-v5-lite-edit', label: 'Seedream v5 Lite', cost: '$0.035' },
];

const B_ROLL_MODELS: ModelOption[] = [
  { key: 'fal-seedream-v4', label: 'Auto (Seedream v4)', cost: '$0.03' },
  { key: 'fal-seedream-v4-5', label: 'Seedream v4.5', cost: '$0.04' },
  { key: 'fal-qwen-image', label: 'Qwen Image', cost: '$0.035' },
];

interface ModelSelectorProps {
  models: ImageModelSettings;
  onModelsChange: (models: ImageModelSettings) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ models, onModelsChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedARoll = A_ROLL_MODELS.find(m => m.key === models.aRoll) || A_ROLL_MODELS[0];
  const selectedBRoll = B_ROLL_MODELS.find(m => m.key === models.bRoll) || B_ROLL_MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        Models
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-50 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-4">
            <p className="text-xs font-semibold text-neutral-200 mb-3">Image Model Selection</p>

            {/* A-ROLL */}
            <div className="mb-3">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">
                A-ROLL (HOOK, FORE, CTA)
              </p>
              <select
                value={models.aRoll}
                onChange={e => onModelsChange({ ...models, aRoll: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-emerald-500 transition-colors"
              >
                {A_ROLL_MODELS.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} — {m.cost}
                  </option>
                ))}
              </select>
            </div>

            {/* B-ROLL */}
            <div className="mb-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">
                B-ROLL (BODY)
              </p>
              <select
                value={models.bRoll}
                onChange={e => onModelsChange({ ...models, bRoll: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-emerald-500 transition-colors"
              >
                {B_ROLL_MODELS.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} — {m.cost}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-neutral-600">
              Selected models apply to new generations
            </p>
          </div>
        </>
      )}
    </div>
  );
};
