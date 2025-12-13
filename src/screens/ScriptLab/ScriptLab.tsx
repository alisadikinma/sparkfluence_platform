import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { ScriptForm, SelectedTopic } from "./components/ScriptForm";
import { TopicRecommendations } from "./components/TopicRecommendations";
import { Sparkles, Loader2, Brain, Zap, PenTool } from "lucide-react";

export const ScriptLab = (): JSX.Element => {
  const navigate = useNavigate();
  const { t, language: uiLanguage } = useLanguage();
  const { updateOnboardingData } = useOnboarding();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string>("");
  const [generatingPhase, setGeneratingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);

  const handleSelectTopic = (topic: SelectedTopic) => {
    setSelectedTopic(topic);
  };

  const handleClearTopic = () => {
    setSelectedTopic(null);
  };

  const handleSubmit = async (formData: {
    prompt: string;
    inputType: "topic" | "transcript";
    model: string;
    ratio: string;
    duration: string;
    language: string;
    useDnaTone: boolean;
    characterDescription: string | null;
  }) => {
    if (!formData.prompt.trim()) return;

    setLoading(true);
    setGeneratingPhase(0);
    setError(null);

    const phases = {
      id: [
        { step: "Menganalisis topik...", icon: "analyze" },
        { step: "Memuat framework viral...", icon: "load" },
        { step: "Membuat script viral...", icon: "write" },
        { step: "Menyelesaikan script...", icon: "finish" }
      ],
      en: [
        { step: "Analyzing topic...", icon: "analyze" },
        { step: "Loading viral frameworks...", icon: "load" },
        { step: "Crafting viral script...", icon: "write" },
        { step: "Finalizing script...", icon: "finish" }
      ],
      hi: [
        { step: "विषय का विश्लेषण...", icon: "analyze" },
        { step: "वायरल फ्रेमवर्क लोड हो रहा है...", icon: "load" },
        { step: "वायरल स्क्रिप्ट बना रहा है...", icon: "write" },
        { step: "स्क्रिप्ट पूरी हो रही है...", icon: "finish" }
      ]
    };

    const currentPhases = phases[uiLanguage as keyof typeof phases] || phases.en;

    try {
      setGeneratingStep(currentPhases[0].step);
      setGeneratingPhase(1);

      const langMap: Record<string, string> = {
        'id': 'indonesian',
        'en': 'english',
        'hi': 'hindi',
      };

      await new Promise(resolve => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[1].step);
      setGeneratingPhase(2);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[2].step);
      setGeneratingPhase(3);

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-script', {
        body: {
          input_type: formData.inputType,
          content: formData.prompt.trim(),
          duration: formData.duration,
          aspect_ratio: formData.ratio,
          platform: formData.ratio === "9:16" ? 'tiktok' : 'youtube',
          language: langMap[formData.language] || 'indonesian',
          user_id: user?.id
        }
      });

      if (scriptError) throw new Error(scriptError.message);

      if (!scriptData?.success || !scriptData?.data?.segments) {
        throw new Error(scriptData?.error?.message || 'Failed to generate script');
      }

      setGeneratingStep(currentPhases[3].step);
      setGeneratingPhase(4);
      await new Promise(resolve => setTimeout(resolve, 400));

      const segments = scriptData.data.segments;
      const sessionId = `video_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const scriptLabData = {
        topic: formData.prompt,
        inputType: formData.inputType,
        model: formData.model,
        aspectRatio: formData.ratio,
        duration: formData.duration,
        language: formData.language,
        useDnaTone: formData.useDnaTone,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("script_lab_data", JSON.stringify(scriptLabData));

      updateOnboardingData({
        platforms: formData.ratio === "9:16" ? ["tiktok", "instagram"] : ["youtube"],
      });

      navigate("/video-editor", {
        state: {
          sessionId,
          topic: formData.prompt.trim(),
          segments: segments,
          metadata: scriptData.data.metadata,
          videoSettings: {
            duration: formData.duration,
            aspectRatio: formData.ratio,
            language: langMap[formData.language] || 'indonesian'
          },
          characterDescription: formData.characterDescription,
          fromScriptLab: true,
        },
      });

    } catch (err: any) {
      console.error('Error generating script:', err);
      setError(err.message || 'Failed to generate script. Please try again.');
      setLoading(false);
    }
  };

  // Full-screen loading overlay
  if (loading) {
    const phaseIcons = [
      <Brain key="brain" className="w-8 h-8 text-white" />,
      <Zap key="zap" className="w-8 h-8 text-white" />,
      <PenTool key="pen" className="w-8 h-8 text-white" />,
      <Sparkles key="sparkles" className="w-8 h-8 text-white" />
    ];

    const phaseLabels = {
      id: ["Analisis", "Framework", "Penulisan", "Selesai"],
      en: ["Analyze", "Framework", "Writing", "Complete"],
      hi: ["विश्लेषण", "फ्रेमवर्क", "लेखन", "पूर्ण"]
    };
    const labels = phaseLabels[uiLanguage as keyof typeof phaseLabels] || phaseLabels.en;

    const currentTopic = selectedTopic?.title || "";

    return (
      <div className="w-full min-h-screen bg-page flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          {/* Animated Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-accent-pink flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="animate-pulse">
                {phaseIcons[Math.min(generatingPhase - 1, 3)] || phaseIcons[0]}
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>

          {/* Title and current step */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              {uiLanguage === 'id' ? 'Membuat Script Viral' : uiLanguage === 'hi' ? 'वायरल स्क्रिप्ट बना रहे हैं' : 'Creating Viral Script'}
            </h2>
            <p className="text-primary font-medium text-lg mb-2 min-h-[28px] transition-all duration-300">
              {generatingStep}
            </p>
            <p className="text-text-muted text-sm">
              {uiLanguage === 'id' ? 'Mohon tunggu sebentar...' : uiLanguage === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait a moment...'}
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 w-full px-4">
            {[1, 2, 3, 4].map((phase) => (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      generatingPhase >= phase
                        ? 'bg-primary scale-110'
                        : 'bg-surface'
                    }`}
                  >
                    {generatingPhase > phase ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : generatingPhase === phase ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <span className="text-text-muted text-sm font-medium">{phase}</span>
                    )}
                  </div>
                  <span className={`text-xs transition-colors duration-300 ${
                    generatingPhase >= phase ? 'text-primary' : 'text-text-muted'
                  }`}>
                    {labels[phase - 1]}
                  </span>
                </div>
                {phase < 4 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-500 ${
                      generatingPhase > phase ? 'bg-primary' : 'bg-surface'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Topic being processed */}
          {currentTopic && (
            <div className="bg-card border border-border-default rounded-xl p-4 w-full">
              <p className="text-text-muted text-xs mb-1">
                {uiLanguage === 'id' ? 'Topik:' : uiLanguage === 'hi' ? 'विषय:' : 'Topic:'}
              </p>
              <p className="text-text-primary text-sm line-clamp-2">{currentTopic}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-page overflow-x-hidden">
      <AppSidebar activePage="scriptLab" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 transition-all duration-300 overflow-x-hidden">
        <TopNavbar />

        <div className="pt-16 sm:pt-20 pb-6 sm:pb-8 px-3 sm:px-6 lg:px-10 xl:px-12">
          {/* Error Message */}
          {error && (
            <div className="w-full max-w-4xl mx-auto mb-6">
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            </div>
          )}

          {/* Topic Recommendations */}
          <TopicRecommendations
            onSelectTopic={handleSelectTopic}
            disabled={loading}
          />

          {/* Main Form Area */}
          <div className="w-full max-w-4xl mx-auto">
            <ScriptForm
              onSubmit={handleSubmit}
              loading={loading}
              selectedTopic={selectedTopic}
              onClearTopic={handleClearTopic}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
