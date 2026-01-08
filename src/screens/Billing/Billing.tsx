import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Plus,
  Sparkles
} from 'lucide-react';
import { useSubscription, SPARKS_COST } from '../../hooks/useSubscription';
import { useLanguage } from '../../contexts/LanguageContext';
import { FadeIn } from '../../components/animations';
import { formatPriceWithSymbol, getPrice, basePricesIDR, sparksPerTier } from '../../lib/currency';

export const Billing: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    subscription, 
    sparks, 
    features, 
    recentTransactions, 
    loading, 
    error,
    refetch,
    createCheckout,
    openCustomerPortal 
  } = useSubscription();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success param
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      refetch();
      // Clear param after showing
      const timer = setTimeout(() => {
        setShowSuccess(false);
        navigate('/app/billing', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refetch, navigate]);

  const handleUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setCheckoutLoading(true);
      const { url } = await createCheckout('subscription', planId, billingCycle);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleTopUp = async (packageId: string) => {
    try {
      setCheckoutLoading(true);
      const { url } = await createCheckout('topup', packageId);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Top-up error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { url } = await openCustomerPortal();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanDisplayName = (planId: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      pro: 'Pro',
      business: 'Business',
    };
    return names[planId] || planId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'past_due': return 'text-amber-500 bg-amber-500/10';
      case 'canceled': return 'text-red-500 bg-red-500/10';
      default: return 'text-text-secondary bg-surface';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Success Banner */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-500 font-medium">
              Payment successful! Your subscription has been updated.
            </p>
          </motion.div>
        )}

        {/* Header */}
        <FadeIn direction="up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                Billing & Subscription
              </h1>
              <p className="text-text-secondary mt-1">
                Manage your plan, sparks, and payment methods
              </p>
            </div>
            {subscription?.hasStripeSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border-default hover:border-primary/50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>{portalLoading ? 'Loading...' : 'Manage Subscription'}</span>
              </button>
            )}
          </div>
        </FadeIn>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <FadeIn direction="up" delay={0.1}>
            <div className="bg-card rounded-2xl border border-border-default p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">Current Plan</h2>
                  <p className="text-xs text-text-muted">Your subscription details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Plan</span>
                  <span className="font-semibold text-text-primary">
                    {getPlanDisplayName(subscription?.planId || 'free')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription?.status || 'active')}`}>
                    {subscription?.status || 'active'}
                  </span>
                </div>

                {subscription?.planId !== 'free' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Billing</span>
                      <span className="text-text-primary capitalize">
                        {subscription?.billingCycle}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Renews</span>
                      <span className="text-text-primary">
                        {formatDate(subscription?.currentPeriodEnd || null)}
                      </span>
                    </div>

                    {subscription?.cancelAtPeriodEnd && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Cancels at period end</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {subscription?.planId === 'free' && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full mt-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition-colors"
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Sparks Balance Card */}
          <FadeIn direction="up" delay={0.2}>
            <div className="bg-card rounded-2xl border border-border-default p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">Sparks Balance</h2>
                  <p className="text-xs text-text-muted">Your available credits</p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-4xl font-bold text-text-primary">
                  {(sparks?.balance || 0).toLocaleString()}
                </div>
                <div className="text-sm text-text-muted mt-1">⚡ Sparks available</div>
              </div>

              <div className="space-y-3 mt-4 pt-4 border-t border-border-default">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Monthly allocation</span>
                  <span className="text-text-primary">{(sparks?.monthlyAllocation || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Total earned</span>
                  <span className="text-green-500">+{(sparks?.lifetimeEarned || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Total spent</span>
                  <span className="text-red-400">-{(sparks?.lifetimeSpent || 0).toLocaleString()}</span>
                </div>
              </div>

              {subscription?.planId !== 'free' && (
                <button
                  onClick={() => navigate('/pricing#topup')}
                  disabled={checkoutLoading}
                  className="w-full mt-4 py-2.5 rounded-xl bg-surface border border-border-default hover:border-primary/50 text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buy More Sparks</span>
                </button>
              )}
            </div>
          </FadeIn>

          {/* Sparks Cost Reference */}
          <FadeIn direction="up" delay={0.3}>
            <div className="bg-card rounded-2xl border border-border-default p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">Sparks Usage</h2>
                  <p className="text-xs text-text-muted">Cost per action</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                  <span className="text-text-secondary">Full Video (Script Lab)</span>
                  <span className="font-semibold text-text-primary">{SPARKS_COST.fullPipeline} ⚡</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                  <span className="text-text-secondary">Single Image</span>
                  <span className="font-semibold text-text-primary">{SPARKS_COST.imageOnly} ⚡</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                  <span className="text-text-secondary">Single Video</span>
                  <span className="font-semibold text-text-primary">{SPARKS_COST.videoOnly} ⚡</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                  <span className="text-text-secondary">Viral Script Gen</span>
                  <span className="font-semibold text-text-primary">{SPARKS_COST.viralScript} ⚡</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Recent Transactions */}
        <FadeIn direction="up" delay={0.4}>
          <div className="bg-card rounded-2xl border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h2>
            
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-400/10'
                      }`}>
                        {tx.amount > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-xs text-text-muted">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ⚡
                      </p>
                      <p className="text-xs text-text-muted">
                        Balance: {tx.balance_after.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
};
