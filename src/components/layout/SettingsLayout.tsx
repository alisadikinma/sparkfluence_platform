import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AppSidebar } from "./AppSidebar";
import { TopNavbar } from "./TopNavbar";
import { ArrowLeft } from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  backPath?: string;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ 
  children, 
  title,
  backPath = "/settings"
}) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  // Loading state
  if (authLoading) {
    return (
      <div className="flex w-full min-h-screen bg-page items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex w-full min-h-screen bg-page">
      {/* Shared Sidebar */}
      <AppSidebar activePage="settings" />

      {/* Main Content Area */}
      <div className="flex-1 transition-all duration-300">
        {/* Shared Top Navbar */}
        <TopNavbar />

        {/* Content */}
        <main className="mt-16 sm:mt-20 p-4 sm:p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'id' ? 'Kembali ke Pengaturan' : 'Back to Settings'}</span>
          </button>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-6">{title}</h1>

          {/* Page Content */}
          {children}
        </main>
      </div>
    </div>
  );
};
