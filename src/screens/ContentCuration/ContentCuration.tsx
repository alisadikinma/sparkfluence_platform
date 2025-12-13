import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";

export const ContentCuration = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Analyzing your niche preferences...",
    "Finding trending topics...",
    "Curating personalized content...",
    "Matching with your creative DNA...",
    "Finalizing your content strategy..."
  ];

  useEffect(() => {
    const generateTopics = async () => {
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No session found");
          clearInterval(stepInterval);
          navigate("/topic-selection");
          return;
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-topics`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interest: location.state?.interest || "general content",
            profession: location.state?.profession,
            platform: location.state?.platform,
            objective: location.state?.objective,
            niche: location.state?.niche,
            creativeStyle: location.state?.creativeStyle,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate topics");
        }

        const data = await response.json();

        setTimeout(() => {
          clearInterval(stepInterval);
          navigate("/topic-selection", {
            state: {
              ...location.state,
              topics: data.topics
            }
          });
        }, 10000);
      } catch (error) {
        console.error("Error generating topics:", error);
        setTimeout(() => {
          navigate("/topic-selection", {
            state: location.state
          });
        }, 10000);
      }
    };

    generateTopics();
  }, [navigate, location.state]);

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#ec4899]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7c3aed]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#7c3aed] rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-12 justify-center">
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full animate-pulse" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 animate-fade-in">
            Curating Your Content
          </h1>
          <p className="text-white/60 text-lg">
            We're personalizing 5 topics based on your preferences
          </p>
        </div>

        <div className="flex items-center justify-center mb-12">
          <div className="relative">
            <svg className="w-64 h-64" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>

              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="rgba(124, 58, 237, 0.1)"
                strokeWidth="8"
              />

              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="502"
                strokeDashoffset="502"
                className="animate-circle-fill"
              />

              <circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="rgba(124, 58, 237, 0.1)"
                strokeWidth="6"
              />

              <circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="url(#gradient2)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="377"
                strokeDashoffset="377"
                className="animate-circle-fill-reverse"
              />

              <circle
                cx="100"
                cy="100"
                r="40"
                fill="none"
                stroke="rgba(124, 58, 237, 0.1)"
                strokeWidth="4"
              />

              <circle
                cx="100"
                cy="100"
                r="40"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset="251"
                className="animate-circle-fill"
              />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-white mb-2">
                  {Math.min(Math.floor(((currentStep + 1) / steps.length) * 100), 100)}%
                </div>
                <div className="text-white/60 text-sm">Processing</div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
              <div className="w-full h-full relative">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-[#7c3aed] rounded-full"
                    style={{
                      top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 8)}%`,
                      left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 8)}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: i === (currentStep % 8) ? 1 : 0.3,
                      transition: 'opacity 0.3s'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-8 mb-8">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  index <= currentStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    index < currentStep
                      ? 'bg-[#7c3aed] scale-100'
                      : index === currentStep
                      ? 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] scale-110 animate-pulse'
                      : 'bg-[#2b2b38] scale-90'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : index === currentStep ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  ) : (
                    <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium transition-all duration-500 ${
                      index <= currentStep ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    {step}
                  </p>
                </div>
                {index === currentStep && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-full">
            <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-pulse"></div>
            <span className="text-white/80 text-sm font-medium">
              This will only take a moment...
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes circle-fill {
          0% {
            stroke-dashoffset: 502;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes circle-fill-reverse {
          0% {
            stroke-dashoffset: 377;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-circle-fill {
          animation: circle-fill 10s ease-in-out forwards;
        }

        .animate-circle-fill-reverse {
          animation: circle-fill-reverse 10s ease-in-out forwards;
          animation-direction: reverse;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
