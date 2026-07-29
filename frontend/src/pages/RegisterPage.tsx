import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Wordmark } from '../components/ui/Wordmark';

export const RegisterPage: React.FC = () => {
  const { register, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          NEW USER REGISTRATION · MULTI-OUTLET HIERARCHY
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

          {pendingSuccess && (
            <div className="p-4 border border-gain bg-paper text-gain font-mono text-xs space-y-2">
              <p className="font-semibold">{pendingSuccess}</p>
              <p className="text-graphite">You will be able to log in as soon as a Manager or Super Admin approves your account request.</p>
              <Link to="/login" className="inline-block mt-2 font-mono underline text-ink font-semibold">→ RETURN TO LOGIN</Link>
            </div>
          )}

          {!pendingSuccess && (
            <>
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <Eyebrow className="text-ash mb-1 block">ACCOUNT TYPE</Eyebrow>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-xs text-ink uppercase focus:outline-none rounded-none"
                  >
                    <option value="CUSTOMER">RETAIL CUSTOMER (INSTANT ACCESS)</option>
                    <option value="STAFF">OUTLET STAFF / OPERATOR (REQUIRES APPROVAL)</option>
                    <option value="MANAGER">STORE MANAGER (REQUIRES ADMIN APPROVAL)</option>
                    <option value="VENDOR">VENDOR / SUPPLIER (REQUIRES ADMIN APPROVAL)</option>
                  </select>
                </div>

                {(accountType === 'STAFF' || accountType === 'MANAGER') && (
                  <div>
                    <Eyebrow className="text-ash mb-1 block">TARGET STORE / BRANCH</Eyebrow>
                    <select
                      value={targetOutletId}
                      onChange={(e) => setTargetOutletId(e.target.value)}
                      className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-xs font-mono text-ink uppercase focus:outline-none rounded-none"
                    >
                      <option value="out_fsd_01">FLASH ENGINE FSD (FAISALABAD BRANCH - FSD-01)</option>
                      <option value="out_lhr_01">FLASH ENGINE LHR (LAHORE BRANCH - LHR-01)</option>
                    </select>
                  </div>
                )}

                {accountType === 'VENDOR' && (
                  <div>
                    <Eyebrow className="text-ash mb-1 block">COMPANY / BUSINESS NAME</Eyebrow>
                    <input
                      type="text"
                      required
                      placeholder="ACME SUPPLIES INC"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-xs text-ink uppercase focus:outline-none rounded-none"
                    />
                  </div>
                )}

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
                className="w-full bg-signal text-signal-ink font-sans font-medium tracking-[0.1em] text-sm py-4 uppercase hover:bg-signal/90 transition-colors disabled:opacity-50 rounded-none"
              >
                {accountType === 'CUSTOMER' ? 'REGISTER ACCOUNT →' : 'SUBMIT FOR APPROVAL →'}
              </button>
            </>
          )}

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
