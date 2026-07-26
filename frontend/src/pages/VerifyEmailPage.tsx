import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
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
    <div className="max-w-md mx-auto py-16 text-center space-y-6 glass-card rounded-3xl p-8 border border-slate-800">
      <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
        <MailCheck className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-black text-white">Email Verification</h1>

      {status === 'loading' && <p className="text-slate-400 text-sm">Verifying your email address...</p>}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{msg}</span>
          </div>
          <Link to="/login" className="inline-block bg-cyan-500 font-bold px-6 py-2.5 rounded-xl text-slate-950">
            Proceed to Sign In
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center justify-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{msg}</span>
          </div>
          <Link to="/products" className="inline-block bg-slate-800 text-slate-200 font-bold px-6 py-2.5 rounded-xl">
            Return to Homepage
          </Link>
        </div>
      )}
    </div>
  );
};
