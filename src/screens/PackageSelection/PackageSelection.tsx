import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const packages = [
  {
    id: "free",
    name: "Free",
    description: "Access the perfect for basic exploration.",
    price: "$0",
    priceValue: 0,
    features: [
      "Free 365 Token",
      "Enterprise 1 Month",
      "3 Inquery Daily Adv"
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9 9H2l6 4.5L5 21l7-5 7 5-3-7.5L22 9h-7z" />
      </svg>
    ),
    buttonText: "Start Free",
    buttonClass: "bg-white text-[#0a0a12] hover:bg-gray-100"
  },
  {
    id: "premium",
    name: "Premium",
    description: "More features for maximum productivity.",
    price: "$20",
    priceValue: 20,
    period: "/month",
    features: [
      "Unlimited Revenue",
      "Unlimited Adfory Copy",
      "Insights",
      "Web Mb"
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9 9H2l6 4.5L5 21l7-5 7 5-3-7.5L22 9h-7z" />
      </svg>
    ),
    buttonText: "Choose Premium",
    buttonClass: "bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
    highlighted: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For developers who large teams and project needs.",
    price: "$100",
    priceValue: 100,
    period: "/month",
    features: [
      "All Premium Features",
      "Custom Limit",
      "All of User",
      "Priority Support"
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
      </svg>
    ),
    buttonText: "Choose Enterprise",
    buttonClass: "bg-white text-[#0a0a12] hover:bg-gray-100"
  }
];

export const PackageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePackageSelection = async (packageId: string, packageName: string, priceValue: number) => {
    if (!user) {
      setError("You must be logged in to select a package");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          package_id: packageId,
          package_name: packageName,
          price: priceValue,
          status: "active",
          started_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (upsertError) {
        throw upsertError;
      }

      navigate("/settings/plan-billing");
    } catch (err: any) {
      console.error("Error selecting package:", err);
      setError(err.message || "Failed to select package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#7c3aed]/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose the Package{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#06b6d4]">
              That Suits Your Needs
            </span>
          </h1>
          <p className="text-xl text-white/70">
            Start for free, upgrade whenever you're ready to grow.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-500/10 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-[#1a1a24]/50 backdrop-blur-xl rounded-3xl p-8 transition-all duration-300 ${
                pkg.highlighted
                  ? "border-2 border-[#7c3aed] shadow-2xl shadow-[#7c3aed]/20 scale-105"
                  : "border border-[#2b2b38] hover:border-[#7c3aed]/50"
              }`}
            >
              {pkg.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white px-6 py-1.5 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  pkg.highlighted
                    ? "bg-gradient-to-br from-[#7c3aed] to-[#ec4899]"
                    : "bg-[#2b2b38]"
                } text-white`}>
                  {pkg.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                  <p className="text-sm text-white/60">{pkg.description}</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{pkg.price}</span>
                  {pkg.period && (
                    <span className="text-white/60 text-lg">{pkg.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        pkg.highlighted ? "text-[#7c3aed]" : "text-[#06b6d4]"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handlePackageSelection(pkg.id, pkg.name, pkg.priceValue)}
                disabled={loading}
                className={`w-full h-12 ${pkg.buttonClass} font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "Processing..." : pkg.buttonText}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-white/60 text-sm">
            All plans include 24/7 customer support and regular updates
          </p>
        </div>
      </div>
    </div>
  );
};
