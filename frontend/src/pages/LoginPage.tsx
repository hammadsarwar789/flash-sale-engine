import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Wordmark } from '../components/ui/Wordmark';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await login({ email, password });
      const role = res.user?.role || 'user';
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/products', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid authentication credentials.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border border-rule bg-paper">
      
      {/* Left Column: Dark Ink Editorial Quote */}
      <div className="hidden lg:flex lg:col-span-6 bg-ink text-bone p-12 flex-col justify-between border-r border-rule">
        <Wordmark size="lg" className="[&_span.text-ink]:text-bone" />
        <div className="space-y-4 max-w-md">
          <p className="font-serif text-[40px] leading-[1.1] text-bone font-normal">
            "Speed is the only feature that matters when inventory is scarce."
          </p>
          <p className="font-mono text-xs text-ash">
            — FLASH SALE ENGINE ARCHITECTURE SPEC v2
          </p>
        </div>
        <div className="font-mono text-[11px] text-ash">
          AUTHENTICATED SESSION COOKIE MODE · HTTPONLY SECURE
        </div>
      </div>

      {/* Right Column: Clean Form Container (Max 400px centered) */}
      <div className="lg:col-span-6 p-8 sm:p-12 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px] space-y-6">
          <div className="space-y-1">
            <Eyebrow className="text-ash block">IDENTITY ACCESS</Eyebrow>
            <h1 className="font-serif text-4xl text-ink font-normal">Log In.</h1>
          </div>

          {errorMsg && (
            <div className="p-3 border border-loss bg-paper text-loss font-mono text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Eyebrow className="text-ash mb-1 block">EMAIL ADDRESS</Eyebrow>
              <input
                type="email"
                required
                placeholder="USER@EXAMPLE.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash uppercase focus:outline-none rounded-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Eyebrow className="text-ash">PASSWORD</Eyebrow>
                <Link to="/forgot-password" className="font-mono text-[11px] text-ash hover:text-ink underline">
                  FORGOT?
                </Link>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash focus:outline-none rounded-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-ink text-paper font-sans text-xs font-semibold uppercase tracking-widest hover:bg-graphite transition-colors disabled:opacity-50 rounded-none"
          >
            {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
          </button>

          <div className="text-center font-mono text-xs text-ash pt-2">
            NO ACCOUNT RECORD?{' '}
            <Link to="/register" className="text-ink underline hover:text-signal">
              REGISTER HERE
            </Link>
          </div>
        </form>
      </div>

    </div>
  );
};
