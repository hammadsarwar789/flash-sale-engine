import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Wordmark } from '../components/ui/Wordmark';

export const RegisterPage: React.FC = () => {
  const { register, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      await register({ email, password, full_name: fullName });
      await login({ email, password });
      navigate('/products', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border border-rule bg-paper">
      
      {/* Left Column: Dark Ink Editorial Quote */}
      <div className="hidden lg:flex lg:col-span-6 bg-ink text-bone p-12 flex-col justify-between border-r border-rule">
        <Wordmark size="lg" className="[&_span.text-ink]:text-bone" />
        <div className="space-y-4 max-w-md">
          <p className="font-serif text-[40px] leading-[1.1] text-bone font-normal">
            "Register to lock reservations instantly and track fulfillment telemetry."
          </p>
          <p className="font-mono text-xs text-ash">
            — FLASH SALE ENGINE ARCHITECTURE SPEC v2
          </p>
        </div>
        <div className="font-mono text-[11px] text-ash">
          NEW USER REGISTRATION · ZERO FRICTION
        </div>
      </div>

      {/* Right Column: Clean Form Container */}
      <div className="lg:col-span-6 p-8 sm:p-12 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px] space-y-6">
          <div className="space-y-1">
            <Eyebrow className="text-ash block">NEW RECORD</Eyebrow>
            <h1 className="font-serif text-4xl text-ink font-normal">Register.</h1>
          </div>

          {errorMsg && (
            <div className="p-3 border border-loss bg-paper text-loss font-mono text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Eyebrow className="text-ash mb-1 block">FULL NAME</Eyebrow>
              <input
                type="text"
                required
                placeholder="JANE DOE"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
              />
            </div>

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
              <Eyebrow className="text-ash mb-1 block">PASSWORD</Eyebrow>
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
            {isLoading ? 'REGISTERING...' : 'CREATE ACCOUNT →'}
          </button>

          <div className="text-center font-mono text-xs text-ash pt-2">
            ALREADY REGISTERED?{' '}
            <Link to="/login" className="text-ink underline hover:text-signal">
              LOG IN HERE
            </Link>
          </div>
        </form>
      </div>

    </div>
  );
};
