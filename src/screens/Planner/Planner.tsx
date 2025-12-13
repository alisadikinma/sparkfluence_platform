import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { MonthlyView } from "./views/MonthlyView";
import { WeeklyView } from "./views/WeeklyView";
import { ListView } from "./views/ListView";
import { Plus, Search } from "lucide-react";
import { Button } from "../../components/ui/button";

type ViewType = "month" | "week" | "list";

export const Planner = (): JSX.Element => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<ViewType>("month");
  const [searchQuery, setSearchQuery] = useState("");

  const viewTabs = [
    { id: 'month', label: t.planner.views.month },
    { id: 'week', label: t.planner.views.week },
    { id: 'list', label: t.planner.views.list },
  ];

  return (
    <div className="flex w-full min-h-screen bg-page">
      <AppSidebar activePage="planner" />

      <div className="flex-1">
        <TopNavbar />

        <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-text-primary">{t.planner.title}</h1>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder={t.planner.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border-default rounded-lg pl-10 pr-4 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              {/* Add Plan Button */}
              <Button
                onClick={() => navigate('/content-curation')}
                className="bg-white text-black hover:bg-white/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.planner.addPlan}
              </Button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 border-b border-border-default mb-6">
            {viewTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as ViewType)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  activeView === tab.id
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                {activeView === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* View Content */}
          {activeView === "month" && <MonthlyView searchQuery={searchQuery} />}
          {activeView === "week" && <WeeklyView searchQuery={searchQuery} />}
          {activeView === "list" && <ListView searchQuery={searchQuery} />}
        </main>
      </div>
    </div>
  );
};
