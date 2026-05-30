import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Subscription {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | 'incomplete';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeSubscription: boolean;
}

export interface SparksBalance {
  balance: number;
  monthlyAllocation: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastAllocationDate: string | null;
}

export interface PlanFeatures {
  scriptLab: boolean;
  visualForge: boolean;
  videoGenie: boolean;
  viralScriptGen: boolean;
  autoPosting: boolean;
  watermark: boolean;
  prioritySupport: boolean;
}

export interface SparksTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

interface SubscriptionData {
  subscription: Subscription;
  sparks: SparksBalance;
  features: PlanFeatures;
  recentTransactions: SparksTransaction[];
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await supabase.functions.invoke('get-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        throw new Error(response.data?.error?.message || 'Failed to fetch subscription');
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Create checkout session
  const createCheckout = useCallback(async (
    priceType: 'subscription' | 'topup',
    planId: string,
    billingCycle?: 'monthly' | 'yearly',
    successUrl?: string,
    cancelUrl?: string
  ) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('create-checkout', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        priceType,
        planId,
        billingCycle,
        successUrl,
        cancelUrl,
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to create checkout');
    }

    return response.data.data;
  }, [session?.access_token]);

  // Open customer portal
  const openCustomerPortal = useCallback(async (returnUrl?: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { returnUrl },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Failed to open portal');
    }

    return response.data.data;
  }, [session?.access_token]);

  // Check if user has access to a feature
  const hasFeatureAccess = useCallback((feature: keyof PlanFeatures): boolean => {
    if (!data?.features) return false;
    return data.features[feature];
  }, [data?.features]);

  // Check if user has enough sparks
  const hasSparks = useCallback((amount: number): boolean => {
    if (!data?.sparks) return false;
    return data.sparks.balance >= amount;
  }, [data?.sparks]);

  // Check if user can use a tool
  const canUseTool = useCallback((
    tool: 'scriptLab' | 'visualForge' | 'videoGenie' | 'viralScriptGen',
    sparksCost: number
  ): { allowed: boolean; reason?: string } => {
    if (!data) {
      return { allowed: false, reason: 'Loading subscription data...' };
    }

    // Check feature access
    if (!data.features[tool]) {
      return { 
        allowed: false, 
        reason: `${tool} is not available on your current plan. Please upgrade to access this feature.` 
      };
    }

    // Check sparks balance
    if (data.sparks.balance < sparksCost) {
      return { 
        allowed: false, 
        reason: `Insufficient Sparks. You need ${sparksCost} Sparks but only have ${data.sparks.balance}.` 
      };
    }

    return { allowed: true };
  }, [data]);

  return {
    subscription: data?.subscription || null,
    sparks: data?.sparks || null,
    features: data?.features || null,
    recentTransactions: data?.recentTransactions || [],
    loading,
    error,
    refetch: fetchSubscription,
    createCheckout,
    openCustomerPortal,
    hasFeatureAccess,
    hasSparks,
    canUseTool,
  };
}

// Sparks cost constants
export const SPARKS_COST = {
  fullPipeline: 100,  // Script Lab
  imageOnly: 10,      // Visual Forge
  videoOnly: 15,      // Video Genie
  viralScript: 5,     // Viral Script Gen
} as const;
