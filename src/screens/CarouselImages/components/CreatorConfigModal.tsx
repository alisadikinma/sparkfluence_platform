import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CarouselSlide, CarouselSlideType } from '../../../types/carousel';

interface CreatorConfigModalProps {
  slide: CarouselSlide;
  slideIndex: number;
  onApply: (config: { additionalNote: string }) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<CarouselSlideType, string> = {
  HOOK: 'HOOK (Creator)',
  FORE: 'FORESHADOW (Creator)',
  BODY: 'BODY (B-Roll)',
  PEAK: 'PEAK',
  CTA: 'CTA (Creator)',
};

export const CreatorConfigModal: React.FC<CreatorConfigModalProps> = ({
  slide,
  slideIndex,
  onApply,
  onClose,
}) => {
  const [notes, setNotes] = useState(slide.additionalNote || '');

  const slideText = slide.analysisData?.textContent?.join(' ') ||
    slide.analysisData?.topic || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Configure {TYPE_LABELS[slide.slideType] || slide.slideType}
            </h3>
            {slideText && (
              <p className="text-[11px] text-emerald-400/70 mt-1 line-clamp-2 italic">
                "{slideText.slice(0, 120)}{slideText.length > 120 ? '...' : ''}"
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Catatan Tambahan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: Environment outdoor cafe, golden hour, pencahayaan lebih hangat..."
            rows={4}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none"
          />
          <p className="text-[10px] text-neutral-600 mt-1">
            Deskripsi environment, pencahayaan, atau instruksi khusus untuk creator shot
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onApply({ additionalNote: notes })}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Terapkan Opsi
          </button>
        </div>
      </div>
    </div>
  );
};
