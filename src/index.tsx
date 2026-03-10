import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { Dashboard } from "./screens/Dashboard";
import { Settings, PlanBilling, Profile, LinkedAccounts, Notifications } from "./screens/Settings";
import { Billing } from "./screens/Billing";
import { Onboarding } from "./screens/Onboarding";
import { NicheRecommendations } from "./screens/NicheRecommendations";
import { CreativeDNA } from "./screens/CreativeDNA";
import { AvatarUpload } from "./screens/AvatarUpload";
import { AvatarPreview } from "./screens/AvatarPreview";
import { Gallery } from "./screens/Gallery";
import { Planner } from "./screens/Planner";
import { History } from "./screens/History/History";
import { AuthCallback } from "./screens/AuthCallback/AuthCallback";
import { AdStudio } from "./screens/AdStudio";
import { SparkfluenceEngineTest } from "./screens/EngineTest";
import { Privacy, Terms } from "./screens/Legal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChatLayout } from "./components/layout";
import { ChatHome } from "./screens/ChatHome";
import { Workspace } from "./screens/Workspace";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { StudioEditor } from "./screens/Workspace/steps/StudioEditor";

// Wrapper component for smooth scroll
const SmoothScrollWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSmoothScroll();
  return <>{children}</>;
};

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
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

                    {/* Legal pages (no layout - standalone) */}
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />

                    {/* Auth pages (no layout) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/package-selection" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/niche-recommendations" element={<NicheRecommendations />} />
                    <Route path="/creative-dna" element={<CreativeDNA />} />
                    <Route path="/avatar-upload" element={<AvatarUpload />} />
                    <Route path="/avatar-preview" element={<AvatarPreview />} />
                    {/* Legacy routes — redirect to v3.0 equivalents */}
                    <Route path="/content-curation" element={<Navigate to="/script-gen" replace />} />
                    <Route path="/topic-selection" element={<Navigate to="/script-gen" replace />} />
                    <Route path="/image-generation" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/video-generation" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/music-selector" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/loading" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/full-video" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/full-video-preview" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/script-lab" element={<Navigate to="/script-gen" replace />} />
                    <Route path="/studio" element={<Navigate to="/creator-lab" replace />} />
                    <Route path="/ad-studio" element={<ChatLayout><AdStudio /></ChatLayout>} />

                    {/* Standalone pages — wrapped in ChatLayout for v3.0 sidebar */}
                    <Route path="/dashboard" element={<ChatLayout><Dashboard /></ChatLayout>} />
                    <Route path="/planner" element={<ChatLayout><Planner /></ChatLayout>} />
                    <Route path="/gallery" element={<ChatLayout><Gallery /></ChatLayout>} />
                    <Route path="/history" element={<ChatLayout><History /></ChatLayout>} />
                    <Route path="/settings" element={<ChatLayout><Settings /></ChatLayout>} />
                    <Route path="/settings/plan-billing" element={<ChatLayout><PlanBilling /></ChatLayout>} />
                    <Route path="/settings/profile" element={<ChatLayout><Profile /></ChatLayout>} />
                    <Route path="/settings/linked-accounts" element={<ChatLayout><LinkedAccounts /></ChatLayout>} />
                    <Route path="/settings/notifications" element={<ChatLayout><Notifications /></ChatLayout>} />
                    <Route path="/app/billing" element={<ChatLayout><Billing /></ChatLayout>} />
                    <Route path="/billing" element={<ChatLayout><Billing /></ChatLayout>} />

                    {/* ═══ v3.0 Chat-Based Routes (ChatLayout + Workspace) ═══ */}

                    {/* Script Gen — new session home */}
                    <Route path="/script-gen" element={<ChatLayout><ChatHome /></ChatLayout>} />

                    {/* Script Gen — full-screen Studio editor (must be BEFORE /:step catch-all) */}
                    <Route path="/script-gen/:orderId/studio" element={<StudioEditor />} />

                    {/* Script Gen — existing session workspace */}
                    <Route path="/script-gen/:orderId" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />
                    <Route path="/script-gen/:orderId/:step" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />

                    {/* Creator Lab — new session home */}
                    <Route path="/creator-lab" element={<ChatLayout><ChatHome /></ChatLayout>} />

                    {/* Creator Lab — full-screen Studio editor (must be BEFORE /:step catch-all) */}
                    <Route path="/creator-lab/:orderId/studio" element={<StudioEditor />} />

                    {/* Creator Lab — existing session workspace */}
                    <Route path="/creator-lab/:orderId" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />
                    <Route path="/creator-lab/:orderId/:step" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />

                    {/* Ad Studio — full-screen Studio editor (must be BEFORE /:step catch-all) */}
                    <Route path="/ad-studio/:orderId/studio" element={<StudioEditor />} />

                    {/* Ad Studio — workspace routes */}
                    <Route path="/ad-studio/:orderId" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />
                    <Route path="/ad-studio/:orderId/:step" element={
                      <ChatLayout><WorkspaceProvider><Workspace /></WorkspaceProvider></ChatLayout>
                    } />

                      {/* Admin only - Engine Test Dashboard */}
                      <Route path="/sparkfluence-engine-test" element={<SparkfluenceEngineTest />} />
                    </Routes>
                  </PlannerProvider>
                </OnboardingProvider>
              </AuthProvider>
            </SmoothScrollWrapper>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
