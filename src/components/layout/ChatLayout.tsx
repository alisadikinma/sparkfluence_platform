import React, { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  // Menu items (NO Settings — lives in user profile area at sidebar bottom)
  const menuItems = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'planner', icon: 'Calendar', label: 'Planner', path: '/planner' },
    { id: 'scriptGen', icon: 'Sparkles', label: 'Script Gen', path: '/script-gen' },
    { id: 'creatorLab', icon: 'Clapperboard', label: 'Creator Lab', path: '/creator-lab' },
    { id: 'adStudio', icon: 'Target', label: 'Ad Studio', path: '/ad-studio' },
    { id: 'gallery', icon: 'Image', label: 'Gallery', path: '/gallery' },
  ];

  // Determine active menu from current path
  const activeMenuId = menuItems.find(item => location.pathname.startsWith(item.path))?.id || null;

  // TODO: Replace with real sessions from useChatSessions hook
  const sessions: any[] = [];

  // Determine active session from URL
  const activeSessionId: string | null = null; // Will be set by route param

  return (
    <div className="flex h-dvh bg-[#0B0E14] overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        menuItems={menuItems}
        activeMenuId={activeMenuId}
        onMenuClick={(path) => navigate(path)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionClick={(orderId) => navigate(`/script-gen/${orderId}`)}
        onDeleteSession={() => {}}
        onRenameSession={() => {}}
        userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
        userAvatarUrl={user?.user_metadata?.avatar_url || null}
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
