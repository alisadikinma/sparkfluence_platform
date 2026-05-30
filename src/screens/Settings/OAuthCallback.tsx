import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * OAuthCallback — handles redirect from Meta OAuth flow.
 * Route: /settings/social-accounts/callback?code=XXX
 * Exchanges the authorization code for a long-lived token via the
 * social-oauth-callback edge function, then redirects to social accounts page.
 */
export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    if (error || !code) {
      setStatus('error');
      setErrorMsg(errorReason || error || 'No authorization code received from Instagram.');
      return;
    }

    exchangeCode(code);
  }, [searchParams]);

  const exchangeCode = async (code: string) => {
    try {
      const redirectUri = `${import.meta.env.VITE_OAUTH_REDIRECT_ORIGIN || 'https://sparkfluence.studio'}/settings/social-accounts/callback`;

      const { data, error } = await supabase.functions.invoke('social-oauth-callback', {
        body: {
          action: 'exchange_code',
          platform: 'instagram',
          code,
          redirect_uri: redirectUri,
        },
      });

      // supabase.functions.invoke puts non-2xx response body in error.context (a Response object)
      let errorBody: any = null;
      if (error && (error as any).context) {
        try {
          errorBody = await (error as any).context.json();
        } catch { /* ignore parse errors */ }
      }

      if (error || !data?.success) {
        const msg = errorBody?.error?.message || data?.error?.message || error?.message || 'Failed to connect Instagram account.';
        setStatus('error');
        setErrorMsg(msg);
        return;
      }

      setStatus('success');
      // Redirect after brief success message
      setTimeout(() => {
        navigate('/settings/social-accounts', { replace: true });
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Unexpected error during OAuth exchange.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-200 mb-2">Connecting Instagram...</h2>
            <p className="text-sm text-neutral-500">Exchanging authorization code for access token.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-200 mb-2">Instagram Connected!</h2>
            <p className="text-sm text-neutral-500">Redirecting to Social Accounts{'\u2026'}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-200 mb-2">Connection Failed</h2>
            <p className="text-sm text-red-400/80 mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate('/settings/social-accounts', { replace: true })}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Back to Social Accounts
            </button>
          </>
        )}
      </div>
    </div>
  );
};
