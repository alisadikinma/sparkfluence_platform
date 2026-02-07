import React, { useState } from 'react';
import {
  LayoutDashboard, Calendar, Sparkles, Clapperboard, Target, Image,
  Settings, LogOut, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2,
  Check
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Types
interface MenuItem {
  id: string;
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

interface ChatSession {
  orderId: string;
  title: string;
  sessionType: 'script_gen' | 'creator_lab' | 'ad_studio';
  status: 'draft' | 'script_ready' | 'images_ready' | 'video_ready' | 'complete';
  updatedAt: string;
  progress?: {
    totalSegments: number;
    imagesCompleted: number;
    videosCompleted: number;
    currentStep: 'script' | 'images' | 'video' | 'studio';
  };
}

interface ChatSidebarProps {
  menuItems: MenuItem[];
  activeMenuId: string | null;
  onMenuClick: (path: string) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionClick: (orderId: string) => void;
  onDeleteSession: (orderId: string) => void;
  onRenameSession: (orderId: string, newTitle: string) => void;
  userName: string;
  userAvatarUrl: string | null;
  onSettingsClick: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard, Calendar, Sparkles, Clapperboard, Target, Image, Settings,
};

// Session type config
const SESSION_TYPE_CONFIG = {
  script_gen: { label: 'Script', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Sparkles },
  creator_lab: { label: 'Creator', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: Clapperboard },
  ad_studio: { label: 'Ad', color: 'text-violet-500', bgColor: 'bg-violet-500/10', icon: Target },
};

// Group sessions by date
function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ChatSession[]> = {};

  for (const session of sessions) {
    const date = new Date(session.updatedAt);
    let group: string;
    if (date >= today) group = 'Today';
    else if (date >= yesterday) group = 'Yesterday';
    else if (date >= weekAgo) group = 'This Week';
    else group = 'Older';

    if (!groups[group]) groups[group] = [];
    groups[group].push(session);
  }

  return groups;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  menuItems,
  activeMenuId,
  onMenuClick,
  sessions,
  activeSessionId,
  onSessionClick,
  onDeleteSession,
  onRenameSession,
  userName,
  userAvatarUrl,
  onSettingsClick,
  onLogout,
  collapsed,
  onToggleCollapse,
}) => {
  const { theme } = useTheme();
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const logoSrc = theme === 'dark' ? '/logo-light.png' : '/logo-dark.png';
  const groupedSessions = groupSessionsByDate(sessions);
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

  const handleStartRename = (session: ChatSession) => {
    setRenamingSession(session.orderId);
    setRenameValue(session.title);
  };

  const handleConfirmRename = (orderId: string) => {
    if (renameValue.trim()) {
      onRenameSession(orderId, renameValue.trim());
    }
    setRenamingSession(null);
  };

  return (
    <aside
      className={`
        flex flex-col h-screen
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        bg-[#0B0E14] border-r border-[#262626]
        transition-all duration-200 ease-in-out
        flex-shrink-0
      `}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => onMenuClick('/')}
          className={`flex items-center gap-2.5 hover:opacity-80 transition-opacity ${collapsed ? 'justify-center w-full' : ''}`}
        >
          <img className="w-8 h-8 flex-shrink-0" alt="Logo" src={logoSrc} />
          {!collapsed && (
            <span className="text-lg font-bold text-[#FAFAF9] tracking-tight whitespace-nowrap">
              SPARKFLUENCE
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-[#78716C] hover:text-[#FAFAF9] hover:bg-[#161616] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mb-2 p-1.5 rounded-md text-[#78716C] hover:text-[#FAFAF9] hover:bg-[#161616] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-[#262626] mx-3" />

      {/* Menu Section */}
      <nav className="px-2 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const IconComponent = iconMap[item.icon] || Sparkles;
          const isActive = activeMenuId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.path)}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-150
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-[#10B981]/10 text-[#10B981]'
                  : 'text-[#A8A29E] hover:text-[#FAFAF9] hover:bg-[#161616]'
                }
              `}
            >
              <IconComponent className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="ml-auto text-[10px] font-medium bg-[#10B981] text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-[#262626] mx-3" />

      {/* History Section — Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <p className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider px-3 mb-2">
            History
          </p>
        )}

        {collapsed ? (
          // Collapsed: just show dots for recent sessions
          <div className="flex flex-col items-center gap-2 mt-2">
            {sessions.slice(0, 5).map((session) => {
              const typeConfig = SESSION_TYPE_CONFIG[session.sessionType];
              return (
                <button
                  key={session.orderId}
                  onClick={() => onSessionClick(session.orderId)}
                  title={session.title}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    activeSessionId === session.orderId
                      ? `${typeConfig.bgColor} ${typeConfig.color}`
                      : 'hover:bg-[#161616] text-[#78716C]'
                  }`}
                >
                  <typeConfig.icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        ) : (
          // Expanded: grouped list
          <div className="space-y-3">
            {groupOrder.map((groupName) => {
              const groupSessions = groupedSessions[groupName];
              if (!groupSessions || groupSessions.length === 0) return null;

              return (
                <div key={groupName}>
                  <p className="text-[10px] font-medium text-[#57534E] uppercase tracking-wider px-3 mb-1">
                    {groupName}
                  </p>
                  <div className="space-y-0.5">
                    {groupSessions.map((session) => {
                      const typeConfig = SESSION_TYPE_CONFIG[session.sessionType];
                      const isActive = activeSessionId === session.orderId;
                      const isHovered = hoveredSession === session.orderId;
                      const isRenaming = renamingSession === session.orderId;
                      const isComplete = session.status === 'complete';

                      return (
                        <div
                          key={session.orderId}
                          onMouseEnter={() => setHoveredSession(session.orderId)}
                          onMouseLeave={() => setHoveredSession(null)}
                          className={`
                            group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150
                            ${isActive
                              ? 'bg-[#161616] border border-[#262626]'
                              : 'hover:bg-[#161616]/60'
                            }
                          `}
                          onClick={() => !isRenaming && onSessionClick(session.orderId)}
                        >
                          {/* Type indicator */}
                          <div className={`flex-shrink-0 ${isComplete ? 'text-green-500' : typeConfig.color}`}>
                            {isComplete
                              ? <Check className="w-3.5 h-3.5" />
                              : <typeConfig.icon className="w-3.5 h-3.5" />
                            }
                          </div>

                          {/* Title + Progress */}
                          <div className="flex-1 min-w-0">
                            {isRenaming ? (
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConfirmRename(session.orderId);
                                  if (e.key === 'Escape') setRenamingSession(null);
                                }}
                                onBlur={() => handleConfirmRename(session.orderId)}
                                className="w-full bg-transparent text-[12px] text-[#FAFAF9] outline-none border-b border-[#10B981]"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className={`text-[12px] truncate ${isActive ? 'text-[#FAFAF9] font-medium' : 'text-[#A8A29E]'}`}>
                                {session.title}
                              </p>
                            )}

                            {/* Progress badge */}
                            {session.progress && !isRenaming && (
                              <p className="text-[10px] text-[#57534E] mt-0.5">
                                {session.progress.currentStep === 'images' && `${session.progress.imagesCompleted}/${session.progress.totalSegments} images`}
                                {session.progress.currentStep === 'video' && `${session.progress.videosCompleted}/${session.progress.totalSegments} videos`}
                                {session.progress.currentStep === 'script' && 'Scripting...'}
                                {session.progress.currentStep === 'studio' && 'In Studio'}
                              </p>
                            )}
                          </div>

                          {/* Hover actions */}
                          {isHovered && !isRenaming && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStartRename(session); }}
                                className="p-1 rounded text-[#78716C] hover:text-[#FAFAF9] hover:bg-[#252525] transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.orderId); }}
                                className="p-1 rounded text-[#78716C] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <p className="text-[11px] text-[#57534E] px-3 py-4 text-center">
                No sessions yet. Pick a tool above to get started.
              </p>
            )}
          </div>
        )}
      </div>

      {/* User Profile Section (bottom) */}
      <div className="border-t border-[#262626] px-3 py-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#161616] border border-[#262626] flex-shrink-0 overflow-hidden">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#78716C] text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#FAFAF9] truncate">{userName}</p>
              </div>

              {/* Settings + Logout */}
              <button
                onClick={onSettingsClick}
                className="p-1.5 rounded-md text-[#78716C] hover:text-[#FAFAF9] hover:bg-[#161616] transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md text-[#78716C] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
