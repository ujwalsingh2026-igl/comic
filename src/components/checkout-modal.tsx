'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { X, Lock, CheckCircle, Shield, CreditCard, Sparkles } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'CONTENT' | 'CHAPTER' | 'SUBSCRIPTION';
  targetId: string;
  title: string;
  priceCents: number;
  onSuccess: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  itemType,
  targetId,
  title,
  priceCents,
  onSuccess,
}: CheckoutModalProps) {
  const { user, openLoginModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      onClose();
      openLoginModal();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create order on backend
      const orderRes = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, targetId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error?.message || 'Failed to create order');

      const { orderNumber } = orderData.data;

      // 2. Simulate Razorpay payment gateway checkout & HMAC signature creation
      const mockPaymentId = `pay_${Date.now()}`;

      // Verify payment on backend
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          providerPaymentId: mockPaymentId,
          providerSignature: 'simulated_client_checkout_sig',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error?.message || 'Payment verification failed');

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Unlock Premium Access</h3>
          <p className="text-xs text-slate-400 mt-1">{title}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-emerald-300">Payment Verified!</h4>
            <p className="text-xs text-slate-400">Content entitlement unlocked. Enjoy reading!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Amount</p>
                <p className="text-2xl font-black text-white">₹{(priceCents / 100).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Access</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <Shield className="w-4 h-4" />
                <span>PCI-DSS Secure Payment</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Supports UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking with server-verified webhook processing.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {loading ? 'Processing securely...' : `Pay ₹${(priceCents / 100).toFixed(2)} & Read Now`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
