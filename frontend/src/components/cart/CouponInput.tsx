import React, { useState } from 'react';
import { commerceApi } from '../../api/commerce';
import { CouponValidation } from '../../types/api';
import { Numeric } from '../ui/Numeric';

interface CouponInputProps {
  cartSubtotal: number;
  onCouponApplied: (coupon: CouponValidation) => void;
  appliedCoupon: CouponValidation | null;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  cartSubtotal,
  onCouponApplied,
  appliedCoupon,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsValidating(true);
    setErrorMsg(null);

    try {
      const res = await commerceApi.validateCoupon(code.trim(), cartSubtotal);
      if (res.valid) {
        onCouponApplied(res);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || 'Invalid promotional coupon code');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to validate coupon');
    } finally {
      setIsValidating(false);
    }
  };

  if (appliedCoupon && appliedCoupon.valid) {
    return (
      <div className="flex items-center justify-between p-3 border border-gain bg-paper text-gain font-mono text-xs">
        <div>
          <span>PROMO CODE '{appliedCoupon.code}' APPLIED (</span>
          <Numeric value={Number(appliedCoupon.calculated_discount || 0)} format="price" zeroPadInt={2} />
          <span>)</span>
        </div>
        <button
          type="button"
          onClick={() => onCouponApplied({ valid: false })}
          className="text-ash hover:text-loss underline"
        >
          [ REMOVE ]
        </button>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="font-mono text-xs text-ink hover:text-signal underline block"
      >
        [ + APPLY COUPON CODE ]
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleApply} className="flex space-x-2">
        <input
          type="text"
          placeholder="ENTER PROMO CODE (E.G. SUMMER30)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-grow bg-paper-sunk border border-rule px-3 py-2 text-xs font-mono text-ink placeholder-ash uppercase focus:outline-none focus:border-ink rounded-none"
        />
        <button
          type="submit"
          disabled={isValidating || !code.trim()}
          className="bg-ink text-paper text-xs font-mono px-4 py-2 hover:bg-graphite disabled:opacity-40 rounded-none"
        >
          {isValidating ? 'CHECKING...' : 'APPLY'}
        </button>
      </form>

      {errorMsg && (
        <div className="font-mono text-xs text-loss">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
