import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import type { Segment } from '../types';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | null;
  onRegenerate: (notes: string) => void;
}

export const RegenerateModal: React.FC<RegenerateModalProps> = ({
  isOpen,
  onClose,
  segment,
  onRegenerate,
}) => {
  const [notes, setNotes] = useState('');

  // Reset notes when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !segment) return null;

  const handleSubmit = () => {
    onRegenerate(notes);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border-default rounded-2xl p-6 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Title */}
        <h3 className="text-xl font-bold text-text-primary mb-4">Regenerate Image</h3>

        {/* Segment info */}
        <div className="mb-4 p-3 bg-surface rounded-lg">
          <p className="text-sm text-text-muted mb-1">
            Segment: <span className="text-primary font-medium">{segment.type}</span>
          </p>
          <p className="text-xs text-text-secondary line-clamp-2">{segment.script}</p>
        </div>

        {/* Original prompt display */}
        <div className="mb-4">
          <label className="text-sm text-text-muted block mb-1">Original Visual Direction:</label>
          <div className="text-sm text-text-secondary bg-surface p-3 rounded-lg max-h-24 overflow-y-auto">
            {segment.visualDirection || 'No visual direction provided'}
          </div>
        </div>

        {/* Notes input */}
        <div className="mb-6">
          <label className="text-sm text-text-muted block mb-1">Additional Notes (optional):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Make it darker, add more contrast, change lighting..."
            className="w-full bg-surface border border-border-default rounded-lg p-3 text-text-primary resize-none h-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Notes akan ditambahkan ke prompt untuk hasil yang lebih sesuai
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary-hover">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
};
