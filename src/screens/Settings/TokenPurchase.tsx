import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { PaymentModal } from "./PaymentModal";

const tokenPackages = [
  { id: "200", tokens: 200, price: 2 },
  { id: "500", tokens: 500, price: 5 },
  { id: "1000", tokens: 1000, price: 9 },
  { id: "1500", tokens: 1500, price: 13 },
  { id: "2000", tokens: 2000, price: 16 },
  { id: "3000", tokens: 3000, price: 22 },
  { id: "4000", tokens: 4000, price: 28 },
  { id: "5000", tokens: 5000, price: 32 },
];

const paymentMethods = [
  { id: "qris", name: "QRIS", icon: "💳" },
  { id: "dana", name: "DANA", icon: "💰" },
  { id: "gopay", name: "GoPay", icon: "🟢" },
  { id: "ovo", name: "OVO", icon: "🟣" },
  { id: "credit-card", name: "Credit Card", icon: "💳" },
  { id: "bank-transfer", name: "Transfer Bank", icon: "🏦" },
];

export const TokenPurchase: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<string>("500");
  const [selectedPayment, setSelectedPayment] = useState<string>("qris");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const selectedPackage = tokenPackages.find(pkg => pkg.id === selectedToken);
  const selectedMethod = paymentMethods.find(method => method.id === selectedPayment);

  const handlePayNow = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        <div className="space-y-6">
          <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Select Token Amount</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tokenPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedToken(pkg.id)}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    selectedToken === pkg.id
                      ? "border-[#7c3aed] bg-[#7c3aed]/10"
                      : "border-[#2b2b38] hover:border-[#4e5562]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-bold text-white">{pkg.tokens}</span>
                  </div>
                  <p className="text-sm text-white">${pkg.price}</p>

                  {selectedToken === pkg.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#7c3aed] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Payment Method</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedPayment === method.id
                      ? "border-[#7c3aed] bg-[#7c3aed]/10"
                      : "border-[#2b2b38] hover:border-[#4e5562]"
                  }`}
                >
                  <div className="relative">
                    <span className="text-2xl">{method.icon}</span>
                    {selectedPayment === method.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#7c3aed] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-white font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-6 h-fit sticky top-8">
          <h3 className="text-lg font-semibold text-white mb-6">Payment Summary</h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[#9ca3af]">Token {selectedPackage?.tokens}</span>
              <span className="text-white font-semibold">${selectedPackage?.price}</span>
            </div>

            <div className="border-t border-[#2b2b38] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[#9ca3af]">Payment Method</span>
                <span className="text-white font-semibold uppercase">{selectedMethod?.name}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayNow}
            className="w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl transition-all"
          >
            Pay Now
          </Button>
        </div>
      </div>

      {showPaymentModal && selectedPackage && selectedMethod && (
        <PaymentModal
          amount={selectedPackage.price}
          tokens={selectedPackage.tokens}
          paymentMethod={selectedMethod.name}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </>
  );
};
