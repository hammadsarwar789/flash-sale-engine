import React, { useState, useEffect } from 'react';
import { Eyebrow } from '../components/ui/Eyebrow';
import { vendorApi, SellerProfile, VendorSubOrder, VendorFinanceSummary } from '../api/vendor';

export const VendorPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sub-orders' | 'finance' | 'onboarding'>('overview');
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Onboarding Form State
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [businessReg, setBusinessReg] = useState('');
  const [taxId, setTaxId] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BANK_TRANSFER');
  const [payoutRef, setPayoutRef] = useState('');
  const [kycDocUrl, setKycDocUrl] = useState('');

  // Data states
  const [subOrders, setSubOrders] = useState<VendorSubOrder[]>([]);
  const [finance, setFinance] = useState<VendorFinanceSummary | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>('');

  const loadVendorData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await vendorApi.getProfile();
      if (res.has_seller_account && res.seller) {
        setHasAccount(true);
        setProfile(res.seller);
        if (res.seller.status === 'APPROVED') {
          const [soData, finData] = await Promise.all([
            vendorApi.getSubOrders(),
            vendorApi.getFinance(),
          ]);
          setSubOrders(soData);
          setFinance(finData);
        } else {
          setActiveTab('onboarding');
        }
      } else {
        setHasAccount(false);
        setActiveTab('onboarding');
      }
    } catch (err: any) {
      // User might not have a seller profile yet
      setHasAccount(false);
      setActiveTab('onboarding');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorData();
  }, []);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await vendorApi.submitOnboarding({
        store_name: storeName,
        store_slug: storeSlug,
        business_registration_no: businessReg,
        tax_id: taxId,
        payout_method: payoutMethod,
        payout_account_ref: payoutRef,
        kyc_documents: kycDocUrl ? [{ doc_type: 'BUSINESS_LICENSE', file_url: kycDocUrl }] : [],
      });
      setSuccessMsg(res.message);
      loadVendorData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit merchant application.');
    }
  };

  const handleUpdateSubOrderStatus = async (subOrderId: string, status: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await vendorApi.updateSubOrderStatus(subOrderId, status);
      setSuccessMsg(res.message);
      const updatedOrders = await vendorApi.getSubOrders();
      setSubOrders(updatedOrders);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update sub-order status.');
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid payout withdrawal amount.');
      return;
    }
    try {
      const res = await vendorApi.requestPayout(amt);
      setSuccessMsg(res.message);
      setPayoutAmount('');
      const finData = await vendorApi.getFinance();
      setFinance(finData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request payout.');
    }
  };

  return (
    <div className="min-h-screen bg-bone text-ink font-sans">
      {/* Top Header Rail */}
      <header className="border-b border-rule bg-paper py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-signal animate-pulse" />
              <Eyebrow className="text-signal tracking-widest uppercase">MULTI-VENDOR MERCHANT DESK</Eyebrow>
            </div>
            <h1 className="font-serif text-4xl text-ink mt-1 font-normal">
              {profile ? profile.store_name : 'Vendor Store Portal'}
            </h1>
          </div>

          {profile && (
            <div className="flex items-center space-x-4 font-mono text-xs border border-rule px-4 py-2 bg-paper-sunk">
              <div>
                <span className="text-ash block text-[10px]">MERCHANT STATUS</span>
                <span className={`font-semibold ${profile.status === 'APPROVED' ? 'text-gain' : 'text-signal'}`}>
                  ● {profile.status}
                </span>
              </div>
              <div className="border-l border-rule pl-4">
                <span className="text-ash block text-[10px]">COMMISSION RATE</span>
                <span className="font-semibold text-ink">{profile.commission_rate}%</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 bg-loss/10 border border-loss text-loss font-mono text-xs">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-gain/10 border border-gain text-gain font-mono text-xs">
            ✓ {successMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        {hasAccount && profile?.status === 'APPROVED' && (
          <div className="flex space-x-2 border-b border-rule mb-8 font-mono text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'border-signal text-signal bg-paper'
                  : 'border-transparent text-ash hover:text-ink'
              }`}
            >
              OVERVIEW & TELEMETRY
            </button>
            <button
              onClick={() => setActiveTab('sub-orders')}
              className={`px-5 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'sub-orders'
                  ? 'border-signal text-signal bg-paper'
                  : 'border-transparent text-ash hover:text-ink'
              }`}
            >
              SUB-ORDERS & FULFILLMENT ({subOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-5 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'finance'
                  ? 'border-signal text-signal bg-paper'
                  : 'border-transparent text-ash hover:text-ink'
              }`}
            >
              FINANCIAL LEDGER & PAYOUTS
            </button>
          </div>
        )}

        {/* TAB 1: ONBOARDING / MERCHANT APPLICATION */}
        {(!hasAccount || profile?.status !== 'APPROVED' || activeTab === 'onboarding') && (
          <div className="max-w-3xl mx-auto border border-rule bg-paper p-8 space-y-6">
            <div className="border-b border-rule pb-4">
              <h2 className="font-serif text-3xl text-ink">Merchant Application & KYC Onboarding</h2>
              <p className="text-ash font-mono text-xs mt-1">
                Apply to sell your products on the multi-vendor marketplace.
              </p>
            </div>

            {profile && profile.status === 'PENDING' && (
              <div className="p-4 border border-signal/40 bg-signal/5 text-signal font-mono text-xs">
                ℹ Your merchant application is currently under administrative compliance review. Once approved, your seller portal features will unlock automatically.
              </div>
            )}

            {!hasAccount && (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4 font-mono text-xs">
                <div>
                  <Eyebrow className="text-ash block mb-1">STORE / BRAND NAME *</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Athletics"
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>

                <div>
                  <Eyebrow className="text-ash block mb-1">STORE SLUG (URL IDENTIFIER) *</Eyebrow>
                  <input
                    type="text"
                    required
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Eyebrow className="text-ash block mb-1">BUSINESS REGISTRATION NO.</Eyebrow>
                    <input
                      type="text"
                      placeholder="e.g. REG-908123"
                      value={businessReg}
                      onChange={(e) => setBusinessReg(e.target.value)}
                      className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <Eyebrow className="text-ash block mb-1">TAX ID / NTN</Eyebrow>
                    <input
                      type="text"
                      placeholder="e.g. TAX-441209"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Eyebrow className="text-ash block mb-1">PAYOUT METHOD</Eyebrow>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                    >
                      <option value="BANK_TRANSFER">Direct Bank Transfer (IBAN)</option>
                      <option value="STRIPE_CONNECT">Stripe Connect Account</option>
                      <option value="JAZZCASH_WALLET">Mobile Wallet (JazzCash / Easypaisa)</option>
                    </select>
                  </div>
                  <div>
                    <Eyebrow className="text-ash block mb-1">ACCOUNT / IBAN / WALLET REFERENCE</Eyebrow>
                    <input
                      type="text"
                      placeholder="e.g. PK36MEZN000109283719"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <Eyebrow className="text-ash block mb-1">BUSINESS LICENSE / KYC DOCUMENT URL</Eyebrow>
                  <input
                    type="url"
                    placeholder="https://example.com/kyc-license.pdf"
                    value={kycDocUrl}
                    onChange={(e) => setKycDocUrl(e.target.value)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-signal text-paper font-semibold hover:bg-signal/90 transition-colors uppercase tracking-wider"
                >
                  SUBMIT MERCHANT APPLICATION →
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 1: OVERVIEW TELEMETRY */}
        {hasAccount && profile?.status === 'APPROVED' && activeTab === 'overview' && finance && (
          <div className="space-y-8 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-rule bg-paper p-5">
                <Eyebrow className="text-ash block mb-1">ESCROW HELD BALANCE</Eyebrow>
                <div className="text-3xl font-serif text-signal font-normal">${finance.escrow_held_balance.toFixed(2)}</div>
                <span className="text-[10px] text-ash mt-1 block">Held until delivery return window</span>
              </div>

              <div className="border border-rule bg-paper p-5">
                <Eyebrow className="text-ash block mb-1">AVAILABLE PAYOUT BALANCE</Eyebrow>
                <div className="text-3xl font-serif text-gain font-normal">${finance.available_payout_balance.toFixed(2)}</div>
                <span className="text-[10px] text-ash mt-1 block">Ready for immediate withdrawal</span>
              </div>

              <div className="border border-rule bg-paper p-5">
                <Eyebrow className="text-ash block mb-1">PENDING SUB-ORDERS</Eyebrow>
                <div className="text-3xl font-serif text-ink font-normal">{subOrders.filter(s => s.status === 'PENDING').length}</div>
                <span className="text-[10px] text-ash mt-1 block">Awaiting packing & dispatch</span>
              </div>

              <div className="border border-rule bg-paper p-5">
                <Eyebrow className="text-ash block mb-1">TOTAL PAYOUTS PROCESSED</Eyebrow>
                <div className="text-3xl font-serif text-graphite font-normal">${finance.total_payouts_processed.toFixed(2)}</div>
                <span className="text-[10px] text-ash mt-1 block">Lifetime merchant payouts</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUB-ORDERS & FULFILLMENT */}
        {hasAccount && profile?.status === 'APPROVED' && activeTab === 'sub-orders' && (
          <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-paper-sunk border-b border-rule text-ash">
                  <th className="py-3 px-4">SUB-ORDER ID</th>
                  <th className="py-3 px-4">ITEMS</th>
                  <th className="py-3 px-4">SUBTOTAL</th>
                  <th className="py-3 px-4">COMMISSION</th>
                  <th className="py-3 px-4">NET PAYOUT</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/40">
                {subOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ash">
                      No sub-orders currently assigned to your store.
                    </td>
                  </tr>
                ) : (
                  subOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-paper-sunk/40">
                      <td className="py-3 px-4 text-ink font-semibold">{so.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-ash">
                        {so.items.map(i => `${i.product_name} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink">${so.subtotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-signal">-${so.commission_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-gain">${so.seller_payout_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={`px-2 py-0.5 text-[10px] ${
                          so.status === 'DELIVERED' ? 'bg-gain/20 text-gain' :
                          so.status === 'SHIPPED' ? 'bg-ink text-paper' :
                          'bg-signal/20 text-signal'
                        }`}>
                          ● {so.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {so.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateSubOrderStatus(so.id, 'PACKED')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-ink text-paper hover:bg-graphite transition-colors"
                          >
                            MARK PACKED →
                          </button>
                        )}
                        {so.status === 'PACKED' && (
                          <button
                            onClick={() => handleUpdateSubOrderStatus(so.id, 'SHIPPED')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-signal text-paper hover:bg-signal/90 transition-colors"
                          >
                            MARK SHIPPED 🚚
                          </button>
                        )}
                        {so.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleUpdateSubOrderStatus(so.id, 'DELIVERED')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-gain text-paper hover:bg-gain/90 transition-colors"
                          >
                            MARK DELIVERED ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: FINANCIAL LEDGER & PAYOUTS */}
        {hasAccount && profile?.status === 'APPROVED' && activeTab === 'finance' && finance && (
          <div className="space-y-8 font-mono text-xs">
            {/* Payout Withdrawal Form */}
            <form onSubmit={handleRequestPayout} className="border border-rule bg-paper p-6 space-y-4">
              <h3 className="font-serif text-2xl text-ink">Request Payout Withdrawal</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={finance.available_payout_balance}
                  placeholder={`Max $${finance.available_payout_balance.toFixed(2)}`}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="bg-paper border border-rule px-4 py-2.5 text-ink focus:outline-none w-64"
                />
                <button
                  type="submit"
                  disabled={finance.available_payout_balance <= 0}
                  className="px-6 py-2.5 bg-gain text-paper font-semibold hover:bg-gain/90 disabled:opacity-50 transition-colors uppercase"
                >
                  REQUEST PAYOUT WITHDRAWAL →
                </button>
              </div>
            </form>

            {/* Financial Ledger Entries */}
            <div className="border border-rule bg-paper p-6 space-y-4">
              <h3 className="font-serif text-2xl text-ink">Double-Entry Financial Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2.5 px-3">ENTRY ID</th>
                      <th className="py-2.5 px-3">SUB-ORDER</th>
                      <th className="py-2.5 px-3">TYPE</th>
                      <th className="py-2.5 px-3">AMOUNT</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/40">
                    {finance.ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-paper-sunk/40">
                        <td className="py-2.5 px-3 text-ink font-semibold">{entry.id.slice(0, 8)}...</td>
                        <td className="py-2.5 px-3 text-ash">{entry.sub_order_id.slice(0, 8)}...</td>
                        <td className="py-2.5 px-3 font-semibold">{entry.entry_type}</td>
                        <td className="py-2.5 px-3 font-semibold text-gain">${entry.amount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span className={entry.status === 'RELEASED' ? 'text-gain' : 'text-signal'}>
                            ● {entry.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-ash">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
