import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Logo } from "../../components/ui/logo";

// Backend URL - use environment variable or fallback to localhost for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY || "sparkfluence_test_key_123";

export const Loading: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const combineVideos = async () => {
      const stateData = location.state;
      
      if (!stateData?.selectedSegments || stateData.selectedSegments.length === 0) {
        setError("No video segments found");
        return;
      }

      try {
        // Prepare segments data
        const segments = stateData.selectedSegments.map((seg: any) => ({
          type: seg.type || seg.element || "SEGMENT",
          video_url: seg.videoUrl || seg.video_url,
          duration_seconds: seg.durationSeconds || 8
        }));

        // Check if all segments have video URLs
        const missingVideos = segments.filter((s: any) => !s.video_url);
        if (missingVideos.length > 0) {
          setError(`${missingVideos.length} segments are missing video URLs`);
          return;
        }

        console.log("[Loading] Segments to combine:", segments);
        setStatus("Starting video combination...");
        setProgress(5);

        // Call backend to combine videos
        const response = await fetch(`${BACKEND_URL}/api/combine-final-video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": BACKEND_API_KEY
          },
          body: JSON.stringify({
            project_id: `video_${Date.now()}`,
            segments: segments,
            options: {
              bgm_url: stateData.selectedMusic?.audioUrl || null,
              bgm_volume: 0.15
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("[Loading] Job created:", data);

        if (!data.success || !data.data?.job_id) {
          throw new Error("Failed to create job");
        }

        const jobId = data.data.job_id;
        setStatus("Downloading video segments...");
        setProgress(10);

        // Poll for job completion
        let completed = false;
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes max

        while (!completed && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const statusResponse = await fetch(`${BACKEND_URL}/api/job-status/${jobId}`, {
            headers: { "x-api-key": BACKEND_API_KEY }
          });

          if (!statusResponse.ok) {
            throw new Error(`Failed to get job status: ${statusResponse.status}`);
          }

          const statusData = await statusResponse.json();
          console.log("[Loading] Job status:", statusData);

          if (statusData.data) {
            setStatus(statusData.data.current_step || "Processing...");
            setProgress(statusData.data.progress_percentage || 0);

            if (statusData.data.status === "completed") {
              completed = true;
              
              // Navigate to FullVideo with result
              navigate("/full-video", {
                state: {
                  ...stateData,
                  finalVideoUrl: statusData.data.final_video_url,
                  videoMetadata: statusData.data.metadata
                }
              });
              return;
            } else if (statusData.data.status === "failed") {
              throw new Error(statusData.data.error_message || "Video processing failed");
            }
          }

          attempts++;
        }

        if (!completed) {
          throw new Error("Video processing timeout - please try again");
        }

      } catch (err: any) {
        console.error("[Loading] Error:", err);
        setError(err.message || "An error occurred");
      }
    };

    combineVideos();
  }, [navigate, location.state]);

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setStatus("Initializing...");
    window.location.reload();
  };

  const handleBack = () => {
    navigate("/music-selector", { state: location.state });
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <Logo />
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className="h-1 flex-1 rounded-full bg-[#7c3aed]"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {error ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Processing Failed</h2>
              <p className="text-red-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-[#7c3aed]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-[#7c3aed] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#7c3aed] font-bold text-lg">{progress}%</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Generating Your Video</h2>
              <p className="text-white/60 mb-4">{status}</p>
              
              {/* Progress bar */}
              <div className="w-full bg-[#2b2b38] rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/40 text-sm">This may take a minute...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
