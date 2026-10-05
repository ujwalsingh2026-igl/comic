'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { CheckoutModal } from '@/components/checkout-modal';
import { Check, Sparkles, Shield, Zap, BookOpen, Headphones } from 'lucide-react';

export default function PricingPage() {
  const { user, openLoginModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY_PREMIUM' | 'YEARLY_PREMIUM' | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const handleSelectPlan = (plan: 'MONTHLY_PREMIUM' | 'YEARLY_PREMIUM') => {
    if (!user) {
      openLoginModal();
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Flexible Reading Plans</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Unlock the Entire Story Universe
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Enjoy unlimited access to thousands of trending comics, novels, and audiobooks with verified server-side entitlements and zero intrusive ads.
        </p>
      </div>

      {checkoutSuccess && (
        <div className="max-w-md mx-auto p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-2xl text-xs text-center font-semibold">
          🎉 Congratulations! Your premium subscription is now active!
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
        {/* Free Tier */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white">Free Explorer</h3>
              <p className="text-xs text-slate-400 mt-1">Get started with our vast collection of free chapters.</p>
            </div>
            <div className="text-3xl font-black text-white">
              ₹0 <span className="text-xs font-normal text-slate-500">/ forever</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Read all Free comic chapters</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Read all Free novel chapters</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stream introductory audiobook samples</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sync reading progress & bookmarks</span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold cursor-default"
          >
            Included by Default
          </button>
        </div>

        {/* Monthly Premium */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-indigo-500/80 shadow-2xl shadow-indigo-500/10 flex flex-col justify-between space-y-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow">
            Most Popular
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white">Monthly Premium</h3>
              <p className="text-xs text-slate-400 mt-1">Complete freedom with recurring monthly billing.</p>
            </div>
            <div className="text-3xl font-black text-white">
              ₹299 <span className="text-xs font-normal text-slate-500">/ month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-bold text-white">Unlimited access to all Premium Comics</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-bold text-white">Unlimited access to all Premium Novels</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Full audiobook chapter streaming</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>100% Ad-free reading experience</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Cancel anytime without penalty</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('MONTHLY_PREMIUM')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Upgrade to Monthly (₹299)
          </button>
        </div>

        {/* Yearly Premium */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Annual VIP</h3>
                <p className="text-xs text-slate-400 mt-1">Save 30% annually with full VIP benefits.</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                SAVE 30%
              </span>
            </div>
            <div className="text-3xl font-black text-white">
              ₹2,499 <span className="text-xs font-normal text-slate-500">/ year</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-white">All Monthly Premium privileges</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Early access to new chapter drops</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>VIP reader badge in community reviews</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Priority customer support</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('YEARLY_PREMIUM')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            Upgrade to Annual (₹2,499)
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          itemType="SUBSCRIPTION"
          targetId={selectedPlan}
          title={selectedPlan === 'YEARLY_PREMIUM' ? 'Annual VIP Plan (1 Year)' : 'Monthly Premium Plan (30 Days)'}
          priceCents={selectedPlan === 'YEARLY_PREMIUM' ? 249900 : 29900}
          onSuccess={() => {
            setCheckoutSuccess(true);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}
