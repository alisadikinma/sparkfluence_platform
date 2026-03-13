import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Instagram, Linkedin, Music2, Plus, Star, StarOff,
  Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw,
  MoreHorizontal, Trash2, ExternalLink, Shield, X,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ───

interface SocialAccount {
  id: string;
  user_id: string;
  platform: 'instagram' | 'tiktok' | 'linkedin';
  platform_user_id: string;
  account_label: string | null;
  username: string;
  profile_picture_url: string | null;
  token_expires_at: string | null;
  is_default: boolean;
  is_active: boolean;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

type AccountStatus = 'connected' | 'expired' | 'refreshing';

interface PlatformConfig {
  id: 'instagram' | 'tiktok' | 'linkedin';
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  phase: number;
  enabled: boolean;
  oauthUrl?: string;
  scopes?: string;
}

// ─── Platform Configurations ───

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    textColor: 'text-pink-400',
    phase: 1,
    enabled: true,
    scopes: 'instagram_basic,instagram_content_publish,pages_show_list,business_management',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: 'from-cyan-400 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    textColor: 'text-cyan-400',
    phase: 2,
    enabled: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-400',
    phase: 3,
    enabled: false,
  },
];

// ─── Helpers ───

function getAccountStatus(account: SocialAccount): AccountStatus {
  if (!account.is_active) return 'expired';
  if (!account.token_expires_at) return 'connected';
  const expiresAt = new Date(account.token_expires_at);
  if (expiresAt <= new Date()) return 'expired';
  return 'connected';
}

function formatExpiryDate(dateStr: string | null): string {
  if (!dateStr) return 'No expiry';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusConfig(status: AccountStatus) {
  switch (status) {
    case 'connected':
      return { label: 'Connected', icon: CheckCircle2, className: 'text-emerald-400', dotClass: 'bg-emerald-400' };
    case 'expired':
      return { label: 'Expired', icon: AlertCircle, className: 'text-red-400', dotClass: 'bg-red-400' };
    case 'refreshing':
      return { label: 'Refreshing', icon: Loader2, className: 'text-amber-400', dotClass: 'bg-amber-400' };
  }
}

// ─── Instagram OAuth Builder ───

function buildInstagramOAuthUrl(): string {
  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID || '';
  // Must use production domain — Meta requires HTTPS redirect URIs
  const prodOrigin = import.meta.env.VITE_OAUTH_REDIRECT_ORIGIN || 'https://sparkfluence.studio';
  const callbackUrl = `${prodOrigin}/settings/social-accounts/callback`;
  // Scopes must match permissions enabled in Meta App > Use cases > Permissions and features
  const scopes = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages';

  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
}

// ─── Component ───

export const SocialAccounts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  // ─── Fetch Accounts ───

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('platform', { ascending: true })
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setAccounts((data as SocialAccount[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch social accounts:', err);
      setError(err.message || 'Failed to load connected accounts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  // ─── Actions ───

  const handleSetDefault = async (accountId: string, platform: string) => {
    setActionLoading((prev) => ({ ...prev, [accountId]: true }));
    try {
      // Clear other defaults for this platform
      const { error: clearError } = await supabase
        .from('social_accounts')
        .update({ is_default: false })
        .eq('user_id', user!.id)
        .eq('platform', platform);
      if (clearError) throw clearError;

      // Set this account as default
      const { error: setError } = await supabase
        .from('social_accounts')
        .update({ is_default: true })
        .eq('id', accountId);
      if (setError) throw setError;

      await fetchAccounts();
    } catch (err: any) {
      console.error('Failed to set default account:', err);
      setError(err.message || 'Failed to set default account');
    } finally {
      setActionLoading((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setActionLoading((prev) => ({ ...prev, [accountId]: true }));
    setConfirmDisconnect(null);
    try {
      const { error: deleteError } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', accountId);
      if (deleteError) throw deleteError;

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err: any) {
      console.error('Failed to disconnect account:', err);
      setError(err.message || 'Failed to disconnect account');
    } finally {
      setActionLoading((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    setActionLoading((prev) => ({ ...prev, [`refresh-${accountId}`]: true }));
    try {
      const { error: invokeError } = await supabase.functions.invoke('social-oauth-callback', {
        body: { action: 'refresh', account_id: accountId },
      });
      if (invokeError) throw invokeError;

      await fetchAccounts();
    } catch (err: any) {
      console.error('Failed to refresh token:', err);
      setError(err.message || 'Failed to refresh token');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`refresh-${accountId}`]: false }));
    }
  };

  const handleConnect = (platform: PlatformConfig) => {
    if (!platform.enabled) return;

    if (platform.id === 'instagram') {
      const oauthUrl = buildInstagramOAuthUrl();
      window.location.href = oauthUrl;
    }
    // TikTok and LinkedIn: placeholder for future phases
  };

  // ─── Derived Data ───

  const getAccountsByPlatform = (platformId: string) =>
    accounts.filter((a) => a.platform === platformId);

  // ─── Render ───

  if (loading) {
    return (
      <div className="w-full h-full bg-[#0B0E14]">
        <main className="p-4 sm:p-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Settings</span>
          </button>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0B0E14]">
      <main className="p-4 sm:p-6 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Settings</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-200">Connected Accounts</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your social media accounts for publishing and analytics
          </p>
        </div>

        {/* Global Error */}
        {error && (
          <div className="flex items-center gap-3 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Platform Sections */}
        <div className="space-y-6">
          {PLATFORMS.map((platform) => {
            const platformAccounts = getAccountsByPlatform(platform.id);
            const IconComponent = platform.icon;

            return (
              <div
                key={platform.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                {/* Platform Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-neutral-200">
                          {platform.name}
                        </h2>
                        {!platform.enabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {platformAccounts.length} account{platformAccounts.length !== 1 ? 's' : ''} connected
                      </p>
                    </div>
                  </div>

                  {/* Connect Button */}
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={!platform.enabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      platform.enabled
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Connect
                  </button>
                </div>

                {/* Account List */}
                <div className="px-5 py-3">
                  {platformAccounts.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                      <Shield className="w-4 h-4 mr-2 opacity-50" />
                      No {platform.name} accounts connected
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {platformAccounts.map((account) => {
                        const status = getAccountStatus(account);
                        const statusConfig = getStatusConfig(status);
                        const StatusIcon = statusConfig.icon;
                        const isLoading = actionLoading[account.id];
                        const isRefreshing = actionLoading[`refresh-${account.id}`];

                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 transition-colors group"
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {account.profile_picture_url ? (
                                <img
                                  src={account.profile_picture_url}
                                  alt={account.username}
                                  className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                                />
                              ) : (
                                <div
                                  className={`w-10 h-10 rounded-full ${platform.bgColor} ${platform.borderColor} border flex items-center justify-center`}
                                >
                                  <IconComponent className={`w-5 h-5 ${platform.textColor}`} />
                                </div>
                              )}
                            </div>

                            {/* Account Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-neutral-200 truncate">
                                  @{account.username}
                                </span>
                                {account.is_default && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Star className="w-2.5 h-2.5" />
                                    Default
                                  </span>
                                )}
                              </div>
                              {account.account_label && (
                                <p className="text-xs text-neutral-500 truncate mt-0.5">
                                  {account.account_label}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`inline-flex items-center gap-1 text-xs ${statusConfig.className}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                                  {statusConfig.label}
                                </span>
                                {account.token_expires_at && (
                                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                    <Clock className="w-3 h-3" />
                                    Expires {formatExpiryDate(account.token_expires_at)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Default Toggle */}
                            {!account.is_default && (
                              <button
                                onClick={() => handleSetDefault(account.id, account.platform)}
                                disabled={isLoading}
                                title="Set as default"
                                className="p-2 rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <StarOff className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Actions Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpen(menuOpen === account.id ? null : account.id);
                                }}
                                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {menuOpen === account.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-10 py-1">
                                  {status === 'expired' && (
                                    <button
                                      onClick={() => {
                                        setMenuOpen(null);
                                        handleRefreshToken(account.id);
                                      }}
                                      disabled={isRefreshing}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
                                    >
                                      {isRefreshing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4" />
                                      )}
                                      Refresh Token
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setMenuOpen(null);
                                      window.open(
                                        platform.id === 'instagram'
                                          ? `https://www.instagram.com/${account.username}/`
                                          : '#',
                                        '_blank'
                                      );
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View Profile
                                  </button>
                                  <div className="border-t border-neutral-700 my-1" />
                                  <button
                                    onClick={() => {
                                      setMenuOpen(null);
                                      setConfirmDisconnect(account.id);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Disconnect
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-3 mt-8 p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-xs">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Your access tokens are encrypted and stored securely. We only request the minimum
            permissions needed for publishing and analytics. You can disconnect any account at any
            time.
          </p>
        </div>
      </main>

      {/* Disconnect Confirmation Dialog */}
      {confirmDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-semibold text-neutral-200 mb-2">Disconnect Account</h3>
            <p className="text-sm text-neutral-400 mb-6">
              Are you sure you want to disconnect this account? Scheduled posts for this account
              will be cancelled and analytics data will no longer sync.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDisconnect(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(confirmDisconnect)}
                disabled={actionLoading[confirmDisconnect]}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {actionLoading[confirmDisconnect] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
