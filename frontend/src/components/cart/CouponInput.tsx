import React, { useState } from 'react';
import { Tag, Check, AlertCircle } from 'lucide-react';
import { commerceApi } from '../../api/commerce';
import { CouponValidation } from '../../types/api';

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

  return (
    <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-3">
      <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
        <Tag className="w-4 h-4 text-cyan-400" />
        <span>Promo / Coupon Code</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>
              Promo Code '{appliedCoupon.code}' applied (-${Number(appliedCoupon.calculated_discount || 0).toFixed(2)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCouponApplied({ valid: false })}
            className="text-slate-400 hover:text-white underline text-[11px]"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex space-x-2">
          <input
            type="text"
            placeholder="Enter promo code (e.g. FLASH10)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            disabled={isValidating || !code.trim()}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isValidating ? 'Checking...' : 'Apply'}
          </button>
        </form>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
