import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, successResponse, errorResponse } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Missing authorization header", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid token", 401);
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError && subError.code !== "PGRST116") {
      console.error("Subscription query error:", subError);
    }

    // Get sparks balance
    const { data: sparksBalance, error: sparksError } = await supabase
      .from("sparks_balance")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (sparksError && sparksError.code !== "PGRST116") {
      console.error("Sparks balance query error:", sparksError);
    }

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from("sparks_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Plan features mapping
    const planFeatures: Record<string, {
      scriptLab: boolean;
      visualForge: boolean;
      videoGenie: boolean;
      viralScriptGen: boolean;
      autoPosting: boolean;
      watermark: boolean;
      prioritySupport: boolean;
    }> = {
      free: {
        scriptLab: false,
        visualForge: false,
        videoGenie: false,
        viralScriptGen: true,
        autoPosting: false,
        watermark: true,
        prioritySupport: false,
      },
      starter: {
        scriptLab: true,
        visualForge: true,
        videoGenie: true,
        viralScriptGen: true,
        autoPosting: false,
        watermark: false,
        prioritySupport: false,
      },
      pro: {
        scriptLab: true,
        visualForge: true,
        videoGenie: true,
        viralScriptGen: true,
        autoPosting: false,
        watermark: false,
        prioritySupport: true,
      },
      business: {
        scriptLab: true,
        visualForge: true,
        videoGenie: true,
        viralScriptGen: true,
        autoPosting: true,
        watermark: false,
        prioritySupport: true,
      },
    };

    const planId = subscription?.plan_id || "free";
    const features = planFeatures[planId] || planFeatures.free;

    return successResponse({
      subscription: {
        planId: subscription?.plan_id || "free",
        billingCycle: subscription?.billing_cycle || "monthly",
        status: subscription?.status || "active",
        currentPeriodEnd: subscription?.current_period_end,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
        hasStripeSubscription: !!subscription?.stripe_subscription_id,
      },
      sparks: {
        balance: sparksBalance?.balance || 0,
        monthlyAllocation: sparksBalance?.monthly_allocation || 0,
        lifetimeEarned: sparksBalance?.lifetime_earned || 0,
        lifetimeSpent: sparksBalance?.lifetime_spent || 0,
        lastAllocationDate: sparksBalance?.allocation_date,
      },
      features,
      recentTransactions: recentTransactions || [],
    });

  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse(
      "SUBSCRIPTION_ERROR",
      error instanceof Error ? error.message : "Failed to get subscription",
      500
    );
  }
});
