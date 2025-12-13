import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface PaymentModalProps {
  amount: number;
  tokens: number;
  paymentMethod: string;
  onClose: () => void;
  onComplete: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  tokens,
  paymentMethod,
  onClose,
  onComplete,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"payment" | "success">("payment");
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [installment, setInstallment] = useState("6");

  const handlePayment = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from("token_purchases").insert({
        user_id: user.id,
        tokens: tokens,
        amount: amount,
        payment_method: paymentMethod,
        status: "completed",
      });

      if (error) throw error;

      const { data: currentTokens } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentTokens) {
        await supabase
          .from("user_tokens")
          .update({ balance: currentTokens.balance + tokens })
          .eq("user_id", user.id);
      } else {
        await supabase.from("user_tokens").insert({
          user_id: user.id,
          balance: tokens,
        });
      }

      setTimeout(() => {
        setStep("success");
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Payment error:", error);
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  if (step === "success") {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1a24] rounded-3xl p-8 max-w-md w-full text-center relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 text-[#9ca3af] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-6">
            <div className="relative inline-flex">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500 delay-150">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full animate-ping" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-purple-500 rounded-full animate-ping delay-75" />
              <div className="absolute -top-3 left-1/2 w-4 h-4 bg-yellow-500 rounded-full animate-ping delay-150" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            The payment has been successfully completed.
          </h2>

          <p className="text-[#9ca3af] mb-2">
            Your {tokens} tokens have been added to your account.
          </p>

          <p className="text-sm text-[#9ca3af] mb-8">
            You can now use your tokens to access premium features.
          </p>

          <Button
            onClick={handleComplete}
            className="w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] rounded-3xl max-w-md w-full relative animate-in fade-in zoom-in duration-300">
        <div className="bg-[#2b2b38] px-6 py-4 rounded-t-3xl flex items-center justify-between border-b border-[#4e5562]">
          <h3 className="text-lg font-semibold text-white">Sample store</h3>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-[#2b2b38] rounded-xl">
            <div>
              <p className="text-sm text-[#9ca3af] mb-1">Total</p>
              <p className="text-2xl font-bold text-white">${amount}</p>
              <p className="text-xs text-[#9ca3af] mt-1">Order ID #ccutOrder-102</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#9ca3af]">Pay within</p>
              <p className="text-lg font-semibold text-[#7c3aed]">23:59:30</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Credit/debit card</h4>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#9ca3af] mb-2 block">Card number</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="4811 1111 1111 1114"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0a0a12] border border-[#4e5562] rounded-xl text-white placeholder:text-[#9ca3af]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-[#7c3aed] font-semibold">VISA</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-2 block">Expiration date</label>
                  <Input
                    type="text"
                    placeholder="12/24"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0a0a12] border border-[#4e5562] rounded-xl text-white placeholder:text-[#9ca3af]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-2 block">CVV</label>
                  <Input
                    type="text"
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0a0a12] border border-[#4e5562] rounded-xl text-white placeholder:text-[#9ca3af]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[#9ca3af] mb-2 block">Choose installment</label>
                <select
                  value={installment}
                  onChange={(e) => setInstallment(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0a0a12] border border-[#4e5562] rounded-xl text-white appearance-none cursor-pointer"
                >
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-3 border-t border-[#2b2b38]">
            <p className="text-xs text-[#9ca3af]">Secure payments by Midtrans</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-5 bg-[#2b2b38] rounded flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">VISA</span>
              </div>
              <div className="w-8 h-5 bg-[#2b2b38] rounded flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">MC</span>
              </div>
              <div className="w-8 h-5 bg-[#2b2b38] rounded flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">JCB</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {loading ? "Processing..." : "Bayar Sekarang"}
          </Button>
        </div>
      </div>
    </div>
  );
};
