import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { SettingsLayout } from "../../components/layout/SettingsLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Mail, Bell, Megaphone, MessageSquare, Loader2, Check } from "lucide-react";

interface NotificationSettings {
  email_updates: boolean;
  app_updates: boolean;
  marketing: boolean;
  in_app: boolean;
}

const defaultSettings: NotificationSettings = {
  email_updates: true,
  app_updates: true,
  marketing: false,
  in_app: true,
};

interface NotificationOption {
  id: keyof NotificationSettings;
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  icon: React.ElementType;
}

const notificationOptions: NotificationOption[] = [
  {
    id: "email_updates",
    title: "Email Updates",
    titleId: "Pembaruan Email",
    description: "Receive important updates and notifications via email",
    descriptionId: "Terima pembaruan penting dan notifikasi melalui email",
    icon: Mail,
  },
  {
    id: "app_updates",
    title: "App Updates",
    titleId: "Pembaruan Aplikasi",
    description: "Get notified about new features and improvements",
    descriptionId: "Dapatkan notifikasi tentang fitur baru dan peningkatan",
    icon: Bell,
  },
  {
    id: "marketing",
    title: "Marketing Emails",
    titleId: "Email Marketing",
    description: "Receive tips, tutorials, and promotional offers",
    descriptionId: "Terima tips, tutorial, dan penawaran promosi",
    icon: Megaphone,
  },
  {
    id: "in_app",
    title: "In-App Notifications",
    titleId: "Notifikasi Dalam Aplikasi",
    description: "Show notifications within the application",
    descriptionId: "Tampilkan notifikasi di dalam aplikasi",
    icon: MessageSquare,
  },
];

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-page ${checked ? 'bg-primary' : 'bg-surface'}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export const Notifications = (): JSX.Element => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("notification_settings")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data?.notification_settings) {
        setSettings({ ...defaultSettings, ...data.notification_settings });
      }
    } catch (err) {
      console.error("Error fetching notification settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ notification_settings: settings, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving notification settings:", err);
      alert(language === 'id' ? "Gagal menyimpan pengaturan." : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const title = language === 'id' ? 'Pengaturan Notifikasi' : 'Notification Settings';

  if (loading) {
    return (
      <SettingsLayout title={title}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={title}>
      <p className="text-text-secondary mb-8">
        {language === 'id' 
          ? 'Kelola cara Anda menerima notifikasi dari Sparkfluence' 
          : 'Manage how you receive notifications from Sparkfluence'}
      </p>

      {/* Notification Options */}
      <div className="max-w-2xl space-y-4">
        {notificationOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.id} className="bg-card border border-border-default hover:border-surface transition-colors">
              <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-text-primary font-medium">{language === 'id' ? option.titleId : option.title}</h3>
                  <p className="text-text-secondary text-sm mt-0.5">{language === 'id' ? option.descriptionId : option.description}</p>
                </div>
                <ToggleSwitch checked={settings[option.id]} onChange={() => handleToggle(option.id)} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="max-w-2xl mt-8">
        <Button onClick={saveSettings} disabled={saving} className="bg-primary hover:bg-primary-hover w-full sm:w-auto">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
          {saveSuccess ? (language === 'id' ? 'Tersimpan!' : 'Saved!') : (language === 'id' ? 'Simpan Preferensi' : 'Save Preferences')}
        </Button>
      </div>

      {/* Info Box */}
      <div className="max-w-2xl mt-8 p-4 bg-card border border-border-default rounded-lg">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-text-primary font-medium mb-2">{language === 'id' ? 'Tentang Notifikasi' : 'About Notifications'}</h4>
            <ul className="text-text-secondary text-sm space-y-1">
              <li>• {language === 'id' ? 'Pembaruan email termasuk status video dan peringatan akun' : 'Email updates include video status and account alerts'}</li>
              <li>• {language === 'id' ? 'Pembaruan aplikasi memberi tahu tentang fitur baru' : 'App updates notify you about new features'}</li>
              <li>• {language === 'id' ? 'Email marketing berisi tips dan penawaran (bisa dinonaktifkan)' : 'Marketing emails contain tips and offers (you can opt out)'}</li>
            </ul>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};
