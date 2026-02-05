// ============================================================================
// Sparkfluence Studio — Main Screen
// The CapCut-like AI video editor. Receives pipeline data via location.state,
// builds the composition, and presents the 3-panel + timeline layout.
// ============================================================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { StudioProvider, useStudio } from '../../contexts/StudioContext';
import { useAutoCompose } from '../../hooks/useAutoCompose';
import { useStudioExport } from '../../hooks/useStudioExport';
import { buildProjectFromPipeline } from '../../lib/composition';
import { AssetPanel } from '../../components/studio/AssetPanel';
import { Canvas } from '../../components/studio/Canvas';
import { PropertiesPanel } from '../../components/studio/PropertiesPanel';
import { Timeline } from '../../components/studio/Timeline';
import { PlaybackShortcuts } from '../../components/studio/PlaybackControls';
import { Button } from '../../components/ui/button';
import type { PipelineInput } from '../../types/studio';

// --- Outer Wrapper with Provider ---
export const SparkfluenceStudio: React.FC = () => {
  return (
    <StudioProvider>
      <StudioInner />
    </StudioProvider>
  );
};

// --- Inner Editor ---
const StudioInner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { state, dispatch } = useStudio();
  const { autoComposeAll } = useAutoCompose();
  const { exportState, startExport, cancelExport, saveComposition } = useStudioExport();
  const [initialized, setInitialized] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Initialize project from pipeline data
  useEffect(() => {
    if (initialized) return;

    const pipelineData = location.state as PipelineInput | null;

    if (!pipelineData?.segments?.length) {
      // Try session storage fallback
      const cached = sessionStorage.getItem('sparkfluence_studio_input');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as PipelineInput;
          if (parsed.segments?.length) {
            initializeFromPipeline(parsed);
            return;
          }
        } catch { /* ignore */ }
      }

      // No data — redirect back
      navigate('/video-generation', { replace: true });
      return;
    }

    // Cache for refresh
    sessionStorage.setItem('sparkfluence_studio_input', JSON.stringify(pipelineData));
    initializeFromPipeline(pipelineData);
  }, [initialized]);

  function initializeFromPipeline(input: PipelineInput) {
    const project = buildProjectFromPipeline(input, user?.id || '');
    dispatch({ type: 'SET_PROJECT', project });
    setInitialized(true);
  }

  // Auto-compose on first load
  useEffect(() => {
    if (initialized && state.project.segments.length > 0) {
      // Small delay to let state settle
      const timer = setTimeout(() => autoComposeAll(), 100);
      return () => clearTimeout(timer);
    }
  }, [initialized]);

  // Save on Ctrl+S
  useEffect(() => {
    const handleSave = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveComposition();
      }
    };
    window.addEventListener('keydown', handleSave);
    return () => window.removeEventListener('keydown', handleSave);
  }, [saveComposition]);

  if (!initialized) {
    return (
      <div className="h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a12] text-white overflow-hidden select-none">
      {/* Keyboard Shortcuts */}
      <PlaybackShortcuts />

      {/* Top Bar */}
      <div className="flex items-center h-10 px-3 bg-[#13131f] border-b border-[#2b2b38] flex-shrink-0">
        {/* Left: Back + Title */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-sm mr-3"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-white truncate max-w-[200px]">
          {state.project.title}
        </span>
        {state.isDirty && <span className="text-[10px] text-gray-500 ml-1">*</span>}

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveComposition()}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#2b2b38]"
          >
            Save
          </button>
          <Button
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7"
          >
            Export Video
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Asset Panel */}
        <div className="w-52 flex-shrink-0">
          <AssetPanel />
        </div>

        {/* Center: Canvas Preview */}
        <div className="flex-1 min-w-0">
          <Canvas />
        </div>

        {/* Right: Properties Panel */}
        <div className="w-56 flex-shrink-0">
          <PropertiesPanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-52 flex-shrink-0">
        <Timeline />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          exportState={exportState}
          onExport={startExport}
          onCancel={cancelExport}
        />
      )}
    </div>
  );
};

// --- Export Modal ---
const ExportModal: React.FC<{
  onClose: () => void;
  exportState: any;
  onExport: () => void;
  onCancel: () => void;
}> = ({ onClose, exportState, onExport, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a28] rounded-xl p-6 w-96 shadow-2xl border border-[#2b2b38]">
        <h3 className="text-lg font-semibold mb-4">Export Video</h3>

        {exportState.status === 'idle' && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Your composition will be sent to the server for rendering.
              The final video will be uploaded to your gallery.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onExport}
                className="flex-1 bg-purple-600 hover:bg-purple-500"
              >
                Start Export
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600"
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {(exportState.status === 'preparing' || exportState.status === 'rendering' || exportState.status === 'uploading') && (
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300 mb-2 capitalize">{exportState.status}...</p>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{Math.round(exportState.progress)}%</p>
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-white mt-3"
            >
              Cancel
            </button>
          </div>
        )}

        {exportState.status === 'done' && (
          <div className="text-center">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-sm text-green-400 mb-3">Export Complete!</p>
            {exportState.outputUrl && (
              <a
                href={exportState.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 underline block mb-3"
              >
                Download Video
              </a>
            )}
            <Button onClick={onClose} variant="outline" className="border-gray-600">
              Close
            </Button>
          </div>
        )}

        {exportState.status === 'error' && (
          <div className="text-center">
            <div className="text-4xl mb-2">✕</div>
            <p className="text-sm text-red-400 mb-2">Export Failed</p>
            <p className="text-xs text-gray-500 mb-3">{exportState.error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={onExport} size="sm" className="bg-purple-600">
                Retry
              </Button>
              <Button onClick={onClose} size="sm" variant="outline" className="border-gray-600">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
