import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Menu, X, Home, Calendar, Clock, Sparkles, Image, Video,
  MessageCircle,
  ChevronLeft, ChevronRight
} from "lucide-react";

interface AppSidebarProps {
  activePage: 'dashboard' | 'planner' | 'history' | 'settings' | 'scriptLab';
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activePage }) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed } }));
  }, [collapsed]);

  const menuItems = {
    general: [
      { id: 'dashboard', icon: Home, label: t.nav.dashboard, path: '/dashboard' },
      { id: 'planner', icon: Calendar, label: t.nav.planner, path: '/planner' },
      { id: 'history', icon: Clock, label: t.nav.history, path: '/history' },
    ],
    aiTools: [
      { id: 'scriptLab', icon: Sparkles, label: t.nav.scriptLab, path: '/script-lab' },
      { id: 'visualForge', icon: Image, label: t.nav.visualForge, comingSoon: true },
      { id: 'videoGenie', icon: Video, label: t.nav.videoGenie, comingSoon: true },
      { id: 'aiChat', icon: MessageCircle, label: 'AI Chat', comingSoon: true },
    ],
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[240px]';

  // Dynamic logo based on theme
  const logoSrc = theme === 'dark' ? '/logo-light.png' : '/logo-dark.png';

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 text-text-primary bg-card hover:bg-surface rounded-lg transition-colors lg:hidden shadow-lg border border-border-default"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        ${sidebarWidth} h-screen bg-card border-r border-border-default
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        p-4 flex flex-col
      `}>
        {/* Close button - Mobile only */}
        <button
          className="absolute top-4 right-4 lg:hidden p-2 text-text-primary hover:bg-surface rounded-lg transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo - Dynamic based on theme */}
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity ${collapsed ? 'justify-center' : ''}`}
        >
          <img className="w-10 h-10 flex-shrink-0" alt="Logo" src={logoSrc} />
          {!collapsed && (
            <span className="text-xl font-bold text-text-primary whitespace-nowrap">SPARKFLUENCE</span>
          )}
        </button>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {/* General Section */}
          <div className="mb-4">
            {!collapsed && (
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">
                {language === 'id' ? 'UMUM' : 'GENERAL'}
              </p>
            )}
            {menuItems.general.map(item => (
              <button
                key={item.id}
                onClick={() => item.path && navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  activePage === item.id
                    ? 'bg-primary text-white'
                    : 'hover:bg-surface text-text-primary'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
              </button>
            ))}
          </div>

          {/* AI Tools Section */}
          <div className="mb-4">
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">AI TOOLS</p>
              </div>
            )}
            {menuItems.aiTools.map(item => (
              <button
                key={item.id}
                onClick={() => !item.comingSoon && item.path && navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  item.comingSoon
                    ? 'hover:bg-surface text-text-muted cursor-not-allowed'
                    : activePage === item.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-surface text-text-primary'
                }`}
                disabled={item.comingSoon}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-semibold flex items-center gap-2">
                    {item.label}
                    {item.comingSoon && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {t.common.comingSoon}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Collapse Toggle Button - Desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-full mt-4 pt-4 border-t border-border-default text-text-secondary hover:text-text-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </div>
          )}
        </button>
      </aside>
    </>
  );
};
