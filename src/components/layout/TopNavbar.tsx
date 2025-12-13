import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { ThemeToggle } from "../ui/ThemeToggle";

interface TopNavbarProps {
  tokenBalance?: number;
}

export const TopNavbar: React.FC<TopNavbarProps> = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  const leftOffset = sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[240px]';

  return (
    <header className={`fixed top-0 right-0 left-0 ${leftOffset} h-14 sm:h-16 bg-page border-b border-border-default flex items-center justify-end px-3 sm:px-4 gap-2 sm:gap-4 z-40 transition-all duration-300`}>
      {/* Theme Toggle - same as landing page */}
      <ThemeToggle />

      {/* Notification Dropdown */}
      <NotificationDropdown />

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* User Dropdown */}
      <UserDropdown />
    </header>
  );
};
