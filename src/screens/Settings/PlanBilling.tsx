import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { SettingsLayout } from "../../components/layout/SettingsLayout";
import { Button } from "../../components/ui/button";
import { TokenPurchase } from "./TokenPurchase";

export const PlanBilling = (): JSX.Element => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"plan" | "token">("plan");

  const plans = [
    {
      id: "free",
      name: "Free",
      description: language === 'id' ? "Mulai gratis, cocok untuk eksplorasi dasar." : "Start for free, perfect for basic exploration.",
      price: 0,
      features: [
        language === 'id' ? "Gratis 500 Token" : "Free 500 Token",
        language === 'id' ? "5 Generate /bulan" : "5 Generate /month",
        language === 'id' ? "3 Galaxy Copy /hari" : "3 Galaxy Copy /day"
      ],
      icon: "✨",
      buttonText: language === 'id' ? "Pilih Paket" : "Choose Plan",
      buttonStyle: "bg-white text-[#0a0a12] hover:bg-gray-100"
    },
    {
      id: "premium",
      name: "Premium",
      description: language === 'id' ? "Fitur lebih untuk produktivitas maksimal." : "More features for maximum productivity.",
      price: 20,
      features: [
        language === 'id' ? "Generate Tanpa Batas" : "Unlimited Generate",
        language === 'id' ? "Galaxy Copy Tanpa Batas" : "Unlimited Galaxy Copy",
        "Insights",
        "Collab"
      ],
      icon: "⚡",
      buttonText: language === 'id' ? "Paket Saat Ini" : "Current Plan",
      buttonStyle: "bg-[#2a2a38] text-white cursor-not-allowed",
      isCurrent: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: language === 'id' ? "Solusi fleksibel untuk tim besar dan kebutuhan khusus." : "Flexible solutions for large teams and specific needs.",
      price: 100,
      features: [
        language === 'id' ? "Semua Fitur Premium" : "All Premium Features",
        language === 'id' ? "Multi Pengguna" : "Multi User",
        language === 'id' ? "Dukungan Prioritas" : "Priority Support"
      ],
      icon: "🚀",
      buttonText: language === 'id' ? "Pilih Paket" : "Choose Plan",
      buttonStyle: "bg-white text-[#0a0a12] hover:bg-gray-100"
    }
  ];

  const invoices = [
    {
      id: "Invoice_Okt_2025",
      total: "$20.00",
      invoiceDate: "12 Oct 2025",
      expiryDate: "12 Oct 2025",
      status: language === 'id' ? "Menunggu Pembayaran" : "Waiting Payment",
      statusColor: "text-yellow-400"
    },
    {
      id: "Invoice_Sep_2025",
      total: "$20.00",
      invoiceDate: "12 Sep 2025",
      expiryDate: "12 Sep 2025",
      status: language === 'id' ? "Lunas" : "Paid in full",
      statusColor: "text-green-400"
    }
  ];

  const filteredInvoices = invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SettingsLayout title={t.settings.tabs.planBilling}>
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-8 border-b border-[#2b2b38] overflow-x-auto">
        <button
          onClick={() => setActiveTab("plan")}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "plan" ? "text-white" : "text-[#9ca3af] hover:text-white"
          }`}
        >
          {t.settings.tabs.planBilling}
          {activeTab === "plan" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />}
        </button>
        <button
          onClick={() => setActiveTab("token")}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "token" ? "text-white" : "text-[#9ca3af] hover:text-white"
          }`}
        >
          Token
          {activeTab === "token" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />}
        </button>
      </div>

      {activeTab === "token" ? (
        <TokenPurchase />
      ) : (
        <>
          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-4 sm:p-6 hover:border-[#7c3aed] transition-all"
              >
                <div className="text-3xl sm:text-4xl mb-4">{plan.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-[#9ca3af] text-sm mb-4 sm:mb-6">{plan.description}</p>
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white">${plan.price}</span>
                    {plan.price > 0 && <span className="text-[#9ca3af] text-sm">/{language === 'id' ? 'bulan' : 'month'}</span>}
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-[#9ca3af] text-sm">
                      <svg className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button disabled={plan.isCurrent} className={`w-full h-10 sm:h-12 font-medium text-sm sm:text-base ${plan.buttonStyle}`}>
                  {plan.buttonText}
                </Button>
              </div>
            ))}
          </div>

          {/* Current Plan */}
          <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Paket Saat Ini' : 'Current Plan'}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[#9ca3af] text-sm mb-1">Premium</p>
                <p className="text-[#9ca3af] text-xs">
                  {language === 'id' ? 'Langganan bulanan aktif hingga 16 Oktober 2025' : 'Monthly subscription plan active until October 16, 2025'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                  {language === 'id' ? 'Menunggu Pembayaran' : 'Waiting Payment'}
                </span>
                <div className="text-right">
                  <p className="text-white font-semibold">$20.00</p>
                  <p className="text-[#9ca3af] text-xs">/{language === 'id' ? 'bulan' : 'month'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 pt-4 border-t border-[#2b2b38]">
              <Button className="px-6 py-2 bg-[#2a2a38] text-white hover:bg-[#3a3a48] h-10 text-sm">
                {language === 'id' ? 'Batalkan Langganan' : 'Cancel Subscription'}
              </Button>
              <Button className="px-6 py-2 bg-[#7c3aed] text-white hover:bg-[#6d28d9] h-10 text-sm">
                {language === 'id' ? 'Bayar Sekarang' : 'Pay Now'}
              </Button>
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white">{language === 'id' ? 'Faktur' : 'Invoices'}</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder={language === 'id' ? 'Cari Faktur' : 'Search Invoice'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 pl-10 bg-[#0a0a12] border border-[#2b2b38] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#7c3aed] text-sm"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#2b2b38]">
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3 px-4 sm:px-0">{language === 'id' ? 'Faktur' : 'Invoice'}</th>
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3">Total</th>
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3">{language === 'id' ? 'Tanggal Faktur' : 'Invoice Date'}</th>
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3">{language === 'id' ? 'Tanggal Jatuh Tempo' : 'Expiry Date'}</th>
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3">Status</th>
                    <th className="text-left text-[#9ca3af] text-sm font-medium pb-3 px-4 sm:px-0"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-[#2b2b38]">
                      <td className="py-4 text-white text-sm px-4 sm:px-0">{invoice.id}</td>
                      <td className="py-4 text-white text-sm">{invoice.total}</td>
                      <td className="py-4 text-[#9ca3af] text-sm">{invoice.invoiceDate}</td>
                      <td className="py-4 text-[#9ca3af] text-sm">{invoice.expiryDate}</td>
                      <td className="py-4"><span className={`text-sm font-medium ${invoice.statusColor}`}>{invoice.status}</span></td>
                      <td className="py-4 px-4 sm:px-0">
                        <button className="text-[#9ca3af] hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </SettingsLayout>
  );
};
