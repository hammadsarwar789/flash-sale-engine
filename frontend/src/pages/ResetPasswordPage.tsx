import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [resetToken, setResetToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await authApi.resetPassword(resetToken, newPassword);
      setMsg(res.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center mx-auto text-amber border border-line">
          <Lock className="w-6 h-6" />
        </div>
        <Eyebrow className="text-amber block font-bold">SECURITY CREDENTIALS</Eyebrow>
        <h1 className="font-display text-3xl font-bold text-text">Create New Password</h1>
        <p className="text-text-mute text-xs">Enter your reset verification token and choose a new password.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-card bg-surface border border-line space-y-5">
        {msg && (
          <div className="p-3.5 rounded-card bg-mint-soft border border-mint/30 text-mint text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg} Redirecting to login...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-card bg-rose-soft border border-rose/30 text-rose text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <Eyebrow className="text-text-mute mb-1.5 block">RESET TOKEN</Eyebrow>
          <input
            type="text"
            required
            placeholder="reset-xxx"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className="w-full bg-raised border border-line rounded-card px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-sky transition-colors"
          />
        </div>

        <div>
          <Eyebrow className="text-text-mute mb-1.5 block">NEW PASSWORD</Eyebrow>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-raised border border-line rounded-card px-3.5 py-2.5 pr-10 text-sm text-text font-mono focus:outline-none focus:border-sky transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-text-mute hover:text-text focus:outline-none transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber hover:bg-amber-press text-on-amber font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-card transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSubmitting ? 'UPDATING CREDENTIALS...' : 'CONFIRM NEW PASSWORD'}
        </button>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-mono text-text-mute hover:text-text transition-colors">
            Return to Login
          </Link>
        </div>
      </form>
    </div>
  );
};
