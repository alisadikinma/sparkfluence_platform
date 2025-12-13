import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  duration: string;
  genre: string;
  audioUrl: string;
  imageUrl: string;
}

const musicTracks: MusicTrack[] = [
  {
    id: "1",
    name: "Upbeat Energy",
    artist: "Production Music",
    duration: "2:30",
    genre: "Electronic",
    audioUrl: "https://example.com/track1.mp3",
    imageUrl: "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "2",
    name: "Calm Ambience",
    artist: "Ambient Sounds",
    duration: "3:00",
    genre: "Ambient",
    audioUrl: "https://example.com/track2.mp3",
    imageUrl: "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "3",
    name: "Corporate Success",
    artist: "Business Beats",
    duration: "2:45",
    genre: "Corporate",
    audioUrl: "https://example.com/track3.mp3",
    imageUrl: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "4",
    name: "Tech Innovation",
    artist: "Future Sound",
    duration: "2:20",
    genre: "Electronic",
    audioUrl: "https://example.com/track4.mp3",
    imageUrl: "https://images.pexels.com/photos/1481276/pexels-photo-1481276.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "5",
    name: "Inspiring Journey",
    artist: "Motivation Music",
    duration: "3:15",
    genre: "Inspirational",
    audioUrl: "https://example.com/track5.mp3",
    imageUrl: "https://images.pexels.com/photos/761963/pexels-photo-761963.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "6",
    name: "Modern Vibe",
    artist: "Contemporary Beats",
    duration: "2:50",
    genre: "Pop",
    audioUrl: "https://example.com/track6.mp3",
    imageUrl: "https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=400"
  }
];

export const MusicSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const segments = location.state?.segments || [];
  const topic = location.state?.topic || "Your Visuals";

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrack(trackId);
  };

  const handlePlayPause = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  const handleNext = () => {
    const selectedMusicTrack = musicTracks.find((m) => m.id === selectedTrack);
    navigate("/loading", {
      state: {
        selectedSegments: segments,
        selectedMusic: selectedMusicTrack,
        topic: location.state?.topic || topic,
        sessionId: location.state?.sessionId,
        videoSettings: location.state?.videoSettings
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 6
                    ? "bg-[#7c3aed]"
                    : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Select Background Music</h1>
            <p className="text-white/60 text-sm">
              Choose the perfect soundtrack for your video
            </p>
          </div>

          <div className="grid gap-4 mb-8">
            {musicTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track.id)}
                className={`bg-[#1a1a24] border rounded-2xl overflow-hidden cursor-pointer transition-all ${
                  selectedTrack === track.id
                    ? "border-[#7c3aed] shadow-lg shadow-[#7c3aed]/20"
                    : "border-[#2b2b38] hover:border-[#4e5562]"
                }`}
              >
                <div className="flex items-center">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img
                      src={track.imageUrl}
                      alt={track.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1a24]" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(track.id);
                      }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] flex items-center justify-center hover:from-[#6d28d9] hover:to-[#d946ef] transition-all shadow-lg hover:scale-110"
                    >
                      {playingTrack === track.id ? (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between flex-1 p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{track.name}</h3>
                        <span className="px-2 py-0.5 bg-[#7c3aed]/20 text-[#7c3aed] text-xs rounded-full font-medium">
                          {track.genre}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>{track.artist}</span>
                        <span>•</span>
                        <span>{track.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {selectedTrack === track.id && (
                        <div className="flex items-center gap-2 text-[#7c3aed]">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => navigate("/video-generation")}
              variant="secondary"
              className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                navigate("/loading", {
                  state: {
                    selectedSegments: segments,
                    selectedMusic: null,
                    topic: location.state?.topic || topic,
                    sessionId: location.state?.sessionId,
                    videoSettings: location.state?.videoSettings
                  }
                });
              }}
              variant="outline"
              className="border-[#4e5562] bg-transparent text-white/80 hover:bg-[#2b2b38] hover:text-white h-12 px-8 font-medium"
            >
              Skip - No Music
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedTrack}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white h-12 px-8 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Final Video
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
