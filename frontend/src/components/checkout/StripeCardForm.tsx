import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';

interface StripeCardFormProps {
  onPaymentSuccess: (paymentId: string) => void;
  amount: number;
  isProcessing: boolean;
}

export const StripeCardForm: React.FC<StripeCardFormProps> = ({
  onPaymentSuccess,
  amount,
  isProcessing,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalProcessing(true);
    setTimeout(() => {
      setLocalProcessing(false);
      onPaymentSuccess(`pi_${Math.random().toString(36).substring(2, 12)}`);
    }, 1200);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-card space-y-4 border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-white">Payment Details (Stripe Secured)</h3>
        </div>
        <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-Bit SSL</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          required
          placeholder="Jane Doe"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
          Card Number
        </label>
        <div className="relative">
          <input
            type="text"
            required
            maxLength={19}
            placeholder="4242 •••• •••• 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Expiration (MM/YY)
          </label>
          <input
            type="text"
            required
            maxLength={5}
            placeholder="12/28"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            CVC / CVV
          </label>
          <input
            type="text"
            required
            maxLength={4}
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Encrypted Card Tokenization</span>
        </div>

        <button
          type="submit"
          disabled={isProcessing || localProcessing}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isProcessing || localProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};
