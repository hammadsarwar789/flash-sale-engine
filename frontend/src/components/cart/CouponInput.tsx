import React, { useState } from 'react';
import { commerceApi } from '../../api/commerce';
import { CouponValidation } from '../../types/api';
import { Money } from '../ui/Money';
import { CheckCircle2, X } from 'lucide-react';

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
      <div className="p-3.5 border border-mint/40 bg-mint-soft text-mint rounded-card font-mono text-xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>PROMO '{appliedCoupon.code}' APPLIED (SAVINGS: ${Number(appliedCoupon.calculated_discount || 0).toFixed(2)})</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCouponApplied({ valid: false });
            }}
            className="text-text-mute hover:text-rose flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>REMOVE</span>
          </button>
        </div>
        <div className="text-[10px] text-text-dim flex flex-wrap gap-2 pt-0.5">
          <span>✓ {maxPerUser} use allowed per user account</span>
          {globalLimit ? (
            <span>· ⚡ Valid for first {globalLimit} orders</span>
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
        className="font-mono text-xs text-amber hover:underline block"
      >
        + APPLY PROMOTIONAL COUPON CODE
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="ENTER PROMO CODE (E.G. SAVE20)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleApply(e);
            }
          }}
          className="flex-grow bg-raised border border-line focus:border-sky px-3 py-2 text-xs font-mono text-text placeholder:text-text-mute uppercase focus:outline-none rounded-card transition-colors"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="bg-amber text-on-amber font-sans font-bold text-xs px-4 py-2 hover:bg-amber-press disabled:opacity-40 rounded-card transition-colors shadow-sm"
        >
          {isValidating ? 'CHECKING...' : 'APPLY'}
        </button>
      </div>

      {errorMsg && (
        <div className="font-mono text-xs text-rose">
          ● {errorMsg}
        </div>
      )}
    </div>
  );
};
