import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Menu, X } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  platforms: string[];
  publish_date: string;
  publish_time: string;
}

const mockVideos: Video[] = [
  {
    id: "1",
    title: "This is title planner 1 and so on",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque maximus, ex eu volutpat faucibus, nisl orci eleifend risus, id volutpat tellus neque at leo.",
    thumbnail: "/rectangle-11.png",
    platforms: ["tiktok", "youtube", "instagram"],
    publish_date: "2025-11-14",
    publish_time: "18:00",
  },
  {
    id: "2",
    title: "Amazing content video tutorial",
    description: "A comprehensive guide to creating engaging content that resonates with your audience.",
    thumbnail: "https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg?auto=compress&cs=tinysrgb&w=400",
    platforms: ["tiktok", "instagram"],
    publish_date: "2025-11-15",
    publish_time: "12:00",
  },
  {
    id: "3",
    title: "Daily vlog highlights",
    description: "Behind the scenes of my daily routine and productivity tips.",
    thumbnail: "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=400",
    platforms: ["youtube"],
    publish_date: "2025-11-16",
    publish_time: "20:00",
  },
];

export const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>(mockVideos);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deleteVideo = (id: string) => {
    setVideos(videos.filter((video) => video.id !== id));
  };

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case "tiktok":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        );
      case "youtube":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        );
      default:
        return null;
    }
  };


  return (
    <div className="flex w-full min-h-screen bg-page">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Collapsible on mobile */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        w-[240px] h-screen bg-card border-r border-border-default
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        p-4 sm:p-6 flex flex-col
      `}>
        {/* Close button - Mobile only */}
        <button
          className="absolute top-4 right-4 lg:hidden p-2 text-text-primary hover:bg-surface rounded-lg transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity"
        >
          <img className="w-10 h-10" alt="Logo" src="/logo.png" />
          <span className="text-xl font-semibold text-text-primary">SPARKFLUENCE</span>
        </button>

        <nav className="flex flex-col gap-2 flex-1">
          <div className="mb-4">
            <p className="text-xs text-text-secondary px-3 mb-2">GENERAL</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary"
            >
              <img className="w-5 h-5" alt="Dashboard" src="/lucide-house.svg" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => navigate("/planner")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary"
            >
              <img className="w-5 h-5" alt="Planner" src="/lucide-calendar-days.svg" />
              <span className="text-sm font-medium">Planner</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-primary text-white">
              <img className="w-5 h-5" alt="Gallery" src="/lucide-images.svg" />
              <span className="text-sm font-medium">Gallery</span>
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary"
            >
              <img className="w-5 h-5" alt="Settings" src="/lucide-settings.svg" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 mb-2">
              <p className="text-xs text-text-secondary">AI TOOLS</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Coming Soon</span>
            </div>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Script Lab" src="/lucide-sparkles.svg" />
              <span className="text-sm font-medium">Script Lab</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Visual Forge" src="/lucide-image-plus.svg" />
              <span className="text-sm font-medium">Visual Forge</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Video Genie" src="/lucide-video.svg" />
              <span className="text-sm font-medium">Video Genie</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="AI Chat" src="/lucide-message-circle-more.svg" />
              <span className="text-sm font-medium">AI Chat</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 px-3 mb-2">
              <p className="text-xs text-text-secondary">OTHER</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] font-medium">Coming Soon</span>
            </div>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Insight" src="/icon-2.svg" />
              <span className="text-sm font-medium">Insight</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Community" src="/lucide-users-round.svg" />
              <span className="text-sm font-medium">Community</span>
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface text-text-secondary">
              <img className="w-5 h-5" alt="Collaboration" src="/lucide-handshake.svg" />
              <span className="text-sm font-medium">Collaboration</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Mobile Header with hamburger */}
        <div className="flex items-center gap-4 mb-6 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-primary hover:bg-surface rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Video Gallery</h1>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Video Gallery</h1>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-20 h-20 mx-auto mb-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-text-secondary mb-2">No videos yet</h2>
            <p className="text-text-muted">Videos you add to the gallery will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-card border border-border-default rounded-2xl overflow-hidden hover:border-primary/50 transition-all group"
              >
                <div className="relative aspect-[9/16] overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40 hover:bg-white/30">
                      <svg
                        className="w-6 h-6 text-white ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {video.platforms.map((platform) => (
                        <div
                          key={platform}
                          className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white"
                        >
                          {getPlatformIcon(platform)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-text-secondary text-xs mb-3 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-muted mb-4">
                    <span>
                      {new Date(video.publish_date).toLocaleDateString()}
                    </span>
                    <span>{video.publish_time}</span>
                  </div>
                  <Button
                    onClick={() => deleteVideo(video.id)}
                    variant="secondary"
                    size="sm"
                    className="w-full bg-white/5 text-white/80 hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/50"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
