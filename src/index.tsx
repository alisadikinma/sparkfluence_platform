import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PlannerProvider } from "./contexts/PlannerContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { Landing } from "./screens/Landing";
import { Pricing } from "./screens/Pricing";
import { Resources, ResourceDetail } from "./screens/Resources";
import { HelpCenter, HelpDetail } from "./screens/HelpCenter";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { PublicLayout } from "./components/layout";
import { Welcome } from "./screens/Welcome";
import { PackageSelection } from "./screens/PackageSelection";
import { Dashboard } from "./screens/Dashboard";
import { Settings, PlanBilling, Profile, LinkedAccounts, Notifications } from "./screens/Settings";
import { Onboarding } from "./screens/Onboarding";
import { NicheRecommendations } from "./screens/NicheRecommendations";
import { CreativeDNA } from "./screens/CreativeDNA";
import { AvatarUpload } from "./screens/AvatarUpload";
import { AvatarPreview } from "./screens/AvatarPreview";
import { ContentCuration } from "./screens/ContentCuration";
import { TopicSelection } from "./screens/TopicSelection";
import { VideoEditor } from "./screens/VideoEditor";
import { VideoGeneration } from "./screens/VideoGeneration";
import { MusicSelector } from "./screens/MusicSelector";
import { Loading } from "./screens/Loading";
import { FullVideo } from "./screens/FullVideo";
import { FullVideoPreview } from "./screens/FullVideoPreview";
import { Gallery } from "./screens/Gallery";
import { Planner } from "./screens/Planner";
import { History } from "./screens/History/History";
import { AuthCallback } from "./screens/AuthCallback/AuthCallback";
import { ScriptLab } from "./screens/ScriptLab";

// Wrapper component for smooth scroll
const SmoothScrollWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSmoothScroll();
  return <>{children}</>;
};

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <SmoothScrollWrapper>
            <AuthProvider>
              <OnboardingProvider>
                <PlannerProvider>
                  <Routes>
                    {/* Public pages with PublicLayout (Navbar + Footer) */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<Landing />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/resources/:slug" element={<ResourceDetail />} />
                      <Route path="/help" element={<HelpCenter />} />
                      <Route path="/help/:slug" element={<HelpDetail />} />
                    </Route>

                    {/* Auth pages (no layout) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/package-selection" element={<PackageSelection />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/niche-recommendations" element={<NicheRecommendations />} />
                    <Route path="/creative-dna" element={<CreativeDNA />} />
                    <Route path="/avatar-upload" element={<AvatarUpload />} />
                    <Route path="/avatar-preview" element={<AvatarPreview />} />
                    <Route path="/content-curation" element={<ContentCuration />} />
                    <Route path="/topic-selection" element={<TopicSelection />} />
                    <Route path="/video-editor" element={<VideoEditor />} />
                    <Route path="/video-generation" element={<VideoGeneration />} />
                    <Route path="/music-selector" element={<MusicSelector />} />
                    <Route path="/loading" element={<Loading />} />
                    <Route path="/full-video" element={<FullVideo />} />
                    <Route path="/full-video-preview" element={<FullVideoPreview />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/script-lab" element={<ScriptLab />} />
                    <Route path="/planner" element={<Planner />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/plan-billing" element={<PlanBilling />} />
                    <Route path="/settings/profile" element={<Profile />} />
                    <Route path="/settings/linked-accounts" element={<LinkedAccounts />} />
                    <Route path="/settings/notifications" element={<Notifications />} />
                  </Routes>
                </PlannerProvider>
              </OnboardingProvider>
            </AuthProvider>
          </SmoothScrollWrapper>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
