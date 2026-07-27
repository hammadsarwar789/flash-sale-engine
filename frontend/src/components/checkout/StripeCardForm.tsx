import React, { useState } from 'react';
import { Eyebrow } from '../ui/Eyebrow';

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
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <Eyebrow className="text-ash mb-1 block">CARDHOLDER NAME</Eyebrow>
        <input
          type="text"
          required
          placeholder="JANE DOE"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink placeholder-ash uppercase focus:outline-none rounded-none"
        />
      </div>

      <div>
        <Eyebrow className="text-ash mb-1 block">CARD NUMBER</Eyebrow>
        <input
          type="text"
          required
          maxLength={19}
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash focus:outline-none rounded-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Eyebrow className="text-ash mb-1 block">EXPIRY (MM/YY)</Eyebrow>
          <input
            type="text"
            required
            maxLength={5}
            placeholder="12/28"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash focus:outline-none rounded-none"
          />
        </div>
        <div>
          <Eyebrow className="text-ash mb-1 block">CVC / CVV</Eyebrow>
          <input
            type="text"
            required
            maxLength={4}
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash focus:outline-none rounded-none"
          />
        </div>
      </div>
    </form>
  );
};
