import React, { useState, useEffect } from 'react';
import { Eyebrow } from '../components/ui/Eyebrow';
import { vendorApi, SellerProfile, VendorSubOrder, VendorFinanceSummary } from '../api/vendor';

export const VendorPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sub-orders' | 'products' | 'finance' | 'onboarding'>('overview');
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
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [payoutAmount, setPayoutAmount] = useState<string>('');

  // Vendor New Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(49.99);
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodDiscountPct, setProdDiscountPct] = useState<number>(0);
  const [prodDesc, setProdDesc] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Variant Editor State for Product Expansion
  const [expandedProdId, setExpandedProdId] = useState<string | null>(null);
  const [varSku, setVarSku] = useState('');
  const [varName, setVarName] = useState('');
  const [varSize, setVarSize] = useState('');
  const [varColor, setVarColor] = useState('');
  const [varPrice, setVarPrice] = useState<number>(0);
  const [varStock, setVarStock] = useState<number>(10);
  const [isCreatingVar, setIsCreatingVar] = useState(false);

  const loadVendorData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await vendorApi.getProfile();
      if (res.has_seller_account && res.seller) {
        setHasAccount(true);
        setProfile(res.seller);
        if (res.seller.status === 'APPROVED') {
          const [soData, finData, prodData] = await Promise.all([
            vendorApi.getSubOrders(),
            vendorApi.getFinance(),
            vendorApi.getProducts().catch(() => []),
          ]);
          setSubOrders(soData);
          setFinance(finData);
          setVendorProducts(prodData);
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
      setErrorMsg(err.message || 'Failed to request payout withdrawal.');
    }
  };

  const handleCreateVendorProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsCreatingProduct(true);
    try {
      const res = await vendorApi.createProduct({
        name: prodName,
        sku: prodSku,
        price: prodPrice,
        total_stock: prodStock,
        discount_percentage: prodDiscountPct,
        description: prodDesc,
      });
      setSuccessMsg(res.message);
      setProdName('');
      setProdSku('');
      setProdPrice(49.99);
      setProdStock(50);
      setProdDiscountPct(0);
      setProdDesc('');
      setProdImageUrl('');
      const prods = await vendorApi.getProducts();
      setVendorProducts(prods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product listing.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleCreateVariant = async (productId: string, e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsCreatingVar(true);
    try {
      const res = await vendorApi.createVariant(productId, {
        name: varName,
        sku: varSku,
        price: varPrice > 0 ? varPrice : undefined,
        total_stock: varStock,
        size: varSize || undefined,
        color: varColor || undefined,
      });
      setSuccessMsg(res.message);
      setVarName('');
      setVarSku('');
      setVarPrice(0);
      setVarStock(10);
      setVarSize('');
      setVarColor('');
      const prods = await vendorApi.getProducts();
      setVendorProducts(prods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add product variant.');
    } finally {
      setIsCreatingVar(false);
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await vendorApi.deleteVariant(productId, variantId);
      setSuccessMsg(res.message);
      const prods = await vendorApi.getProducts();
      setVendorProducts(prods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete variant.');
    }
  };

  const handleDeactivateVendorProduct = async (productId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await vendorApi.deleteProduct(productId);
      setSuccessMsg(res.message);
      const prods = await vendorApi.getProducts();
      setVendorProducts(prods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deactivate product.');
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
              onClick={() => setActiveTab('products')}
              className={`px-5 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'border-signal text-signal bg-paper'
                  : 'border-transparent text-ash hover:text-ink'
              }`}
            >
              STORE PRODUCTS CATALOG ({vendorProducts.length})
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

        {/* TAB: STORE PRODUCTS CATALOG */}
        {hasAccount && profile?.status === 'APPROVED' && activeTab === 'products' && (
          <div className="space-y-8 font-mono text-xs">
            {/* Create Product Form */}
            <form onSubmit={handleCreateVendorProduct} className="border border-rule bg-paper p-6 space-y-4">
              <div className="border-b border-rule pb-2">
                <h3 className="font-serif text-2xl text-ink">List New Store Product</h3>
                <p className="text-ash text-[11px]">Add a product directly under your merchant store catalog.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Eyebrow className="text-ash block mb-1">PRODUCT NAME *</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Speed Runner Pro"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                  />
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">UNIQUE SKU *</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-SRP-001"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink uppercase"
                  />
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">PRICE ($) *</Eyebrow>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                  />
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">TOTAL STOCK *</Eyebrow>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                  />
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">DISCOUNT %</Eyebrow>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={prodDiscountPct}
                    onChange={(e) => setProdDiscountPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                  />
                </div>
              </div>

              <div>
                <Eyebrow className="text-ash block mb-1">PRODUCT DESCRIPTION</Eyebrow>
                <textarea
                  rows={2}
                  placeholder="Detailed product features, dimensions, specifications..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full bg-paper border border-rule px-3 py-2 text-ink resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="px-6 py-2.5 bg-ink text-paper font-semibold hover:bg-graphite transition-colors uppercase cursor-pointer"
                >
                  {isCreatingProduct ? 'CREATING...' : 'PUBLISH STORE PRODUCT →'}
                </button>
              </div>
            </form>

            {/* Vendor Products Table */}
            <div className="border border-rule bg-paper p-6 space-y-4">
              <h3 className="font-serif text-2xl text-ink">Active Merchant Catalog ({vendorProducts.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2.5 px-3">PRODUCT</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">PRICE / DISCOUNT</th>
                      <th className="py-2.5 px-3">AVAIL / TOTAL STOCK</th>
                      <th className="py-2.5 px-3">VARIANTS</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-ash font-mono">
                          No products listed under your merchant store yet.
                        </td>
                      </tr>
                    ) : (
                      vendorProducts.map((p) => (
                        <React.Fragment key={p.id}>
                          <tr className="border-b border-rule/50 hover:bg-paper-sunk/40">
                            <td className="py-3 px-3 font-semibold text-ink">{p.name}</td>
                            <td className="py-3 px-3 text-ash font-mono">{p.sku}</td>
                            <td className="py-3 px-3 font-semibold text-ink">
                              ${p.price.toFixed(2)}
                              {p.discount_percentage > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-signal/10 text-signal font-semibold">
                                  -{p.discount_percentage}% OFF
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="text-gain font-semibold">{p.available_stock}</span> / {p.total_stock}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <button
                                onClick={() => setExpandedProdId(expandedProdId === p.id ? null : p.id)}
                                className="px-2 py-1 text-[11px] border border-rule bg-paper-sunk hover:bg-paper font-semibold"
                              >
                                {p.variants && p.variants.length > 0 ? `⚙ ${p.variants.length} VARIANTS` : '+ ADD VARIANTS'}
                              </button>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold ${p.is_active ? 'bg-gain/20 text-gain' : 'bg-loss/20 text-loss'}`}>
                                {p.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              {p.is_active && (
                                <button
                                  onClick={() => handleDeactivateVendorProduct(p.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-loss/10 text-loss hover:bg-loss hover:text-paper transition-colors"
                                >
                                  DEACTIVATE
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Variant Manager Drawer */}
                          {expandedProdId === p.id && (
                            <tr className="bg-paper-sunk/60 border-b border-rule">
                              <td colSpan={7} className="p-4 space-y-4">
                                <div className="border border-rule bg-paper p-4 space-y-3">
                                  <h4 className="font-serif text-lg text-ink">Manage SKU Variants for "{p.name}"</h4>
                                  
                                  {/* Variant List Table */}
                                  {p.variants && p.variants.length > 0 ? (
                                    <table className="w-full text-left font-mono text-[11px] border border-rule">
                                      <thead>
                                        <tr className="bg-paper-sunk border-b border-rule text-ash">
                                          <th className="py-1.5 px-2">VARIANT SKU</th>
                                          <th className="py-1.5 px-2">NAME</th>
                                          <th className="py-1.5 px-2">SIZE</th>
                                          <th className="py-1.5 px-2">COLOR</th>
                                          <th className="py-1.5 px-2">PRICE</th>
                                          <th className="py-1.5 px-2">STOCK</th>
                                          <th className="py-1.5 px-2 text-right">ACTION</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {p.variants.map((v: any) => (
                                          <tr key={v.id} className="border-b border-rule/30">
                                            <td className="py-1.5 px-2 font-mono font-semibold">{v.sku}</td>
                                            <td className="py-1.5 px-2">{v.name}</td>
                                            <td className="py-1.5 px-2 text-ash">{v.size || '—'}</td>
                                            <td className="py-1.5 px-2 text-ash">{v.color || '—'}</td>
                                            <td className="py-1.5 px-2 font-semibold">${v.price.toFixed(2)}</td>
                                            <td className="py-1.5 px-2">{v.available_stock} / {v.total_stock}</td>
                                            <td className="py-1.5 px-2 text-right">
                                              <button
                                                onClick={() => handleDeleteVariant(p.id, v.id)}
                                                className="text-loss hover:underline text-[10px]"
                                              >
                                                [REMOVE]
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-ash text-[11px]">No variants added yet for this product.</p>
                                  )}

                                  {/* Add Variant Form */}
                                  <form onSubmit={(e) => handleCreateVariant(p.id, e)} className="border-t border-rule pt-3 space-y-3">
                                    <Eyebrow className="text-ash block">ADD NEW VARIANT (SIZE / COLOR / SKU)</Eyebrow>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                                      <input
                                        type="text"
                                        required
                                        placeholder="Variant SKU (e.g. SRP-L-BLK)"
                                        value={varSku}
                                        onChange={(e) => setVarSku(e.target.value)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink uppercase"
                                      />
                                      <input
                                        type="text"
                                        required
                                        placeholder="Variant Name (e.g. Large Black)"
                                        value={varName}
                                        onChange={(e) => setVarName(e.target.value)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Size (e.g. L, XL, 42)"
                                        value={varSize}
                                        onChange={(e) => setVarSize(e.target.value)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Color (e.g. Black)"
                                        value={varColor}
                                        onChange={(e) => setVarColor(e.target.value)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink"
                                      />
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Price ($${p.price})`}
                                        value={varPrice || ''}
                                        onChange={(e) => setVarPrice(parseFloat(e.target.value) || 0)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink"
                                      />
                                      <input
                                        type="number"
                                        required
                                        placeholder="Stock Qty"
                                        value={varStock}
                                        onChange={(e) => setVarStock(parseInt(e.target.value) || 0)}
                                        className="bg-paper border border-rule px-2 py-1.5 text-ink"
                                      />
                                    </div>
                                    <div className="flex justify-end">
                                      <button
                                        type="submit"
                                        disabled={isCreatingVar}
                                        className="px-4 py-1.5 bg-signal text-paper font-semibold hover:bg-signal/90 transition-colors uppercase text-[11px]"
                                      >
                                        {isCreatingVar ? 'ADDING...' : '+ ADD SKU VARIANT'}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
