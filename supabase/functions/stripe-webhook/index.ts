import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sparks allocation per plan
const SPARKS_PER_PLAN: Record<string, Record<string, number>> = {
  starter: { monthly: 1000, yearly: 13200 },
  pro: { monthly: 3000, yearly: 39600 },
  business: { monthly: 10000, yearly: 132000 },
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// Handler Functions
// ============================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const priceType = session.metadata?.price_type;
  const planId = session.metadata?.plan_id;
  const billingCycle = session.metadata?.billing_cycle;
  const sparksAmount = parseInt(session.metadata?.sparks_amount || "0");

  if (!userId) {
    console.error("No user_id in session metadata");
    return;
  }

  console.log(`Checkout complete for user ${userId}, type: ${priceType}, plan: ${planId}`);

  if (priceType === "subscription") {
    // Handle subscription checkout
    await handleSubscriptionCheckout(session, userId, planId!, billingCycle!);
  } else if (priceType === "topup") {
    // Handle top-up checkout
    await handleTopupCheckout(session, userId, planId!, sparksAmount);
  }

  // Record payment
  await supabase.from("payment_history").insert({
    user_id: userId,
    stripe_payment_intent_id: session.payment_intent as string,
    amount: session.amount_total || 0,
    currency: session.currency || "idr",
    payment_type: priceType,
    status: "succeeded",
    reference_type: priceType === "subscription" ? "subscription" : "topup_order",
    description: `${priceType === "subscription" ? "Subscription" : "Top-up"}: ${planId}`,
  });
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
  planId: string,
  billingCycle: string
) {
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  
  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  
  // Calculate sparks to allocate
  const sparksAmount = SPARKS_PER_PLAN[planId]?.[billingCycle] || 0;

  // Update subscription record
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: subscription.items.data[0]?.price?.id,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: "active",
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("user_id", userId);

  if (subError) {
    console.error("Failed to update subscription:", subError);
  }

  // Add sparks to user balance
  if (sparksAmount > 0) {
    const { error: sparksError } = await supabase.rpc("add_sparks", {
      p_user_id: userId,
      p_amount: sparksAmount,
      p_transaction_type: "subscription",
      p_reference_type: "subscription",
      p_reference_id: stripeSubscriptionId,
      p_description: `${planId} ${billingCycle} subscription - ${sparksAmount} Sparks`,
    });

    if (sparksError) {
      console.error("Failed to add sparks:", sparksError);
    }

    // Update monthly allocation
    await supabase
      .from("sparks_balance")
      .update({
        monthly_allocation: billingCycle === "monthly" ? sparksAmount : Math.round(sparksAmount / 12),
        allocation_date: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  console.log(`Subscription activated for user ${userId}: ${planId} ${billingCycle}, ${sparksAmount} Sparks`);
}

async function handleTopupCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
  packageId: string,
  sparksAmount: number
) {
  // Update topup order status
  const { error: orderError } = await supabase
    .from("topup_orders")
    .update({
      status: "completed",
      stripe_payment_intent_id: session.payment_intent as string,
      completed_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);

  if (orderError) {
    console.error("Failed to update topup order:", orderError);
  }

  // Add sparks to user balance
  if (sparksAmount > 0) {
    const { error: sparksError } = await supabase.rpc("add_sparks", {
      p_user_id: userId,
      p_amount: sparksAmount,
      p_transaction_type: "topup",
      p_reference_type: "topup_order",
      p_reference_id: session.id,
      p_description: `Top-up ${packageId}: +${sparksAmount} Sparks`,
    });

    if (sparksError) {
      console.error("Failed to add sparks:", sparksError);
    }
  }

  console.log(`Top-up completed for user ${userId}: ${packageId}, +${sparksAmount} Sparks`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only process subscription renewals (not first payment)
  if (invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  const stripeCustomerId = invoice.customer as string;
  const stripeSubscriptionId = invoice.subscription as string;

  // Get user from subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("user_id, plan_id, billing_cycle")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (!subscription) {
    console.error("Subscription not found for renewal:", stripeSubscriptionId);
    return;
  }

  const { user_id, plan_id, billing_cycle } = subscription;
  const sparksAmount = SPARKS_PER_PLAN[plan_id]?.[billing_cycle] || 0;

  // Add monthly sparks allocation
  if (sparksAmount > 0) {
    const monthlyAllocation = billing_cycle === "monthly" ? sparksAmount : Math.round(sparksAmount / 12);
    
    const { error: sparksError } = await supabase.rpc("add_sparks", {
      p_user_id: user_id,
      p_amount: monthlyAllocation,
      p_transaction_type: "subscription",
      p_reference_type: "subscription",
      p_reference_id: invoice.id,
      p_description: `Monthly renewal: +${monthlyAllocation} Sparks`,
    });

    if (sparksError) {
      console.error("Failed to add renewal sparks:", sparksError);
    }

    // Update allocation date
    await supabase
      .from("sparks_balance")
      .update({ allocation_date: new Date().toISOString() })
      .eq("user_id", user_id);
  }

  // Record payment
  await supabase.from("payment_history").insert({
    user_id: user_id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    payment_type: "subscription",
    status: "succeeded",
    reference_type: "subscription",
    receipt_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
    description: `Subscription renewal: ${plan_id}`,
  });

  console.log(`Subscription renewal for user ${user_id}: +${sparksAmount} Sparks`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  // Get current subscription from DB
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (!existingSub) {
    console.log("Subscription not found in DB:", stripeSubscriptionId);
    return;
  }

  // Get plan from metadata or price
  const planId = subscription.metadata?.plan_id || existingSub.plan_id;
  const billingCycle = subscription.metadata?.billing_cycle || existingSub.billing_cycle;

  // Update subscription
  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status === "active" ? "active" : subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString() 
        : null,
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  console.log(`Subscription updated: ${stripeSubscriptionId}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  // Get subscription from DB
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (!existingSub) {
    console.log("Subscription not found for deletion:", stripeSubscriptionId);
    return;
  }

  // Downgrade to free plan
  await supabase
    .from("subscriptions")
    .update({
      plan_id: "free",
      billing_cycle: "monthly",
      status: "canceled",
      stripe_subscription_id: null,
      stripe_price_id: null,
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  // Reset monthly allocation to free tier
  await supabase
    .from("sparks_balance")
    .update({ monthly_allocation: 30 })
    .eq("user_id", existingSub.user_id);

  console.log(`Subscription canceled, downgraded to free: ${existingSub.user_id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;

  // Update subscription status
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  // Record failed payment
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (subscription) {
    await supabase.from("payment_history").insert({
      user_id: subscription.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      payment_type: "subscription",
      status: "failed",
      description: "Payment failed",
    });
  }

  console.log(`Payment failed for subscription: ${stripeSubscriptionId}`);
}
