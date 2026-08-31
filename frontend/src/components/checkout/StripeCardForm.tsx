import React, { useState } from 'react';
import { Eyebrow } from '../ui/Eyebrow';
import { ShieldCheck, Zap } from 'lucide-react';

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

  const handleAutoFill = () => {
    setCardHolder('JANE DOE');
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('888');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalProcessing(true);
    setTimeout(() => {
      setLocalProcessing(false);
      onPaymentSuccess(`pi_${Math.random().toString(36).substring(2, 12)}`);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 font-mono text-xs">
      <div className="flex justify-between items-center bg-raised p-2.5 rounded-card border border-line">
        <span className="text-text-mute flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-mint" />
          STRIPE PAYMENTINTENT SANDBOX
        </span>
        <button
          type="button"
          onClick={handleAutoFill}
          className="text-amber hover:text-amber-press font-semibold flex items-center gap-1"
        >
          <Zap className="w-3 h-3" />
          <span>AUTO-FILL TEST CARD</span>
        </button>
      </div>

      <div>
        <Eyebrow className="text-text-mute mb-1 block">CARDHOLDER NAME</Eyebrow>
        <input
          type="text"
          required
          placeholder="JANE DOE"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          className="w-full bg-overlay border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text placeholder:text-text-mute uppercase focus:outline-none rounded-card transition-colors"
        />
      </div>

      <div>
        <Eyebrow className="text-text-mute mb-1 block">CARD NUMBER</Eyebrow>
        <input
          type="text"
          required
          maxLength={19}
          placeholder="4242 •••• •••• 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          className="w-full bg-overlay border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Eyebrow className="text-text-mute mb-1 block">EXPIRY (MM/YY)</Eyebrow>
          <input
            type="text"
            required
            maxLength={5}
            placeholder="12/28"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full bg-overlay border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
          />
        </div>
        <div>
          <Eyebrow className="text-text-mute mb-1 block">CVC / CVV</Eyebrow>
          <input
            type="text"
            required
            maxLength={4}
            placeholder="888"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className="w-full bg-overlay border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={localProcessing || isProcessing}
        className="w-full h-12 bg-amber text-on-amber font-sans text-xs font-bold uppercase tracking-wider hover:bg-amber-press transition-colors disabled:opacity-50 rounded-card mt-3 flex items-center justify-center gap-2 shadow-sm"
      >
        {localProcessing ? (
          <span>AUTHORIZING TRANSACTION...</span>
        ) : (
          <span>PAY NOW — ${amount.toFixed(2)}</span>
        )}
      </button>
    </form>
  );
};
