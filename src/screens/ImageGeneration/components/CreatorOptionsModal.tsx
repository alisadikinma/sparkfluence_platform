import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';
import type { Segment } from '../types';

export const CreatorOptionsModal: React.FC<{
  isOpen: boolean;
  segment: Segment | null;
  onApply: (notes: string) => void;
  onClose: () => void;
  language?: string;
}> = ({ isOpen, segment, onApply, onClose, language = 'en' }) => {
  const [notes, setNotes] = useState('');
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && segment) {
      setNotes(segment.additionalNotes || '');
    }
  }, [isOpen, segment?.id]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !segment) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={modalContentRef}
        className="bg-card border border-border-default rounded-2xl w-full max-w-lg flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Configure {segment.type} (CREATOR)
            </h3>
            {segment.script && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2 italic">
                &quot;{segment.script}&quot;
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              {language === 'id' ? 'Catatan Tambahan (opsional)' : 'Additional Notes (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'id'
                ? 'Contoh: Environment outdoor cafe, golden hour, pencahayaan lebih hangat...'
                : 'e.g., Outdoor cafe environment, golden hour, warmer lighting...'}
              className="w-full bg-surface border border-border-default rounded-lg p-3 text-text-primary resize-none h-28 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-text-muted mt-1">
              {language === 'id'
                ? 'Deskripsi environment, pencahayaan, atau instruksi khusus untuk creator shot'
                : 'Describe environment, lighting, or special instructions for creator shot'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border-default">
          <Button onClick={onClose} variant="outline" className="flex-1">
            {language === 'id' ? 'Batal' : 'Cancel'}
          </Button>
          <Button
            onClick={() => onApply(notes.trim())}
            className="flex-1 bg-gradient-to-r from-primary to-accent-pink hover:opacity-90"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {language === 'id' ? 'Terapkan Opsi' : 'Apply Options'}
          </Button>
        </div>
      </div>
    </div>
  );
};
