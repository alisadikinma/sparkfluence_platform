import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Bell, User, Video, Calendar, Settings, Coins, AlertCircle, ImageIcon, CheckCircle2, Film } from "lucide-react";

interface NotificationData {
  session_id?: string;
  redirect_url?: string;
  completed?: number;
  failed?: number;
  total?: number;
  [key: string]: any;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: NotificationData | null;
  is_read: boolean;
  created_at: string;
}

const iconMap: Record<string, React.ElementType> = {
  profile: User,
  video: Video,
  schedule: Calendar,
  system: Settings,
  token: Coins,
  error: AlertCircle,
  image_generation_complete: ImageIcon,
  image_generation_partial: AlertCircle,
  video_generation_complete: Film,
  video_generation_partial: Film,
};

const formatTimeAgo = (dateString: string, language: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return language === 'id' ? 'Baru saja' : 'Just now';
  } else if (diffMins < 60) {
    return language === 'id' ? `${diffMins} menit lalu` : `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return language === 'id' ? `${diffHours} jam lalu` : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return language === 'id' ? 'Kemarin' : 'Yesterday';
  } else if (diffDays < 7) {
    return language === 'id' ? `${diffDays} hari lalu` : `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short'
    });
  }
};

export const NotificationDropdown: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, data, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n =>
        n.id === notif.id ? { ...n, is_read: true } : n
      ));

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id);
    }

    // Handle redirect based on notification type
    if (notif.data?.redirect_url) {
      setIsOpen(false);
      navigate(notif.data.redirect_url);
    } else if (notif.data?.session_id) {
      setIsOpen(false);
      // Route to appropriate page based on notification type
      if (notif.type.includes('video_generation')) {
        navigate(`/video-generation?session=${notif.data.session_id}`);
      } else if (notif.type.includes('image_generation')) {
        navigate(`/video-editor?session=${notif.data.session_id}`);
      }
    }
  };

  const getNotificationIcon = (notif: Notification) => {
    // Special icons for completion notifications
    if (notif.type === 'image_generation_complete' || notif.type === 'video_generation_complete') {
      return CheckCircle2;
    }
    return iconMap[notif.type] || Bell;
  };

  const getNotificationColor = (notif: Notification) => {
    switch (notif.type) {
      case 'error':
      case 'image_generation_partial':
      case 'video_generation_partial':
        return { bg: 'bg-red-500/20', icon: 'text-red-400' };
      case 'image_generation_complete':
        return { bg: 'bg-green-500/20', icon: 'text-green-400' };
      case 'video_generation_complete':
        return { bg: 'bg-purple-500/20', icon: 'text-purple-400' };
      default:
        return { bg: 'bg-[#2a2a38]', icon: 'text-white/60' };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#2a2a38] transition-colors"
      >
        <Bell className="w-5 h-5 text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a24] border border-[#2b2b38] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2b38]">
            <h3 className="text-white font-medium">
              {language === 'id' ? 'Notifikasi' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[#7c3aed] text-sm hover:underline"
              >
                {language === 'id' ? 'Tandai dibaca' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
                {language === 'id' ? 'Memuat...' : 'Loading...'}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {language === 'id' ? 'Tidak ada notifikasi' : 'No notifications'}
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = getNotificationIcon(notif);
                const colors = getNotificationColor(notif);
                const hasRedirect = notif.data?.redirect_url || notif.data?.session_id;
                const isGenerationNotif = notif.type.includes('generation');
                
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[#2a2a38] transition-colors text-left ${
                      !notif.is_read ? 'bg-[#2a2a38]/50' : ''
                    } ${hasRedirect ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{notif.title}</p>
                      {notif.message && (
                        <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      {/* Progress indicator for generation notifications */}
                      {isGenerationNotif && notif.data?.total && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                notif.type.includes('complete') ? 'bg-green-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${(notif.data.completed! / notif.data.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-white/40 text-[10px]">
                            {notif.data.completed}/{notif.data.total}
                          </span>
                        </div>
                      )}
                      <p className="text-white/40 text-xs mt-1">
                        {formatTimeAgo(notif.created_at, language)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-[#7c3aed] rounded-full flex-shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#2b2b38]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings/notifications');
                }}
                className="text-white/50 text-xs hover:text-white transition-colors w-full text-center"
              >
                {language === 'id' ? 'Lihat semua notifikasi' : 'View all notifications'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
