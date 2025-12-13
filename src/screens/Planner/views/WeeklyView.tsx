import React, { useState, useMemo } from "react";
import { usePlanner } from "../../../contexts/PlannerContext";

interface WeeklyViewProps {
  searchQuery: string;
}

export const WeeklyView = ({ searchQuery }: WeeklyViewProps): JSX.Element => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { plannedContent, loading } = usePlanner();

  const filteredContent = useMemo(() => {
    if (!searchQuery) return plannedContent;
    return plannedContent.filter((content) =>
      content.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plannedContent, searchQuery]);

  const getWeekDays = (date: Date) => {
    const current = new Date(date);
    const first = current.getDate() - current.getDay();
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(current.setDate(first + i));
      weekDays.push(day);
    }

    return weekDays;
  };

  const weekDays = getWeekDays(currentDate);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getContentForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return filteredContent
      .filter((content) => content.scheduled_date === dateStr)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  };

  const formatWeekRange = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${monthNames[firstDay.getMonth()]} ${firstDay.getDate()} - ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    } else {
      return `${monthNames[firstDay.getMonth()]} ${firstDay.getDate()} - ${monthNames[lastDay.getMonth()]} ${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-page flex items-center justify-center py-20">
        <div className="text-text-primary text-lg">Loading week...</div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">{formatWeekRange()}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousWeek}
            className="p-2 rounded-lg bg-card border border-border-default hover:border-primary text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg bg-card border border-border-default hover:border-primary text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayContent = getContentForDate(day);
          const isToday =
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`bg-card border ${
                isToday ? "border-primary" : "border-border-default"
              } rounded-xl p-4 min-h-[300px]`}
            >
              <div className="mb-4">
                <div className="text-xs text-text-secondary font-medium mb-1">
                  {dayNames[day.getDay()]}
                </div>
                <div
                  className={`text-2xl font-semibold ${
                    isToday ? "text-primary" : "text-text-primary"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              <div className="space-y-2">
                {dayContent.map((content) => (
                  <div
                    key={content.id}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs text-white/80">{content.scheduled_time}</div>
                      <div className="flex items-center gap-1">
                        {content.platforms.map((platform, idx) => (
                          <div key={idx} className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                            {platform === "instagram" && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                              </svg>
                            )}
                            {platform === "tiktok" && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                              </svg>
                            )}
                            {platform === "youtube" && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-white line-clamp-2">{content.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
