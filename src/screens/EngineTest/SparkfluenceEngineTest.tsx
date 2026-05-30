import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { ScriptGenTab } from "./components/ScriptGenTab";
import { ImagePromptTab } from "./components/ImagePromptTab";
import { VideoPromptTab } from "./components/VideoPromptTab";
import { FileText, Image, Video, FlaskConical, ShieldAlert } from "lucide-react";

// Admin emails yang diizinkan akses
const ADMIN_EMAILS = [
  "alisadikin.ma@gmail.com",
  "ali.sadikincom85@gmail.com",
  "admin@sparkfluence.com"
];

type TabType = "script" | "image" | "video";

export const SparkfluenceEngineTest = (): JSX.Element => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("script");

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <FlaskConical className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  // Check auth
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin access
  const isAdmin = ADMIN_EMAILS.includes(user.email || "");
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "script" as TabType, label: "Script Generation", icon: FileText },
    { id: "image" as TabType, label: "Image Prompt", icon: Image },
    { id: "video" as TabType, label: "Video Prompt", icon: Video },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        <TopNavbar />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <FlaskConical className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Engine Test Dashboard</h1>
              <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-600 rounded-full">
                Admin Only
              </span>
            </div>
            <p className="text-muted-foreground">
              Test dan bandingkan output engine Sparkfluence dengan Claude reference untuk QA iterative improvement.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === "script" && <ScriptGenTab />}
            {activeTab === "image" && <ImagePromptTab />}
            {activeTab === "video" && <VideoPromptTab />}
          </div>
        </main>
      </div>
    </div>
  );
};
