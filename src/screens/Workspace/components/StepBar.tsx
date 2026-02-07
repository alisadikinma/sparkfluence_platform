import React from 'react';
import { FileText, Image, Video, Film, Check, Lock } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface StepInfo {
  id: 'script' | 'images' | 'video' | 'studio';
  label: string;
  icon: 'FileText' | 'Image' | 'Video' | 'Film';
  status: 'locked' | 'active' | 'completed' | 'current';
  badge?: string;
}

export interface StepBarProps {
  steps: StepInfo[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
}

// ============================================================================
// ICON MAP
// ============================================================================

const iconMap = {
  FileText,
  Image,
  Video,
  Film,
} as const;

// ============================================================================
// STEP BAR COMPONENT
// ============================================================================

export const StepBar: React.FC<StepBarProps> = ({ steps, activeStep, onStepClick }) => {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const Icon = iconMap[step.icon];
        const isCurrent = step.id === activeStep;
        const isCompleted = step.status === 'completed';
        const isLocked = step.status === 'locked';

        return (
          <React.Fragment key={step.id}>
            {/* Connector line between steps */}
            {index > 0 && (
              <div
                className={`h-px w-6 sm:w-10 flex-shrink-0 transition-colors ${
                  isCompleted || isCurrent ? 'bg-emerald-500/50' : 'bg-[#262626]'
                }`}
              />
            )}

            {/* Step indicator */}
            <button
              type="button"
              onClick={() => {
                if (!isLocked) {
                  onStepClick(step.id);
                }
              }}
              disabled={isLocked}
              className={`
                relative flex flex-col items-center gap-1.5 group
                transition-all duration-200
                ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
              title={isLocked ? `${step.label} — Locked` : step.label}
            >
              {/* Circle with icon */}
              <div
                className={`
                  relative flex items-center justify-center w-9 h-9 rounded-full
                  border-2 transition-all duration-200
                  ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : isCompleted
                        ? 'border-green-500 bg-green-500/15'
                        : isLocked
                          ? 'border-[#262626] bg-[#161616]'
                          : 'border-[#3f3f46] bg-[#161616]'
                  }
                  ${!isLocked && !isCurrent ? 'group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-green-500" strokeWidth={2.5} />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-[#57534E]" />
                ) : (
                  <Icon
                    className={`w-4 h-4 ${
                      isCurrent ? 'text-emerald-500' : 'text-[#A8A29E]'
                    }`}
                  />
                )}

                {/* Badge (e.g., "3/7") */}
                {step.badge && (
                  <span
                    className={`
                      absolute -top-1.5 -right-1.5 text-[9px] font-bold leading-none
                      px-1.5 py-0.5 rounded-full
                      ${
                        isCurrent
                          ? 'bg-emerald-500 text-white'
                          : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-[#262626] text-[#A8A29E]'
                      }
                    `}
                  >
                    {step.badge}
                  </span>
                )}
              </div>

              {/* Label below */}
              <span
                className={`
                  text-[10px] font-medium leading-none whitespace-nowrap
                  transition-colors duration-200
                  ${
                    isCurrent
                      ? 'text-emerald-500'
                      : isCompleted
                        ? 'text-green-500'
                        : isLocked
                          ? 'text-[#57534E]'
                          : 'text-[#78716C] group-hover:text-[#A8A29E]'
                  }
                `}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
