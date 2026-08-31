import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Eyebrow } from '../components/ui/Eyebrow';
import { MailCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id') || searchParams.get('id') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (userId) {
      authApi.verifyEmail(userId)
        .then((res) => {
          setStatus('success');
          setMsg(res.message);
        })
        .catch((err) => {
          setStatus('error');
          setMsg(err.message || 'Email verification failed');
        });
    } else {
      setStatus('error');
      setMsg('Missing user_id query parameter in verification URL.');
    }
  }, [userId]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6 bg-surface rounded-card p-8 border border-line">
      <div className="w-14 h-14 rounded-full bg-raised text-amber flex items-center justify-center mx-auto border border-line">
        <MailCheck className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <Eyebrow className="text-amber block font-bold">IDENTITY VERIFICATION</Eyebrow>
        <h1 className="font-display text-2xl font-bold text-text">Email Confirmation</h1>
      </div>

      {status === 'loading' && <p className="text-text-mute font-mono text-xs">Verifying your email token with auth server...</p>}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-card bg-mint-soft border border-mint/30 text-mint text-xs font-mono font-bold flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{msg}</span>
          </div>
          <Link
            to="/login"
            className="inline-block bg-amber hover:bg-amber-press text-on-amber font-sans font-bold text-xs uppercase px-6 py-2.5 rounded-card transition-colors shadow-sm"
          >
            Proceed to Sign In
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-card bg-rose-soft border border-rose/30 text-rose text-xs font-mono font-bold flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{msg}</span>
          </div>
          <Link
            to="/products"
            className="inline-block bg-raised hover:bg-overlay text-text border border-line font-mono text-xs uppercase px-6 py-2.5 rounded-card transition-colors"
          >
            Return to Floor
          </Link>
        </div>
      )}
    </div>
  );
};
