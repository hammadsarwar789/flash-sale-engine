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

  const handleApply = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    const maxPerUser = (appliedCoupon as any).max_uses_per_user || 1;
    const globalLimit = (appliedCoupon as any).usage_limit;

    return (
      <div className="p-3 border border-gain bg-paper text-gain font-mono text-xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold">
            <span>PROMO CODE '{appliedCoupon.code}' APPLIED (</span>
            <Numeric value={Number(appliedCoupon.calculated_discount || 0)} format="price" zeroPadInt={2} />
            <span> SAVINGS)</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCouponApplied({ valid: false });
            }}
            className="text-ash hover:text-loss underline"
          >
            [ REMOVE ]
          </button>
        </div>
        <div className="text-[10px] text-graphite flex flex-wrap gap-2 pt-0.5">
          <span>✓ {maxPerUser} use allowed per user account</span>
          {globalLimit ? (
            <span>· ⚡ Valid for first {globalLimit} customers</span>
          ) : null}
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(true);
        }}
        className="font-mono text-xs text-ink hover:text-signal underline block"
      >
        [ + APPLY COUPON CODE ]
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="ENTER PROMO CODE (E.G. FLASH20)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleApply(e);
            }
          }}
          className="flex-grow bg-paper-sunk border border-rule px-3 py-2 text-xs font-mono text-ink placeholder-ash uppercase focus:outline-none focus:border-ink rounded-none"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="bg-ink text-paper text-xs font-mono px-4 py-2 hover:bg-graphite disabled:opacity-40 rounded-none"
        >
          {isValidating ? 'CHECKING...' : 'APPLY'}
        </button>
      </div>

      {errorMsg && (
        <div className="font-mono text-xs text-loss">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
