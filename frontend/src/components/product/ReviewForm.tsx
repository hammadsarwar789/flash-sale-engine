import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { commerceApi } from '../../api/commerce';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onReviewSubmitted }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [eligibilityMsg, setEligibilityMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated && productId) {
      commerceApi.checkReviewEligibility(productId)
        .then((res) => {
          setIsEligible(res.eligible);
          if (!res.eligible) {
            setEligibilityMsg(res.message);
          }
        })
        .catch(() => {
          setIsEligible(false);
          setEligibilityMsg('Unable to verify order delivery status.');
        });
    }
  }, [isAuthenticated, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isEligible === false) {
      setErrorMsg(eligibilityMsg || 'You can only review products that have been delivered to you.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await commerceApi.addReview(productId, { rating, title, comment });
      setSuccessMsg('Thank you! Your review has been submitted.');
      setTitle('');
      setComment('');
      setRating(5);
      onReviewSubmitted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-card space-y-4 border border-slate-800">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Write a Customer Review</h3>
        {isEligible === false && (
          <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
            DELIVERY REQUIRED
          </span>
        )}
      </div>

      {isEligible === false && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
          🔒 {eligibilityMsg || 'Only customers who have received delivery of this product can submit a review.'}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          Rating
        </label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 focus:outline-none transition-transform hover:scale-125"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-700'
                }`}
              />
            </button>
          ))}
          <span className="ml-3 text-sm font-semibold text-amber-400">
            {hoverRating || rating} / 5 Stars
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
          Title / Summary
        </label>
        <input
          type="text"
          placeholder="Great quality product!"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
          Review Comments
        </label>
        <textarea
          rows={3}
          placeholder="Share details about the fit, quality, or experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isEligible === false}
        className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
      </button>
    </form>
  );
};
