import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Review } from '../../types/api';

interface ReviewListProps {
  reviews: Review[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-10 rounded-2xl glass-card border border-slate-800/80">
        <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 font-medium text-sm">No reviews yet for this product.</p>
        <p className="text-slate-500 text-xs mt-1">Be the first customer to share your thoughts!</p>
      </div>
    );
  }

  const avgRating = (
    reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center space-x-4 p-4 rounded-2xl glass-card border border-slate-800">
        <div className="text-3xl font-extrabold text-white flex items-center space-x-1">
          <span>{avgRating}</span>
          <Star className="w-7 h-7 fill-amber-400 text-amber-400 inline" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200">Customer Rating</h4>
          <p className="text-xs text-slate-400">Based on {reviews.length} verified review{reviews.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Review items */}
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Verified Buyer'}
              </span>
            </div>

            {r.title && <h5 className="font-bold text-sm text-slate-100">{r.title}</h5>}
            {r.comment && <p className="text-sm text-slate-300 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
