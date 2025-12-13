import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { PlatformIcons } from "../../../components/ui/platform-icons";
import { ChevronRight, Clock } from "lucide-react";

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
}

interface ListViewProps {
  searchQuery: string;
}

export const ListView: React.FC<ListViewProps> = ({ searchQuery }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [content, setContent] = useState<PlannedContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [user]);

  const fetchContent = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("planned_content")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (data) setContent(data);
    setLoading(false);
  };

  const filteredContent = content.filter(c => {
    if (!searchQuery) return true;
    return c.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'id' ? 'Hapus konten ini?' : 'Delete this content?')) return;

    await supabase.from("planned_content").delete().eq("id", id);
    setContent(prev => prev.filter(c => c.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-primary text-lg">
          {language === 'id' ? 'Memuat data...' : 'Loading data...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-card border border-border-default rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[40px,1fr,150px,150px,40px] gap-4 px-4 py-3 border-b border-border-default">
          <div></div>
          <div className="text-text-secondary text-sm font-medium">
            {language === 'id' ? 'Tanggal / Judul' : 'Date / Title'}
          </div>
          <div className="text-text-secondary text-sm font-medium text-center">
            Platform
          </div>
          <div className="text-text-secondary text-sm font-medium text-center">
            {language === 'id' ? 'Jam Publish' : 'Publish Time'}
          </div>
          <div></div>
        </div>

        {/* Table Body */}
        {filteredContent.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-text-secondary">
              {language === 'id' ? 'Tidak ada konten ditemukan' : 'No content found'}
            </p>
          </div>
        ) : (
          filteredContent.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[40px,1fr,150px,150px,40px] gap-4 px-4 py-4 border-b border-border-default hover:bg-surface transition-colors items-center"
            >
              {/* Checkbox */}
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border-default bg-page checked:bg-primary focus:ring-0"
                />
              </div>

              {/* Date & Title */}
              <div>
                <div className="text-text-muted text-xs mb-1">{formatDate(item.scheduled_date)}</div>
                <div className="flex items-center gap-2">
                  {!item.final_video_url && (
                    <span className="bg-surface text-text-secondary text-[10px] px-1.5 py-0.5 rounded shrink-0">
                      {language === 'id' ? 'No video' : 'No video'}
                    </span>
                  )}
                  <span className="text-text-primary font-medium truncate">{item.title}</span>
                </div>
              </div>

              {/* Platform Icons */}
              <div className="flex items-center justify-center">
                <PlatformIcons platforms={item.platforms} size="sm" />
              </div>

              {/* Publish Time */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">
                    {item.scheduled_time?.slice(0, 5) || '00:00'}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => {/* Could open detail modal */}}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
