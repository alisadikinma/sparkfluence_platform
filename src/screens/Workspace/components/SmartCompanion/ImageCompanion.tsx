import React, { useState, useMemo } from 'react';
import { Activity, Eye, CheckCircle2, Loader2, XCircle, ImageIcon, RefreshCw, Settings2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkspaceSegment } from '../../../../contexts/WorkspaceContext';
import { parseVisualDirection, StructuredVDChips } from '../../../ImageGeneration/components';
import { LAYOUT_OPTIONS } from '../../../ImageGeneration/types';

// ============================================================================
// TYPES
// ============================================================================

type TabKey = 'generation' | 'preview';

export interface ImageGenerationProgress {
  isGenerating: boolean;
  completed: number;
  total: number;
  failed: number;
}

export interface ImageCompanionProps {
  segments: WorkspaceSegment[];
  language: string;
  focusedSegmentId: string | null;
  generationProgress: ImageGenerationProgress;
  onFocusSegment: (id: string | null) => void;
}

// ============================================================================
// TAB CONFIG
// ============================================================================

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'generation', label: 'Generation', icon: <Activity className="w-4 h-4" /> },
  { key: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageCompanion: React.FC<ImageCompanionProps> = ({
  segments,
  language,
  focusedSegmentId,
  generationProgress,
  onFocusSegment,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(
    generationProgress.isGenerating ? 'generation' : 'preview'
  );

  // Computed
  const enabledSegments = useMemo(() => segments.filter(s => s.isEnabled !== false), [segments]);
  const completedCount = useMemo(() => enabledSegments.filter(s => s.imageUrl).length, [enabledSegments]);
  const generatingCount = useMemo(() => enabledSegments.filter(s => s.isGeneratingImage).length, [enabledSegments]);
  const failedCount = useMemo(() => enabledSegments.filter(s => s.imageError).length, [enabledSegments]);

  const focusedSegment = useMemo(() => {
    if (!focusedSegmentId) return null;
    return segments.find(s => s.id === focusedSegmentId) || null;
  }, [focusedSegmentId, segments]);

  // Auto-switch to generation tab when generation starts
  React.useEffect(() => {
    if (generationProgress.isGenerating && activeTab !== 'generation') {
      setActiveTab('generation');
    }
  }, [generationProgress.isGenerating]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex border-b border-[#262626] px-2 pt-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors relative ${
              activeTab === tab.key
                ? 'text-emerald-400 bg-[#161616]'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'generation' && generationProgress.isGenerating && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {activeTab === tab.key && (
              <motion.div
                layoutId="image-companion-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'generation' && (
            <motion.div
              key="generation"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4"
            >
              {/* Overall Progress */}
              <div className="bg-[#161616] border border-[#262626] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  {language === 'id' ? 'Progress Keseluruhan' : 'Overall Progress'}
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-bold text-emerald-400">
                    {completedCount}/{enabledSegments.length}
                  </div>
                  <div className="text-xs text-neutral-500 leading-relaxed">
                    {language === 'id' ? 'gambar selesai' : 'images completed'}
                    {generatingCount > 0 && (
                      <div className="text-emerald-400">{generatingCount} {language === 'id' ? 'sedang proses' : 'in progress'}</div>
                    )}
                    {failedCount > 0 && (
                      <div className="text-red-400">{failedCount} {language === 'id' ? 'gagal' : 'failed'}</div>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${enabledSegments.length > 0 ? (completedCount / enabledSegments.length) * 100 : 0}%` }}
                    />
                    {generatingCount > 0 && (
                      <div
                        className="bg-emerald-500/40 animate-pulse transition-all duration-500"
                        style={{ width: `${enabledSegments.length > 0 ? (generatingCount / enabledSegments.length) * 100 : 0}%` }}
                      />
                    )}
                    {failedCount > 0 && (
                      <div
                        className="bg-red-500 transition-all duration-500"
                        style={{ width: `${enabledSegments.length > 0 ? (failedCount / enabledSegments.length) * 100 : 0}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Segment Status List */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-neutral-400 px-1">
                  {language === 'id' ? 'Status per Segmen' : 'Per-Segment Status'}
                </h4>
                {enabledSegments.map((seg, idx) => {
                  const isCreator = seg.shotType === 'CREATOR';
                  const isFocused = focusedSegmentId === seg.id;
                  return (
                    <button
                      key={seg.id}
                      onClick={() => onFocusSegment(isFocused ? null : seg.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                        isFocused ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-[#1E1E1E] border border-transparent'
                      }`}
                    >
                      {/* Status icon */}
                      {seg.isGeneratingImage ? (
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />
                      ) : seg.imageError ? (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : seg.imageUrl ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                      )}
                      {/* Segment info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                            isCreator ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>{seg.segmentType}</span>
                          <span className="text-[10px] text-neutral-500">{seg.durationSeconds}s</span>
                        </div>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{seg.script || '(no script)'}</p>
                      </div>
                      {/* Image count */}
                      {seg.images && seg.images.length > 0 && (
                        <span className="text-[10px] text-neutral-500 bg-[#0B0E14] px-1.5 py-0.5 rounded flex-shrink-0">
                          {seg.images.filter(i => i.status === 2).length}/{seg.images.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4"
            >
              {focusedSegment ? (
                <>
                  {/* Focused Segment Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        focusedSegment.shotType === 'CREATOR' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>{focusedSegment.segmentType}</span>
                      <span className="text-xs text-neutral-500">{focusedSegment.durationSeconds}s</span>
                      <span className="text-xs text-neutral-500">{focusedSegment.shotType}</span>
                    </div>
                    <button
                      onClick={() => onFocusSegment(null)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {language === 'id' ? 'Tutup' : 'Close'}
                    </button>
                  </div>

                  {/* Large Image Preview */}
                  <div className="aspect-[9/16] max-h-[400px] bg-[#161616] border border-[#262626] rounded-xl overflow-hidden">
                    {focusedSegment.imageUrl ? (
                      <img
                        src={focusedSegment.imageUrl}
                        alt={focusedSegment.segmentType}
                        className="w-full h-full object-cover"
                      />
                    ) : focusedSegment.isGeneratingImage ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <span className="text-xs text-neutral-500">
                          {language === 'id' ? 'Membuat gambar...' : 'Generating...'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-600">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-xs">
                          {language === 'id' ? 'Belum ada gambar' : 'No image yet'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image Gallery (variations) */}
                  {focusedSegment.images && focusedSegment.images.filter(i => i.status === 2 && i.imageUrl).length > 1 && (
                    <div>
                      <h4 className="text-xs font-medium text-neutral-400 mb-2">
                        {language === 'id' ? 'Variasi' : 'Variations'} ({focusedSegment.images.filter(i => i.status === 2).length})
                      </h4>
                      <div className="flex gap-2">
                        {focusedSegment.images
                          .filter(i => i.status === 2 && i.imageUrl)
                          .map(img => (
                            <div
                              key={img.id}
                              className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                img.isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-[#262626] hover:border-neutral-600'
                              }`}
                            >
                              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Visual Direction Chips */}
                  {focusedSegment.visualDirection && (() => {
                    const svd = focusedSegment.structuredVD || parseVisualDirection(focusedSegment.visualDirection);
                    if (!svd) return null;
                    return (
                      <div>
                        <h4 className="text-xs font-medium text-neutral-400 mb-2">
                          {language === 'id' ? 'Arahan Visual' : 'Visual Direction'}
                        </h4>
                        <StructuredVDChips structuredVD={svd} />
                      </div>
                    );
                  })()}

                  {/* Applied Options Badges */}
                  {focusedSegment.optionsApplied && (
                    <div>
                      <h4 className="text-xs font-medium text-neutral-400 mb-2">
                        {language === 'id' ? 'Opsi Diterapkan' : 'Applied Options'}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {focusedSegment.referenceImageUrl && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Ref Image
                          </span>
                        )}
                        {focusedSegment.additionalNotes && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                            <Settings2 className="w-3 h-3" /> Notes
                          </span>
                        )}
                        {focusedSegment.includeCreatorFace && focusedSegment.shotType !== 'CREATOR' && (
                          <span className="text-[10px] text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg border border-pink-500/20">
                            + Creator Face
                          </span>
                        )}
                        {(focusedSegment.shotType === 'CREATOR' || focusedSegment.includeCreatorFace) && (
                          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                            {LAYOUT_OPTIONS.find(o => o.value === focusedSegment.layout)?.label || 'Full'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Script */}
                  <div>
                    <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Script</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed bg-[#161616] border border-[#262626] rounded-lg p-3">
                      {focusedSegment.script || '(no script)'}
                    </p>
                  </div>
                </>
              ) : (
                /* No segment focused */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Eye className="w-10 h-10 text-neutral-700 mb-3" />
                  <h3 className="text-sm font-medium text-neutral-400 mb-1">
                    {language === 'id' ? 'Pilih Segmen' : 'Select a Segment'}
                  </h3>
                  <p className="text-xs text-neutral-600 max-w-[200px]">
                    {language === 'id'
                      ? 'Klik segmen di panel kiri untuk melihat preview detail di sini'
                      : 'Click a segment in the left panel to see its detailed preview here'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
