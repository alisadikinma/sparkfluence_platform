import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { User, CreditCard, LogOut } from "lucide-react";

export const UserDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch avatar - prioritize uploaded avatar over OAuth
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        return;
      }

      // 1. FIRST check user_profiles table (uploaded avatar takes priority)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.avatar_url) {
        console.log('UserDropdown - Using uploaded avatar:', data.avatar_url);
        setAvatarUrl(data.avatar_url);
        return;
      }

      // 2. Fallback to OAuth avatar (Google)
      const oauthAvatar = user.user_metadata?.avatar_url;
      if (oauthAvatar && typeof oauthAvatar === 'string' && oauthAvatar.startsWith('http')) {
        console.log('UserDropdown - Fallback to OAuth avatar');
        setAvatarUrl(oauthAvatar);
        return;
      }

      console.log('UserDropdown - No avatar found');
    };

    fetchAvatar();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      icon: User,
      label: language === 'id' ? 'Profil' : 'Profile',
      onClick: () => navigate('/settings'),
    },
    {
      icon: CreditCard,
      label: language === 'id' ? 'Tagihan' : 'Billing',
      onClick: () => navigate('/settings/plan-billing'),
    },
    {
      icon: LogOut,
      label: language === 'id' ? 'Keluar' : 'Log Out',
      onClick: handleSignOut,
      danger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center hover:opacity-90 transition-opacity overflow-hidden"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-white font-semibold text-sm">
            {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a24] border border-[#2b2b38] rounded-xl shadow-lg py-2 z-50">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-white/80 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
