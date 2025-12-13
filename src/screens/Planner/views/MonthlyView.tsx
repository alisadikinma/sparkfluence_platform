import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { PlatformIcons } from "../../../components/ui/platform-icons";
import { ChevronLeft, ChevronRight, ArrowUpRight, Clock, X, Play, Trash, Globe } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface PlannedContent {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  final_video_url: string | null;
  is_public: boolean;
}

interface MonthlyViewProps {
  searchQuery: string;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({ searchQuery }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState<PlannedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<PlannedContent | null>(null);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = language === 'id'
    ? ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const monthNames = language === 'id'
    ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchContent();
  }, [user, currentDate]);

  const fetchContent = async () => {
    if (!user) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const { data } = await supabase
      .from("planned_content")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_date", firstDay.toISOString().split("T")[0])
      .lte("scheduled_date", lastDay.toISOString().split("T")[0])
      .order("scheduled_time", { ascending: true });

    if (data) setContent(data);
    setLoading(false);
  };

  const getContentForDate = (date: Date): PlannedContent[] => {
    const dateStr = date.toISOString().split("T")[0];
    let filtered = content.filter(c => c.scheduled_date === dateStr);

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Previous month days
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(year, month, -startDay + i + 1);
      days.push(prevDate);
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'id' ? 'Hapus konten ini?' : 'Delete this content?')) return;

    await supabase.from("planned_content").delete().eq("id", id);
    setContent(prev => prev.filter(c => c.id !== id));
    setSelectedContent(null);
  };

  const days = generateCalendarDays();
  const currentMonth = currentDate.getMonth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-primary text-lg">
          {language === 'id' ? 'Memuat kalender...' : 'Loading calendar...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 bg-card border border-border-default rounded-lg text-text-primary hover:bg-surface"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 bg-card border border-border-default rounded-lg text-text-primary hover:bg-surface"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border-default rounded-xl overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border-default">
          {daysOfWeek.map(day => (
            <div key={day} className="p-3 text-center text-text-secondary text-sm font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) return <div key={index} className="min-h-[120px] border-b border-r border-border-default" />;

            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = date.toDateString() === new Date().toDateString();
            const dayContent = getContentForDate(date);
            const showMore = dayContent.length > 2;

            return (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r border-border-default p-2 ${
                  !isCurrentMonth ? 'bg-page/50' : ''
                }`}
              >
                <span className={`text-sm ${
                  isToday
                    ? 'bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center'
                    : isCurrentMonth ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {date.getDate()}
                </span>

                <div className="mt-1 space-y-1">
                  {dayContent.slice(0, 2).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedContent(item)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 ${
                        item.final_video_url
                          ? 'bg-primary/20 text-primary'
                          : 'bg-surface text-text-secondary'
                      }`}
                    >
                      {!item.final_video_url && (
                        <span className="bg-white/20 text-[10px] px-1 rounded shrink-0">
                          {language === 'id' ? 'No video' : 'No video'}
                        </span>
                      )}
                      <PlatformIcons platforms={item.platforms} size="sm" maxShow={1} />
                      <span className="truncate flex-1">{item.title}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </button>
                  ))}

                  {showMore && (
                    <button
                      className="w-full text-left px-2 py-1 bg-surface rounded text-xs text-text-secondary hover:text-text-primary"
                    >
                      {dayContent.length - 2} {language === 'id' ? 'Lainnya' : 'Others'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedContent && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedContent(null)}
        >
          <div
            className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <h3 className="text-lg font-semibold text-text-primary">
                {language === 'id' ? 'Detail Planner' : 'Planner Detail'}
              </h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X className="w-5 h-5 text-text-primary" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Preview */}
              <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative">
                {selectedContent.final_video_url ? (
                  <video
                    src={selectedContent.final_video_url}
                    controls
                    className="w-full h-full object-contain"
                    poster={selectedContent.thumbnail_url || undefined}
                  />
                ) : selectedContent.thumbnail_url ? (
                  <>
                    <img
                      src={selectedContent.thumbnail_url}
                      alt={selectedContent.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="w-12 h-12 text-white/60" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-white/20" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-surface text-text-primary text-xs px-3 py-1 rounded-full">
                    {formatDate(selectedContent.scheduled_date)}
                  </span>
                  <span className="bg-surface text-text-primary text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {selectedContent.is_public
                      ? (language === 'id' ? 'Publik' : 'Public')
                      : (language === 'id' ? 'Privat' : 'Private')
                    }
                  </span>
                </div>

                <h2 className="text-xl font-bold text-text-primary">{selectedContent.title}</h2>
                <p className="text-text-secondary">{selectedContent.description || '-'}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted text-sm mb-2">Platform</p>
                    <PlatformIcons platforms={selectedContent.platforms} size="md" />
                  </div>
                  <div>
                    <p className="text-text-muted text-sm mb-2">
                      {language === 'id' ? 'Jam Publish' : 'Publish Time'}
                    </p>
                    <div className="flex items-center gap-2 text-text-primary">
                      <Clock className="w-4 h-4" />
                      {selectedContent.scheduled_time?.slice(0, 5) || '00:00'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleDelete(selectedContent.id)}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button className="flex-1 bg-primary hover:bg-primary-hover">
                    {language === 'id' ? 'Edit Plan' : 'Edit Plan'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
