import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Eyebrow } from '../components/ui/Eyebrow';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      setMsg(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err: any) {
      setMsg(err.message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center mx-auto text-amber border border-line">
          <KeyRound className="w-6 h-6" />
        </div>
        <Eyebrow className="text-amber block font-bold">RECOVERY PIPELINE</Eyebrow>
        <h1 className="font-display text-3xl font-bold text-text">Reset Password</h1>
        <p className="text-text-mute text-xs">Enter your account email to generate a password reset token.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-card bg-surface border border-line space-y-5">
        {msg && (
          <div className="p-3.5 rounded-card bg-mint-soft border border-mint/30 text-mint text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {resetToken && (
          <div className="p-4 rounded-card bg-raised border border-line space-y-2">
            <span className="text-xs font-mono text-text-mute">Generated Demo Token:</span>
            <p className="font-mono text-amber font-bold text-sm select-all">{resetToken}</p>
            <Link
              to={`/reset-password?token=${resetToken}`}
              className="block text-xs font-bold text-on-amber bg-amber hover:bg-amber-press text-center py-2.5 rounded-card mt-2 transition-colors uppercase tracking-wider"
            >
              Proceed to Reset Form
            </Link>
          </div>
        )}

        <div>
          <Eyebrow className="text-text-mute mb-1.5 block">EMAIL ADDRESS</Eyebrow>
          <div className="relative">
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-raised border border-line rounded-card pl-10 pr-4 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none focus:border-sky transition-colors"
            />
            <Mail className="w-4 h-4 text-text-mute absolute left-3.5 top-3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber hover:bg-amber-press text-on-amber font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-card transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSubmitting ? 'GENERATING TOKEN...' : 'SEND RESET INSTRUCTIONS'}
        </button>

        <div className="text-center pt-2">
          <Link to="/login" className="inline-flex items-center space-x-1 text-xs font-mono text-text-mute hover:text-text transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </Link>
        </div>
      </form>
    </div>
  );
};
