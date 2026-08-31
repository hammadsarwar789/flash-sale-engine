import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Wordmark } from '../components/ui/Wordmark';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await login({ email, password });
      const role = res.user?.role || 'user';
      if (['admin', 'manager', 'super_admin'].includes(role)) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/products', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid authentication credentials.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] border border-line bg-surface rounded-card overflow-hidden">
      
      {/* Left Column: Obsidian Stats & Wordmark */}
      <div className="hidden lg:flex lg:col-span-6 bg-base p-12 flex-col justify-between border-r border-line">
        <Wordmark size="lg" />
        
        <div className="space-y-4 max-w-md">
          <div className="w-4 h-4 rounded-full bg-amber animate-signal-pulse" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight leading-tight">
            "High velocity commerce demands absolute precision and zero latency."
          </h2>
          <p className="font-mono text-xs text-text-mute">
            — FLASH SALE ENGINE ARCHITECTURE SPEC V3
          </p>
        </div>

        <div className="font-mono text-[11px] text-text-mute flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-mint" />
          <span>HTTPONLY SESSION COOKIES · TLS 1.3 SECURE</span>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-6 p-8 sm:p-12 flex items-center justify-center bg-surface">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px] space-y-6">
          <div className="space-y-1">
            <Eyebrow className="text-amber block font-bold">IDENTITY ACCESS</Eyebrow>
            <h1 className="font-display text-3xl font-bold text-text tracking-tight">Sign In</h1>
            <p className="text-xs text-text-mute">Enter your account credentials to access the live floor.</p>
          </div>

          {errorMsg && (
            <div className="p-3 border border-rose/40 bg-rose-soft text-rose font-mono text-xs rounded-card">
              ● {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Eyebrow className="text-text-mute mb-1 block">EMAIL ADDRESS</Eyebrow>
              <input
                type="email"
                required
                placeholder="USER@EXAMPLE.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Eyebrow className="text-text-mute">PASSWORD</Eyebrow>
                <Link to="/forgot-password" className="font-mono text-[11px] text-amber hover:underline">
                  FORGOT PASSWORD?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 pr-10 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-amber text-on-amber font-sans text-xs font-bold uppercase tracking-wider hover:bg-amber-press transition-colors disabled:opacity-50 rounded-card flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{isLoading ? 'AUTHENTICATING...' : 'SIGN IN TO ACCOUNT'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center font-mono text-xs text-text-mute pt-2">
            NO ACCOUNT RECORD?{' '}
            <Link to="/register" className="text-amber hover:underline font-bold">
              REGISTER HERE
            </Link>
          </div>
        </form>
      </div>

    </div>
  );
};
