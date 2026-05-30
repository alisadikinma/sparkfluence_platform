import React, { useState, useMemo, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChatSessions } from '../../hooks/useChatSessions';
import { supabase } from '../../lib/supabase';
import { getAvatarWithCache } from '../../lib/avatarCache';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(null);
  const { sessions, deleteSession, renameSession } = useChatSessions();

  // Fetch avatar: user_profiles table (uploaded) → OAuth metadata (Google picture/avatar_url)
  useEffect(() => {
    if (!user?.id) return;
    getAvatarWithCache(supabase, user.id).then(url => {
      if (url) {
        setResolvedAvatarUrl(url);
      } else {
        const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        setResolvedAvatarUrl(oauthAvatar);
      }
    });
  }, [user?.id]);

  // Menu items (NO Settings — lives in user profile area at sidebar bottom)
  const menuItems = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'planner', icon: 'Calendar', label: 'Planner', path: '/planner' },
    // { id: 'scriptGen', icon: 'Sparkles', label: 'Script Gen', path: '/script-gen' }, // TEMP DISABLED
    { id: 'creatorLab', icon: 'Clapperboard', label: 'Creator Lab', path: '/creator-lab' },
    // { id: 'adStudio', icon: 'Target', label: 'Ad Studio', path: '/ad-studio' }, // TEMP DISABLED
    { id: 'carouselImages', icon: 'GalleryHorizontalEnd', label: 'Carousel Images', path: '/carousel-images' },
    // { id: 'gallery', icon: 'Image', label: 'Gallery', path: '/gallery' }, // TEMP DISABLED
  ];

  // Determine active menu from current path
  const activeMenuId = menuItems.find(item => location.pathname.startsWith(item.path))?.id || null;

  // Extract active session orderId from URL (e.g. /script-gen/:orderId)
  const activeSessionId = useMemo(() => {
    const parts = location.pathname.split('/');
    // Routes like /script-gen/:orderId or /creator-lab/:orderId
    if (parts.length >= 3 && ['script-gen', 'creator-lab', 'ad-studio', 'carousel-images'].includes(parts[1])) {
      return parts[2] || null;
    }
    return null;
  }, [location.pathname]);

  // Map session status to the correct workspace step
  // Always navigate to studio if video generation is done or beyond
  const statusToStep = (status: string, progress?: { currentStep: string }): string => {
    // If progress indicates studio, go directly
    if (progress?.currentStep === 'studio') return 'studio';
    // Video ready or beyond → studio directly (skip video step)
    if (status === 'video_ready' || status === 'complete') return 'studio';
    // Use progress.currentStep if available (more granular)
    if (progress?.currentStep) return progress.currentStep;
    // Fallback to status-based mapping
    switch (status) {
      case 'images_ready': return 'images';
      case 'script_ready': return 'images';
      default: return 'script';
    }
  };

  // Navigate to the correct route based on session type + current step
  const handleSessionClick = (orderId: string) => {
    const session = sessions.find(s => s.orderId === orderId);
    if (!session) return;

    // Carousel projects use different routing
    if (session.sessionType === 'carousel') {
      navigate(`/carousel-images/${orderId}/source`);
      return;
    }

    const routeMap: Record<string, string> = {
      script_gen: '/script-gen',
      creator_lab: '/creator-lab',
      ad_studio: '/ad-studio',
    };
    const basePath = routeMap[session.sessionType] || '/script-gen';
    const step = statusToStep(session.status, session.progress);
    navigate(`${basePath}/${orderId}/${step}`);
  };

  return (
    <div className="flex h-dvh bg-[#0B0E14] overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        menuItems={menuItems}
        activeMenuId={activeMenuId}
        onMenuClick={(path) => navigate(path)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionClick={handleSessionClick}
        onDeleteSession={(orderId) => deleteSession(orderId)}
        onRenameSession={(orderId, newTitle) => renameSession(orderId, newTitle)}
        userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
        userAvatarUrl={resolvedAvatarUrl}
        onSettingsClick={() => navigate('/settings')}
        onLogout={async () => { await signOut(); navigate('/login'); }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main content area — scrollable, full height */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </main>
    </div>
  );
};
