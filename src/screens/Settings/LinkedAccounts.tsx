import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { SettingsLayout } from "../../components/layout/SettingsLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Youtube,
  Instagram,
  Music2,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface LinkedAccount {
  id: string;
  platform: string;
  platform_username: string;
  connected_at: string;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

export const LinkedAccounts = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const platforms: Platform[] = [
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      color: "text-red-500",
      bgColor: "bg-red-600",
      description: language === 'id' 
        ? "Auto-post video ke channel YouTube Anda" 
        : "Auto-post videos to your YouTube channel",
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      color: "text-pink-500",
      bgColor: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
      description: language === 'id'
        ? "Bagikan reels dan postingan ke Instagram"
        : "Share reels and posts to Instagram",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: Music2,
      color: "text-white",
      bgColor: "bg-black",
      description: language === 'id'
        ? "Upload video langsung ke TikTok"
        : "Upload videos directly to TikTok",
    },
  ];

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchLinkedAccounts();
  }, [user]);

  const fetchLinkedAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("linked_accounts")
        .select("id, platform, platform_username, connected_at")
        .eq("user_id", user.id);
      if (error) throw error;
      if (data) setLinkedAccounts(data);
    } catch (err) {
      console.error("Error fetching linked accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (platformId: string) => linkedAccounts.some(acc => acc.platform === platformId);
  const getAccount = (platformId: string) => linkedAccounts.find(acc => acc.platform === platformId);

  const connectPlatform = async (platformId: string) => {
    setConnecting(platformId);
    const message = language === 'id'
      ? `Integrasi OAuth untuk ${platformId.toUpperCase()} memerlukan setup tambahan.`
      : `OAuth integration for ${platformId.toUpperCase()} requires additional setup.`;
    alert(message);
    setConnecting(null);
  };

  const disconnectPlatform = async (platformId: string) => {
    if (!user) return;
    const confirmed = window.confirm(
      language === 'id'
        ? `Putuskan koneksi ${platformId}?`
        : `Disconnect ${platformId}?`
    );
    if (!confirmed) return;

    setConnecting(platformId);
    try {
      const { error } = await supabase
        .from("linked_accounts")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platformId);
      if (error) throw error;
      setLinkedAccounts(prev => prev.filter(acc => acc.platform !== platformId));
    } catch (err) {
      console.error("Error disconnecting platform:", err);
    } finally {
      setConnecting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'id' ? "id-ID" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  if (loading) {
    return (
      <SettingsLayout title={t.settings.tabs.linkedAccounts}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={t.settings.tabs.linkedAccounts}>
      <p className="text-text-secondary mb-8">
        {language === 'id' 
          ? 'Hubungkan akun media sosial untuk mengaktifkan auto-posting' 
          : 'Connect your social media accounts to enable auto-posting'}
      </p>

      {/* Platform Cards */}
      <div className="max-w-2xl space-y-4">
        {platforms.map((platform) => {
          const connected = isConnected(platform.id);
          const account = getAccount(platform.id);
          const Icon = platform.icon;
          const isProcessing = connecting === platform.id;

          return (
            <Card key={platform.id} className="bg-card border border-border-default hover:border-surface transition-colors">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
                <div className={`w-12 h-12 ${platform.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-text-primary font-semibold">{platform.name}</h3>
                    {connected && (
                      <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        {language === 'id' ? 'Terhubung' : 'Connected'}
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm mt-1">
                    {connected
                      ? `@${account?.platform_username} • ${formatDate(account?.connected_at || "")}`
                      : platform.description}
                  </p>
                </div>
                <Button
                  onClick={() => connected ? disconnectPlatform(platform.id) : connectPlatform(platform.id)}
                  disabled={isProcessing}
                  variant={connected ? "outline" : "default"}
                  className={`w-full sm:w-auto ${
                    connected
                      ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                      : "bg-primary hover:bg-primary-hover"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : connected ? (
                    <><X className="w-4 h-4 mr-2" />{language === 'id' ? 'Putuskan' : 'Disconnect'}</>
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-2" />{language === 'id' ? 'Hubungkan' : 'Connect'}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="max-w-2xl mt-8 p-4 bg-card border border-border-default rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-text-primary font-medium mb-2">
              {language === 'id' ? 'Mengapa menghubungkan akun?' : 'Why connect accounts?'}
            </h4>
            <ul className="text-text-secondary text-sm space-y-1">
              <li>• {language === 'id' ? 'Auto-post konten terjadwal langsung ke platform' : 'Auto-post scheduled content directly to platforms'}</li>
              <li>• {language === 'id' ? 'Tidak perlu upload manual' : 'No manual uploading required'}</li>
              <li>• {language === 'id' ? 'Sinkronisasi analitik dari semua platform' : 'Sync analytics from all platforms'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OAuth Notice */}
      <div className="max-w-2xl mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-400 font-medium mb-1">
              {language === 'id' ? 'Setup Developer Diperlukan' : 'Developer Setup Required'}
            </h4>
            <p className="text-amber-300/70 text-sm">
              {language === 'id'
                ? 'Integrasi OAuth memerlukan pembuatan developer apps di setiap platform.'
                : 'OAuth integration requires creating developer apps on each platform.'}
            </p>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};
