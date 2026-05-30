import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, successResponse, errorResponse } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CheckoutRequest {
  priceType: "subscription" | "topup";
  planId: string; // starter, pro, business, spark, blaze, inferno
  billingCycle?: "monthly" | "yearly"; // for subscriptions
  successUrl?: string;
  cancelUrl?: string;
}

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

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { priceType, planId, billingCycle, successUrl, cancelUrl } = body;

    // Validate request
    if (!priceType || !planId) {
      return errorResponse("BAD_REQUEST", "priceType and planId are required", 400);
    }

    if (priceType === "subscription" && !billingCycle) {
      return errorResponse("BAD_REQUEST", "billingCycle is required for subscriptions", 400);
    }

    // For top-up, check if user has active subscription (subscriber only feature)
    if (priceType === "topup") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .single();

      if (!subscription || subscription.plan_id === "free" || subscription.status !== "active") {
        return errorResponse("FORBIDDEN", "Top-up is only available for active subscribers", 403);
      }
    }

    // Build query for stripe_prices
    let query = supabase
      .from("stripe_prices")
      .select("*")
      .eq("plan_id", planId)
      .eq("price_type", priceType)
      .eq("is_active", true);

    // Add billing_cycle filter only for subscriptions
    if (priceType === "subscription") {
      query = query.eq("billing_cycle", billingCycle);
    } else {
      query = query.is("billing_cycle", null);
    }

    const { data: priceData, error: priceError } = await query.single();

    if (priceError || !priceData) {
      console.error("Price query error:", priceError);
      return errorResponse("NOT_FOUND", `Price not found for ${planId} ${priceType}`, 404);
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    // Check if user already has a subscription with customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update subscription with customer ID
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customer.id })
        .eq("user_id", user.id);
    }

    // Build checkout session params
    const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceData.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: priceType === "subscription" ? "subscription" : "payment",
      success_url: successUrl || `${baseUrl}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        price_type: priceType,
        billing_cycle: billingCycle || "one_time",
        sparks_amount: priceData.sparks_amount.toString(),
      },
      // For Indonesian users - allow multiple payment methods
      payment_method_types: ["card"],
      currency: "idr",
      locale: "id",
    };

    // Add subscription-specific params
    if (priceType === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle!,
          sparks_amount: priceData.sparks_amount.toString(),
        },
      };

      // Allow subscription upgrade/downgrade
      sessionParams.allow_promotion_codes = true;
    }

    // For top-up, create order record first
    if (priceType === "topup") {
      const { error: orderError } = await supabase
        .from("topup_orders")
        .insert({
          user_id: user.id,
          package_id: planId,
          sparks_amount: priceData.sparks_amount,
          price_idr: priceData.amount,
          status: "pending",
        });

      if (orderError) {
        console.error("Failed to create topup order:", orderError);
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update topup order with session ID
    if (priceType === "topup" && session.id) {
      await supabase
        .from("topup_orders")
        .update({ stripe_checkout_session_id: session.id })
        .eq("user_id", user.id)
        .eq("status", "pending")
        .is("stripe_checkout_session_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return successResponse({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return errorResponse(
      "CHECKOUT_ERROR",
      error instanceof Error ? error.message : "Failed to create checkout session",
      500
    );
  }
});
