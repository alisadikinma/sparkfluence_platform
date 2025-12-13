import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { usePlanner } from "../../contexts/PlannerContext";

export const FullVideo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addPlannedContent } = usePlanner();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [publishTime, setPublishTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishToPublic, setPublishToPublic] = useState(false);

  useEffect(() => {
    if (location.state) {
      setVideoData(location.state);
      setFinalVideoUrl(location.state.finalVideoUrl || null);
      const defaultTitle = location.state?.topic || "Generated Video Content";
      const defaultDescription = location.state?.selectedSegments
        ? `This video contains ${location.state.selectedSegments.length} carefully selected segments` +
          (location.state.selectedMusic ? ` with "${location.state.selectedMusic.name}" as background music` : " without background music") +
          `. Total duration: ${location.state.selectedSegments.reduce((sum: number, seg: any) => sum + (seg.durationSeconds || 8), 0)} seconds.`
        : "AI-generated video content ready to be scheduled and published to your social media platforms.";
      setTitle(defaultTitle);
      setDescription(defaultDescription);
    }
  }, [location.state]);

  const platforms = [
    { id: "tiktok", name: "TikTok" },
    { id: "youtube", name: "YouTube" },
    { id: "instagram", name: "Instagram" },
  ];

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case "tiktok":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        );
      case "youtube":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleAddToGallery = () => {
    navigate("/gallery");
  };

  const handlePlanContent = async () => {
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }

    if (!publishDate || !publishTime) {
      alert("Please select a date and time");
      return;
    }

    if (!title || title.trim() === "") {
      alert("Please enter a title for your video");
      return;
    }

    setLoading(true);

    try {
      console.log('Planning content with data:', {
        title,
        description,
        content_type: "video",
        platforms: selectedPlatforms,
        scheduled_date: publishDate,
        scheduled_time: publishTime,
        status: "scheduled",
        thumbnail_url: videoData?.selectedSegments?.[0]?.imageUrl || "/rectangle-11.png",
        video_data: videoData,
        is_public: publishToPublic,
      });

      const result = await addPlannedContent({
        title: title,
        description: description,
        content_type: "video",
        platforms: selectedPlatforms,
        scheduled_date: publishDate,
        scheduled_time: publishTime,
        status: "scheduled",
        thumbnail_url: videoData?.selectedSegments?.[0]?.imageUrl || "/rectangle-11.png",
        video_data: {
          ...videoData,
          sessionId: videoData?.sessionId || null,
        },
        final_video_url: finalVideoUrl,
        is_public: publishToPublic,
      });

      console.log('Add planned content result:', result);

      if (result) {
        alert("Content scheduled successfully!");
        navigate("/planner", {
          state: {
            highlightDate: publishDate,
            highlightTime: publishTime,
          }
        });
      } else {
        alert("Failed to schedule content. Please try again.");
      }
    } catch (error) {
      console.error("Error scheduling content:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while scheduling. Please try again.";
      alert(`Failed to schedule content: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="flex gap-2 mb-8 max-w-md mx-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className="h-1 flex-1 rounded-full bg-[#7c3aed]"
            />
          ))}
        </div>
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate("/video-editor")}
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Final Video Preview</h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6">
          <div className="bg-[#1a1a24] border-2 border-[#7c3aed] rounded-2xl p-4 h-fit">
            <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden mb-4 bg-black">
              {finalVideoUrl ? (
                <video
                  src={finalVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={videoData?.selectedSegments?.[0]?.imageUrl}
                />
              ) : (
                <>
                  <img
                    src={videoData?.selectedSegments?.[0]?.imageUrl || "/rectangle-11.png"}
                    alt="Video preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40">
                      <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white/60 text-sm">Video processing...</p>
                  </div>
                </>
              )}
            </div>
            {finalVideoUrl && (
              <a
                href={finalVideoUrl}
                download={`${title || 'video'}.mp4`}
                className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            )}
          </div>

          <div className="bg-[#1a1a24]/50 border border-[#2b2b38] rounded-2xl p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-white/60 text-sm mb-2 font-medium">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-[#7c3aed] transition-colors placeholder:text-white/40"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={4}
                  className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-3 text-white text-sm leading-relaxed focus:outline-none focus:border-[#7c3aed] transition-colors resize-none placeholder:text-white/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between p-4 bg-[#2b2b38] rounded-lg">
                  <div>
                    <label className="text-white font-medium block mb-1">Publish to Public</label>
                    <p className="text-white/60 text-xs">Make this video visible to everyone</p>
                  </div>
                  <button
                    onClick={() => setPublishToPublic(!publishToPublic)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      publishToPublic ? "bg-[#7c3aed]" : "bg-[#4e5562]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        publishToPublic ? "translate-x-7" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/60 text-sm mb-3 font-medium">Platform</label>
                  <div className="flex gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedPlatforms.includes(platform.id)
                            ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                            : "bg-[#2b2b38] text-white/60 border-2 border-[#2b2b38] hover:border-[#7c3aed]/50 hover:text-white/80"
                        }`}
                      >
                        {getPlatformIcon(platform.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-3 font-medium">Publish Date & Time</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="date"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="time"
                        value={publishTime}
                        onChange={(e) => setPublishTime(e.target.value)}
                        className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2b2b38]">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handlePlanContent}
                    disabled={loading}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white hover:from-[#6d28d9] hover:to-[#db2777] h-12 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {loading ? "Planning..." : "Plan"}
                  </Button>
                  <Button
                    onClick={() => navigate("/history")}
                    disabled={loading}
                    className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] h-12 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
