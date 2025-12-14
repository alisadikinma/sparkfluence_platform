import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  RefreshCw, ImageIcon, Loader2, 
  Sparkles, X, Maximize2, Play, AlertCircle,
  CloudOff, Cloud, CheckCircle2, Info
} from "lucide-react";

interface Segment {
  id: string;
  segmentId: string;
  type: string;
  timing: string;
  durationSeconds: number;
  shotType: string;
  creatorAvatarUrl?: string;
  emotion: string;
  transition: string;
  script: string;
  visualDirection: string;
  imageUrl: string | null;
  isGeneratingImage: boolean;
  imageError?: string | null;
  jobId?: string;
}

interface VideoSettings {
  duration: '30s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  language?: string;
  model?: 'auto' | 'sora2' | 'veo31';
}

interface ImageJob {
  id: string;
  segment_id: string;
  segment_number: number;
  segment_type: string;
  status: number;
  image_url: string | null;
  error_message: string | null;
}

const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

export const VideoEditor = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTopic, setCurrentTopic] = useState("Your Video");
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [characterDescription, setCharacterDescription] = useState<string>("");
  const [characterRefPng, setCharacterRefPng] = useState<string>("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0 });
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fromScriptLab = location.state?.fromScriptLab === true;

  const uiText = {
    title: language === 'id' ? 'Editor Video' : language === 'hi' ? 'वीडियो एडिटर' : 'Video Editor',
    duration: language === 'id' ? 'Durasi' : language === 'hi' ? 'अवधि' : 'Duration',
    generateAll: language === 'id' ? 'Generate Semua Gambar' : language === 'hi' ? 'सभी छवियां जनरेट करें' : 'Generate All Images',
    generating: language === 'id' ? 'Generating...' : language === 'hi' ? 'जनरेट हो रहा है...' : 'Generating...',
    script: language === 'id' ? 'Script (VO)' : language === 'hi' ? 'स्क्रिप्ट (VO)' : 'Script (VO)',
    visualDirection: language === 'id' ? 'Arahan Visual' : language === 'hi' ? 'विजुअल निर्देश' : 'Visual Direction',
    visualPreview: language === 'id' ? 'Preview Visual' : language === 'hi' ? 'विजुअल प्रीव्यू' : 'Visual Preview',
    creatorShot: language === 'id' ? 'Creator Shot' : language === 'hi' ? 'क्रिएटर शॉट' : 'Creator Shot',
    generateImage: language === 'id' ? 'Generate' : language === 'hi' ? 'जनरेट' : 'Generate',
    regenerate: language === 'id' ? 'Regenerate' : language === 'hi' ? 'रीजनरेट' : 'Regenerate',
    previous: language === 'id' ? 'Sebelumnya' : language === 'hi' ? 'पिछला' : 'Previous',
    next: language === 'id' ? 'Generate Video' : language === 'hi' ? 'वीडियो जनरेट करें' : 'Generate Videos',
    imagesRequired: language === 'id' ? 'Generate semua gambar dulu' : language === 'hi' ? 'पहले सभी छवियां जनरेट करें' : 'Generate all images first',
    loading: language === 'id' ? 'Memuat progress...' : language === 'hi' ? 'प्रगति लोड हो रहा है...' : 'Loading your progress...',
    step: language === 'id' ? 'Langkah' : language === 'hi' ? 'चरण' : 'Step',
    backgroundProcessing: language === 'id' 
      ? 'Gambar sedang di-generate di background. Anda bisa menutup browser atau melakukan aktivitas lain. Kami akan kirim notifikasi saat selesai!'
      : language === 'hi'
      ? 'छवियां बैकग्राउंड में जनरेट हो रही हैं। आप ब्राउज़र बंद कर सकते हैं। हम आपको सूचित करेंगे!'
      : 'Images are being generated in the background. You can close your browser or do other activities. We\'ll notify you when done!',
    resuming: language === 'id' ? 'Melanjutkan proses...' : language === 'hi' ? 'प्रक्रिया जारी...' : 'Resuming process...',
    processingComplete: language === 'id' ? 'Semua gambar selesai!' : language === 'hi' ? 'सभी छवियां तैयार!' : 'All images complete!',
  };

  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sessionId && segments.length > 0) {
      const timeoutId = setTimeout(() => {
        saveProgress(segments, currentTopic, videoSettings);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [segments, sessionId]);

  const saveProgress = (updatedSegments: Segment[], topic: string, settings: VideoSettings | null) => {
    if (!sessionId) return;
    const progressData = {
      sessionId,
      topic,
      videoSettings: settings,
      segments: updatedSegments,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`sparkfluence_video_progress_${sessionId}`, JSON.stringify(progressData));
    localStorage.setItem('sparkfluence_active_session', sessionId);
  };

  const loadProgress = (sid: string): any | null => {
    try {
      const saved = localStorage.getItem(`sparkfluence_video_progress_${sid}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Error loading progress:', err);
    }
    return null;
  };

  const checkExistingJobs = async (sid: string): Promise<ImageJob[] | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error checking existing jobs:', err);
      return null;
    }
  };

  const syncJobsWithSegments = (jobs: ImageJob[], currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const job = jobs.find(j => j.segment_number === index + 1);
      if (job) {
        return {
          ...seg,
          imageUrl: job.image_url || seg.imageUrl,
          imageError: job.error_message || null,
          isGeneratingImage: job.status === JOB_STATUS.PROCESSING,
          jobId: job.id
        };
      }
      return seg;
    });
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('character_description, avatar_url, character_ref_png')
          .eq('user_id', user.id)
          .single();
        
        if (data?.character_description) setCharacterDescription(data.character_description);
        if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
        if (data?.character_ref_png) setCharacterRefPng(data.character_ref_png);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const initializeEditor = async () => {
      const urlSessionId = searchParams.get('session');
      const stateData = location.state;
      
      let sid = urlSessionId || stateData?.sessionId || null;
      
      if (stateData?.segments && stateData.segments.length > 0) {
        sid = sid || `video_${Date.now()}`;
        setSessionId(sid);
        
        if (stateData.characterDescription) {
          setCharacterDescription(stateData.characterDescription);
        }
        
        const existingJobs = await checkExistingJobs(sid);
        const savedProgress = loadProgress(sid);
        
        let formattedSegments: Segment[];
        
        if (savedProgress && savedProgress.segments?.length > 0) {
          formattedSegments = savedProgress.segments;
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(savedProgress.videoSettings || stateData.videoSettings || null);
        } else {
          formattedSegments = stateData.segments.map((seg: any, index: number) => ({
            id: String(index + 1),
            segmentId: seg.segment_id || `VIDEO-${String(index + 1).padStart(3, '0')}`,
            type: seg.type || `SEGMENT_${index + 1}`,
            timing: seg.timing || `${index * 8}-${(index + 1) * 8}s`,
            durationSeconds: seg.duration_seconds || 8,
            shotType: seg.shot_type || 'B-ROLL',
            creatorAvatarUrl: seg.creator_avatar_url || undefined,
            emotion: seg.emotion || '',
            transition: seg.transition || 'Cut',
            script: seg.script_text || seg.script || '',
            visualDirection: seg.visual_direction || '',
            imageUrl: null,
            isGeneratingImage: false,
            imageError: null,
          }));
          
          setCurrentTopic(stateData.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(stateData.videoSettings || null);
        }
        
        if (existingJobs && existingJobs.length > 0) {
          formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
          
          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
          if (hasPending) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            startBackgroundProcessing(sid);
          }
        }
        
        setSegments(formattedSegments);
        setIsLoaded(true);
        
      } else if (sid) {
        const existingJobs = await checkExistingJobs(sid);
        const savedProgress = loadProgress(sid);
        
        if (savedProgress && savedProgress.segments?.length > 0) {
          setSessionId(sid);
          let formattedSegments = savedProgress.segments;
          
          if (existingJobs && existingJobs.length > 0) {
            formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
            
            const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
            if (hasPending) {
              setIsBackgroundMode(true);
              setShowBackgroundToast(true);
              startBackgroundProcessing(sid);
            }
          }
          
          setSegments(formattedSegments);
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(savedProgress.videoSettings || null);
          setIsLoaded(true);
        } else {
          navigate('/topic-selection');
        }
      } else {
        const activeSessionId = localStorage.getItem('sparkfluence_active_session');
        if (activeSessionId) {
          const savedProgress = loadProgress(activeSessionId);
          const existingJobs = await checkExistingJobs(activeSessionId);
          
          if (savedProgress && savedProgress.segments?.length > 0) {
            setSessionId(activeSessionId);
            let formattedSegments = savedProgress.segments;
            
            if (existingJobs && existingJobs.length > 0) {
              formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
              
              const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
              if (hasPending) {
                setIsBackgroundMode(true);
                setShowBackgroundToast(true);
                startBackgroundProcessing(activeSessionId);
              }
            }
            
            setSegments(formattedSegments);
            setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
            setVideoSettings(savedProgress.videoSettings || null);
            setIsLoaded(true);
          } else {
            navigate('/topic-selection');
          }
        } else {
          navigate('/topic-selection');
        }
      }
    };
    
    initializeEditor();
  }, [location.state, searchParams, navigate, user]);

  const startBackgroundProcessing = useCallback((sid: string) => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
    
    const processNext = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-images', {
          body: {
            mode: 'process_single',
            session_id: sid,
            user_id: user.id
          }
        });
        
        if (error) {
          console.error('Process error:', error);
          return;
        }
        
        const result = data?.data;
        
        if (result?.summary) {
          setGenerationProgress({
            current: result.summary.completed + result.summary.failed,
            total: result.summary.total,
            completed: result.summary.completed,
            failed: result.summary.failed
          });
        }
        
        if (result?.job?.image_url) {
          setSegments(prev => {
            const updated = prev.map(seg => {
              if (seg.jobId === result.job.id || parseInt(seg.id) === result.job.segment_number) {
                return {
                  ...seg,
                  imageUrl: result.job.image_url,
                  isGeneratingImage: false,
                  imageError: null
                };
              }
              return seg;
            });
            saveProgress(updated, currentTopic, videoSettings);
            return updated;
          });
        }
        
        if (result?.all_complete) {
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          setShowBackgroundToast(false);
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
        }
        
      } catch (err) {
        console.error('Background processing error:', err);
      }
    };
    
    processNext();
    processingIntervalRef.current = setInterval(processNext, 3000);
  }, [user, currentTopic, videoSettings]);

  const handleGenerateAllBackground = async () => {
    if (!user || !sessionId) return;
    
    const segmentsToGenerate = segments.filter(s => !s.imageUrl && !s.isGeneratingImage);
    if (segmentsToGenerate.length === 0) return;

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segmentsToGenerate.length, completed: 0, failed: 0 });

    try {
      const segmentsData = segmentsToGenerate.map((seg, index) => {
        const originalIndex = segments.findIndex(s => s.id === seg.id);
        return {
          segment_id: seg.segmentId,
          segment_number: originalIndex + 1,
          segment_type: seg.type,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          visual_prompt: seg.visualDirection || seg.script,
          visual_direction: seg.visualDirection,
          character_description: seg.shotType === 'CREATOR' ? characterDescription : null,
          character_ref_png: seg.shotType === 'CREATOR' ? characterRefPng : null
        };
      });

      // Use character_ref_png if available, otherwise fallback to avatar_url
      const referenceImage = characterRefPng || userAvatarUrl || '';
      
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'gpt-image-1', // Use GPT-Image-1 for reference support
          character_description: characterDescription,
          character_ref_png: referenceImage // Avatar for face consistency
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!user || !sessionId) return;
    
    // Confirm before regenerating
    const confirmMsg = language === 'id' 
      ? `Regenerate semua ${segments.length} gambar? Gambar lama akan diganti.`
      : `Regenerate all ${segments.length} images? Existing images will be replaced.`;
    
    if (!window.confirm(confirmMsg)) return;

    // Clear all existing images first
    setSegments(prev => prev.map(seg => ({
      ...seg,
      imageUrl: null,
      imageError: null,
      isGeneratingImage: false,
      jobId: undefined
    })));

    // Delete existing jobs for this session
    try {
      await supabase
        .from('image_generation_jobs')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error deleting old jobs:', err);
    }

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segments.length, completed: 0, failed: 0 });

    try {
      // Use character_ref_png if available, otherwise fallback to avatar_url
      const referenceImage = characterRefPng || userAvatarUrl || '';
      
      const segmentsData = segments.map((seg, index) => ({
        segment_id: seg.segmentId,
        segment_number: index + 1,
        segment_type: seg.type,
        shot_type: seg.shotType,
        emotion: seg.emotion,
        visual_prompt: seg.visualDirection || seg.script,
        visual_direction: seg.visualDirection,
        character_description: seg.shotType === 'CREATOR' ? characterDescription : null,
        character_ref_png: seg.shotType === 'CREATOR' ? referenceImage : null
      }));

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'gpt-image-1',
          character_description: characterDescription,
          character_ref_png: referenceImage
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating regenerate jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  const handleGenerateImage = useCallback(async (segmentId: string): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return false;

    setSegments(prev =>
      prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, isGeneratingImage: true, imageError: null }
          : seg
      )
    );

    try {
      const avatarUrl = segment.creatorAvatarUrl || userAvatarUrl || null;
      const isCreatorShot = segment.shotType === 'CREATOR' || 
        ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segment.type.toUpperCase());
      const referenceImage = isCreatorShot ? (characterRefPng || avatarUrl) : null;
      
      const requestBody = {
        segments: [{
          segment_number: parseInt(segmentId),
          visual_prompt: segment.visualDirection || segment.script,
          shot_type: segment.shotType,
          creator_avatar_url: avatarUrl,
          emotion: segment.emotion,
          segment_type: segment.type,
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: referenceImage
        }],
        style: 'cinematic',
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        provider: 'gpt-image-1', // Use GPT-Image-1 for reference support
        character_ref_png: referenceImage // Request-level reference
      };
      
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      const imageUrl = data?.data?.images?.[0]?.image_url;
      const imageError = data?.data?.images?.[0]?.error;
      
      setSegments(prev => {
        const updated = prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, imageUrl: imageUrl || null, isGeneratingImage: false, imageError: imageError || null }
            : seg
        );
        saveProgress(updated, currentTopic, videoSettings);
        return updated;
      });

      return !!imageUrl;
    } catch (err: any) {
      console.error('Error generating image:', err);
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, isGeneratingImage: false, imageError: err.message }
            : seg
        )
      );
      return false;
    }
  }, [segments, userAvatarUrl, characterDescription, characterRefPng, videoSettings, currentTopic]);

  const handlePrevious = () => {
    saveProgress(segments, currentTopic, videoSettings);
    
    if (fromScriptLab) {
      navigate("/script-lab");
    } else {
      navigate("/topic-selection", { state: { returning: true } });
    }
  };

  const handleNext = () => {
    const allHaveImages = segments.every(seg => seg.imageUrl);
    if (!allHaveImages) {
      alert(uiText.imagesRequired);
      return;
    }

    navigate("/video-generation", {
      state: {
        sessionId,
        segments,
        topic: currentTopic,
        videoSettings
      }
    });
  };

  const totalDuration = segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  const allHaveImages = segments.every(seg => seg.imageUrl);
  const imagesGenerated = segments.filter(s => s.imageUrl).length;

  const groupedSegments = segments.reduce((acc, segment, index) => {
    const baseType = segment.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
    const isBody = baseType === 'BODY' || segment.type.startsWith('BODY');
    
    if (isBody) {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.isBodyGroup) {
        lastGroup.segments.push({ ...segment, originalIndex: index });
      } else {
        acc.push({ isBodyGroup: true, segments: [{ ...segment, originalIndex: index }] });
      }
    } else {
      acc.push({ isBodyGroup: false, segments: [{ ...segment, originalIndex: index }] });
    }
    return acc;
  }, [] as { isBodyGroup: boolean; segments: (Segment & { originalIndex: number })[] }[]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-text-secondary">{uiText.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Background Processing Toast */}
        {showBackgroundToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="bg-gradient-to-r from-primary/90 to-accent-pink/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">
                      {language === 'id' ? 'Proses di Background' : 'Background Processing'}
                    </h4>
                    <button 
                      onClick={() => setShowBackgroundToast(false)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3">
                    {uiText.backgroundProcessing}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{generationProgress.completed}/{generationProgress.total} complete</span>
                      {generationProgress.failed > 0 && (
                        <span className="text-red-300">{generationProgress.failed} failed</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 5 ? "bg-primary" : "bg-surface"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title & Generate All Button */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 line-clamp-2">
                {currentTopic}
              </h1>
              <p className="text-text-muted text-sm">
                {uiText.step} 5/7 • {uiText.duration}: {totalDuration}s 
                {videoSettings && ` • ${videoSettings.aspectRatio}`}
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* Regenerate All Button - only show when some images exist */}
              {imagesGenerated > 0 && (
                <Button
                  onClick={() => handleRegenerateAll()}
                  disabled={isGeneratingAll || isBackgroundMode}
                  variant="outline"
                  className="h-12 px-4 font-medium flex items-center gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                  title={language === 'id' ? 'Regenerate semua gambar' : 'Regenerate all images'}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {language === 'id' ? 'Regenerate Semua' : 'Regenerate All'}
                  </span>
                </Button>
              )}
              
              {/* Generate All Button */}
              <Button
                onClick={handleGenerateAllBackground}
                disabled={isGeneratingAll || allHaveImages || isBackgroundMode}
                className={`h-12 px-6 font-medium flex items-center gap-2 ${
                  allHaveImages
                    ? "bg-green-600 hover:bg-green-700"
                    : isBackgroundMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gradient-to-r from-primary to-accent-pink hover:opacity-90"
                } text-white`}
              >
                {isBackgroundMode ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{generationProgress.completed}/{generationProgress.total}</span>
                  </>
                ) : allHaveImages ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{imagesGenerated}/{segments.length} ✓</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{uiText.generateAll} ({segments.length - imagesGenerated})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-4">
          {groupedSegments.map((group, groupIndex) => (
            <div 
              key={groupIndex}
              className={group.isBodyGroup && group.segments.length > 1 
                ? "bg-surface border border-border-default rounded-2xl p-3 space-y-3" 
                : ""
              }
            >
              {group.isBodyGroup && group.segments.length > 1 && (
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-border-default">
                  <span className="text-blue-500 dark:text-blue-400 text-sm font-medium">BODY</span>
                  <span className="text-text-muted text-xs">
                    ({group.segments.length} {language === 'id' ? 'segmen' : 'segments'})
                  </span>
                </div>
              )}
              
              {group.segments.map((segment, segIndex) => {
                const displayIndex = segment.originalIndex + 1;
                const isCreatorShot = segment.shotType === 'CREATOR';
                
                return (
                  <div 
                    key={segment.id} 
                    className={`bg-card border rounded-xl overflow-hidden shadow-theme ${
                      segment.imageUrl ? 'border-green-500/30' : 'border-border-default'
                    }`}
                  >
                    {/* Segment Header */}
                    <div className="p-3 sm:p-4 border-b border-border-default">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                            segment.imageUrl ? 'bg-green-600' : 'bg-primary'
                          }`}>
                            {segment.imageUrl ? <CheckCircle2 className="w-4 h-4" /> : displayIndex}
                          </div>
                          <span className="text-text-primary font-semibold text-sm sm:text-base">
                            {group.isBodyGroup && group.segments.length > 1 
                              ? `BODY-${segIndex + 1}` 
                              : segment.type
                            }
                          </span>
                          <span className="text-text-muted text-xs sm:text-sm">{segment.timing}</span>
                          <span className="text-text-muted text-xs">({segment.durationSeconds}s)</span>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            isCreatorShot 
                              ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400' 
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            {segment.shotType}
                          </span>
                          {segment.emotion && (
                            <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.emotion}
                            </span>
                          )}
                          {segment.transition && (
                            <span className="text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.transition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Script + Visual Direction */}
                        <div className="flex-1 space-y-3">
                          {/* Script */}
                          <div>
                            <label className="text-text-secondary text-xs mb-1.5 block">{uiText.script}</label>
                            <div className="bg-surface border border-border-default rounded-lg p-3 text-text-primary text-sm min-h-[80px]">
                              {segment.script}
                            </div>
                          </div>

                          {/* Visual Direction */}
                          {segment.visualDirection && (
                            <div>
                              <label className="text-text-secondary text-xs mb-1.5 block">{uiText.visualDirection}</label>
                              <div className="bg-surface border border-border-default rounded-lg p-3 text-text-secondary text-xs max-h-24 overflow-y-auto">
                                {segment.visualDirection}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Visual Preview */}
                        <div className="w-full sm:w-44 flex-shrink-0">
                          <label className="text-text-secondary text-xs mb-1.5 block">
                            {uiText.visualPreview}
                            {isCreatorShot && (
                              <span className="text-pink-600 dark:text-pink-400 ml-1">({uiText.creatorShot})</span>
                            )}
                          </label>
                          <div className="w-full aspect-[9/16] sm:h-56 bg-surface border border-border-default rounded-lg overflow-hidden relative">
                            {segment.isGeneratingImage ? (
                              <div className="w-full h-full flex flex-col items-center justify-center">
                                <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                                <span className="text-text-secondary text-xs">{uiText.generating}</span>
                              </div>
                            ) : segment.imageUrl ? (
                              <>
                                <img
                                  src={segment.imageUrl}
                                  alt={`${segment.type} visual`}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setPreviewImage(segment.imageUrl)}
                                />
                                {isCreatorShot && (
                                  <div className="absolute bottom-1 left-1 bg-pink-500/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    Creator
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                                  <button
                                    onClick={() => setPreviewImage(segment.imageUrl)}
                                    className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"
                                    title="Preview"
                                  >
                                    <Maximize2 className="w-4 h-4 text-white" />
                                  </button>
                                  <button
                                    onClick={() => handleGenerateImage(segment.id)}
                                    className="p-2 bg-primary rounded-lg"
                                    title="Regenerate"
                                    disabled={isBackgroundMode}
                                  >
                                    <RefreshCw className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </>
                            ) : segment.imageError ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                                <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400 mb-2" />
                                <p className="text-red-500 dark:text-red-400 text-xs mb-3 line-clamp-2">{segment.imageError}</p>
                                <Button
                                  onClick={() => handleGenerateImage(segment.id)}
                                  size="sm"
                                  disabled={isBackgroundMode}
                                  className="bg-primary hover:bg-primary-hover text-white text-xs"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Retry
                                </Button>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-3">
                                <Button
                                  onClick={() => handleGenerateImage(segment.id)}
                                  disabled={isGeneratingAll || isBackgroundMode}
                                  className="bg-primary hover:bg-primary-hover text-white"
                                >
                                  <ImageIcon className="w-4 h-4 mr-2" />
                                  {uiText.generateImage}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            onClick={handlePrevious}
            variant="outline"
            className="border-border-default text-text-primary hover:bg-surface h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.previous}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!allHaveImages}
            className={`h-12 px-6 sm:px-8 font-medium transition-all ${
              allHaveImages
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-primary/50 text-white/50 cursor-not-allowed"
            }`}
          >
            {allHaveImages ? uiText.next : `${imagesGenerated}/${segments.length} images`}
          </Button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
