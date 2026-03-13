import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CarouselProject, CarouselProjectRow } from '../../types/carousel';
import { mapCarouselProjectRow } from '../../types/carousel';
import { SourceStep } from './steps/SourceStep';
import { GenerateStep } from './steps/GenerateStep';
import { VideoStep } from './steps/VideoStep';
import { PublishStep } from './steps/PublishStep';
const EditStep = React.lazy(() => import('./steps/EditStep').then(m => ({ default: m.EditStep })));

// Step definitions
const STEPS = [
  { id: 'source', label: 'Source', number: 1 },
  { id: 'generate', label: 'Generate', number: 2 },
  { id: 'edit', label: 'Edit', number: 3 },
  { id: 'video', label: 'Video', number: 4 },
  { id: 'publish', label: 'Publish', number: 5 },
] as const;

type StepId = typeof STEPS[number]['id'];

// Step status based on project status
function getStepStatus(stepId: StepId, projectStatus: string): 'completed' | 'active' | 'upcoming' {
  const statusOrder: Record<string, number> = {
    draft: 0,
    source_ready: 1,
    generated: 2,
    edited: 3,
    video_ready: 4,
    published: 5,
    complete: 5,
  };
  const stepOrder: Record<StepId, number> = {
    source: 0,
    generate: 1,
    edit: 2,
    video: 3,
    publish: 4,
  };
  const currentOrder = statusOrder[projectStatus] ?? 0;
  const thisOrder = stepOrder[stepId];

  if (thisOrder < currentOrder) return 'completed';
  if (thisOrder === currentOrder) return 'active';
  return 'upcoming';
}

export const CarouselWorkspace: React.FC = () => {
  const { projectId, step } = useParams<{ projectId: string; step?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [project, setProject] = useState<CarouselProject | null>(null);
  const [loading, setLoading] = useState(true);

  const currentStep = (step as StepId) || 'source';

  // Fetch project
  const fetchProject = useCallback(async () => {
    if (!user || !projectId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_projects')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (!error && data) {
      setProject(mapCarouselProjectRow(data as CarouselProjectRow));
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Navigate to step
  const goToStep = (stepId: StepId) => {
    navigate(`/carousel-images/${projectId}/${stepId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0B0E14]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0B0E14] gap-4">
        <p className="text-neutral-400">Project not found</p>
        <button
          onClick={() => navigate('/carousel-images')}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-neutral-800">
        <button
          onClick={() => navigate('/carousel-images')}
          className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-200 truncate">{project.title}</h2>
          <p className="text-xs text-neutral-500">{project.projectId}</p>
        </div>
      </div>

      {/* Step Bar */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-neutral-800/50">
        {STEPS.map((s, i) => {
          const status = getStepStatus(s.id, project.status);
          const isCurrent = s.id === currentStep;

          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <div className={`flex-1 h-px max-w-[60px] ${status === 'upcoming' ? 'bg-neutral-800' : 'bg-emerald-500/30'}`} />
              )}
              <button
                onClick={() => goToStep(s.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${isCurrent
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : status === 'completed'
                      ? 'text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/5'
                      : 'text-neutral-600 hover:text-neutral-400 hover:bg-neutral-900'
                  }
                `}
              >
                <span className={`
                  flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                  ${isCurrent
                    ? 'bg-emerald-500 text-white'
                    : status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-600'
                  }
                `}>
                  {status === 'completed' ? <Check className="w-3 h-3" /> : s.number}
                </span>
                {s.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {currentStep === 'source' && (
          <SourceStep project={project} onProjectUpdate={fetchProject} />
        )}
        {currentStep === 'generate' && (
          <GenerateStep project={project} onProjectUpdate={fetchProject} />
        )}
        {currentStep === 'edit' && (
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <EditStep project={project} onProjectUpdate={fetchProject} />
          </React.Suspense>
        )}
        {currentStep === 'video' && (
          <VideoStep project={project} onProjectUpdate={fetchProject} />
        )}
        {currentStep === 'publish' && (
          <div className="p-6">
            <PublishStep project={project} onProjectUpdate={fetchProject} />
          </div>
        )}
      </div>
    </div>
  );
};
