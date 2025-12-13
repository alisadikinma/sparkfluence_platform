import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { Card, CardContent } from "../../components/ui/card";
import { UserCircle, Link2, Bell, CreditCard, ChevronRight, LogOut } from "lucide-react";

export const Settings = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { t } = useLanguage();

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

  const settingsItems = [
    {
      icon: UserCircle,
      title: t.settings.tabs.profile,
      description: t.settings.descriptions.profile,
      path: "/settings/profile",
      color: "from-[#7c3aed] to-[#6d28d9]",
    },
    {
      icon: Link2,
      title: t.settings.tabs.linkedAccounts,
      description: t.settings.descriptions.linkedAccounts,
      path: "/settings/linked-accounts",
      color: "from-[#ec4899] to-[#d946ef]",
    },
    {
      icon: Bell,
      title: t.settings.tabs.notifications,
      description: t.settings.descriptions.notifications,
      path: "/settings/notifications",
      color: "from-[#06b6d4] to-[#0891b2]",
    },
    {
      icon: CreditCard,
      title: t.settings.tabs.planBilling,
      description: t.settings.descriptions.planBilling,
      path: "/settings/plan-billing",
      color: "from-[#f59e0b] to-[#d97706]",
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

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
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">{t.settings.title}</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.common.logout}</span>
            </button>
          </div>

          {/* Settings Menu Items */}
          <div className="max-w-4xl space-y-3 sm:space-y-4">
            {settingsItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Card
                  key={index}
                  onClick={() => navigate(item.path)}
                  className="bg-card border border-border-default hover:bg-surface hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                    <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-text-primary font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-text-secondary text-sm">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
