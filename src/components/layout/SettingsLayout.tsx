import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  backPath?: string;
}

/**
 * Lightweight wrapper for settings sub-pages.
 * Only adds a back button + title. The outer ChatLayout provides the sidebar.
 */
export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  children,
  title,
  backPath = "/settings"
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div className="w-full h-full bg-[#0B0E14]">
      <main className="p-4 sm:p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{language === 'id' ? 'Kembali ke Pengaturan' : 'Back to Settings'}</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-100 mb-6">{title}</h1>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
};
