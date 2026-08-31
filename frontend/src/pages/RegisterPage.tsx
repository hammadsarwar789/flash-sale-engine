import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Wordmark } from '../components/ui/Wordmark';
import { ShieldCheck, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'CUSTOMER' | 'STAFF' | 'MANAGER' | 'VENDOR'>('CUSTOMER');
  const [targetOutletId, setTargetOutletId] = useState('out_fsd_01');
  const [companyName, setCompanyName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingSuccess, setPendingSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPendingSuccess(null);

    try {
      if (accountType === 'CUSTOMER') {
        await register({ email, password, full_name: fullName });
        await login({ email, password });
        navigate('/products', { replace: true });
      } else {
        const reqType = accountType === 'STAFF' ? 'STAFF_ONBOARDING' : (accountType === 'MANAGER' ? 'MANAGER_ONBOARDING' : 'VENDOR_REGISTRATION');
        await authApi.submitRegistrationRequest({
          applicant_email: email,
          applicant_name: fullName,
          request_type: reqType as any,
          target_outlet_id: (accountType === 'STAFF' || accountType === 'MANAGER') ? targetOutletId : undefined,
          password: password,
          payload: { company_name: companyName },
        });
        setPendingSuccess(
          `Your ${accountType} registration request has been submitted successfully! It is currently pending administrative approval.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] border border-line bg-surface rounded-card overflow-hidden">
      
      {/* Left Column: Obsidian Stats & Wordmark */}
      <div className="hidden lg:flex lg:col-span-6 bg-base p-12 flex-col justify-between border-r border-line">
        <Wordmark size="lg" />
        <div className="space-y-4 max-w-md">
          <div className="w-4 h-4 rounded-full bg-amber animate-signal-pulse" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight leading-tight">
            "Register to lock reservations instantly and track fulfillment telemetry."
          </h2>
          <p className="font-mono text-xs text-text-mute">
            — HIGH-VELOCITY MULTI-TENANT MARKETPLACE
          </p>
        </div>
        <div className="font-mono text-[11px] text-text-mute flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-mint" />
          <span>INSTANT ALLOCATION IDENTIFIER · AES-256 ENCRYPTED</span>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-6 p-8 sm:p-12 flex items-center justify-center bg-surface">
        <form onSubmit={handleSubmit} className="w-full max-w-[440px] space-y-6">
          <div className="space-y-1">
            <Eyebrow className="text-amber block font-bold">REGISTRATION PORTAL</Eyebrow>
            <h1 className="font-display text-3xl font-bold text-text tracking-tight">Create Account</h1>
            <p className="text-xs text-text-mute">Select your account role to proceed with registration.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 border border-rose/40 bg-rose-soft text-rose font-mono text-xs rounded-card">
              ● {errorMsg}
            </div>
          )}

          {pendingSuccess && (
            <div className="p-4 border border-mint/40 bg-mint-soft text-mint font-mono text-xs rounded-card space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVAL PIPELINE ACTIVE</span>
              </div>
              <p className="text-text-dim">{pendingSuccess}</p>
              <Link to="/login" className="inline-block pt-2 text-amber hover:underline font-bold">
                Return to Login →
              </Link>
            </div>
          )}

          {!pendingSuccess && (
            <>
              {/* Role Selector Pills */}
              <div>
                <Eyebrow className="text-text-mute mb-2 block">ACCOUNT ROLE</Eyebrow>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  {(['CUSTOMER', 'VENDOR', 'STAFF', 'MANAGER'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccountType(t)}
                      className={`py-2 px-2 border rounded-card text-center transition-colors ${
                        accountType === t
                          ? 'bg-raised border-amber text-text font-bold ring-1 ring-amber'
                          : 'bg-surface border-line text-text-dim hover:border-line-strong'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">FULL NAME</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="JORDAN BELFORT"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors uppercase"
                  />
                </div>

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
                  <Eyebrow className="text-text-mute mb-1 block">PASSWORD</Eyebrow>
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

                {accountType === 'VENDOR' && (
                  <div>
                    <Eyebrow className="text-text-mute mb-1 block">STORE / COMPANY NAME</Eyebrow>
                    <input
                      type="text"
                      required
                      placeholder="E.G. KINETIC APPAREL LABS"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors"
                    />
                  </div>
                )}

                {(accountType === 'STAFF' || accountType === 'MANAGER') && (
                  <div>
                    <Eyebrow className="text-text-mute mb-1 block">ASSIGNED OUTLET / STORE LOCATION</Eyebrow>
                    <select
                      value={targetOutletId}
                      onChange={(e) => setTargetOutletId(e.target.value)}
                      className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none rounded-card transition-colors cursor-pointer"
                    >
                      <option value="out_fsd_01">Faisalabad Central Warehouse (out_fsd_01)</option>
                      <option value="out_lhr_02">Lahore High-Speed Hub (out_lhr_02)</option>
                      <option value="out_isb_03">Islamabad Northern Depot (out_isb_03)</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-amber text-on-amber font-sans text-xs font-bold uppercase tracking-wider hover:bg-amber-press transition-colors disabled:opacity-50 rounded-card flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isLoading ? 'PROCESSING REGISTRATION...' : accountType === 'CUSTOMER' ? 'CREATE ACCOUNT →' : 'SUBMIT REGISTRATION REQUEST →'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="text-center font-mono text-xs text-text-mute pt-2">
            ALREADY REGISTERED?{' '}
            <Link to="/login" className="text-amber hover:underline font-bold">
              LOG IN HERE
            </Link>
          </div>
        </form>
      </div>

    </div>
  );
};
