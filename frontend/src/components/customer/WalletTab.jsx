import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Lock, Plus, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';

export default function WalletTab({ wallet, transactions, fetchCustomerData, showToast, getAuthHeaders }) {
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topupAmount, setTopupAmount] = useState('5000');

  const handleWalletTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid top-up amount', 'error');
      return;
    }
    try {
      setIsToppingUp(true);
      const res = await fetch('/api/v1/customer/wallet/topup', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Wallet credited with ₦${amt.toLocaleString('en-NG')}`);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Topup failed', 'error');
      }
    } catch (err) {
      showToast('Topup failed: ' + err.message, 'error');
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          {/* Main Balance & Top-up Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-[#062419] text-white rounded-2xl shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Customer Wallet Balance</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Closed-Loop Prepaid Credit
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight">
                ₦{wallet ? Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <p className="text-xs text-emerald-200/80">
                Accounting Ledger Balance: ₦{wallet?.ledgerBalance !== undefined ? Number(wallet.ledgerBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : (wallet ? Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00')} NGN • Escrow Protected
              </p>
            </div>

            <div className="space-y-3 lg:max-w-xs w-full">
              <div className="text-[11px] font-semibold text-emerald-200">Prepaid Top-Up (Card / Bank Transfer):</div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₦</span>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800 text-white font-mono text-xs border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={handleWalletTopup}
                  disabled={isToppingUp}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-md whitespace-nowrap flex items-center space-x-1.5"
                >
                  {isToppingUp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crediting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Top Up</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center space-x-1.5 text-[10px]">
                <span className="text-emerald-300/70 text-[9px] uppercase font-bold">Quick:</span>
                {[2000, 5000, 10000, 20000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmount(preset.toString())}
                    className={`px-2 py-1 rounded-lg border font-mono transition ${
                      topupAmount === preset.toString()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    +{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Regulatory & Fund Protection Policy Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-amber-950 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-amber-200/70 text-amber-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Closed-Loop Prepaid Credit & Fund Protection Policy (CBN Regulatory Notice)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-amber-900/90">
              <div className="p-3 bg-white/70 rounded-xl border border-amber-200/60 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Non-Withdrawable & Non-Transferable</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Funds deposited into your wallet are <strong>prepaid logistics service credits</strong> usable exclusively to pay for parcel dispatches, storage, and courier services on Hotbox. In compliance with CBN stored-value regulations, wallet balances <strong>cannot be transferred to another user</strong> or withdrawn to arbitrary bank accounts.
                </p>
              </div>

              <div className="p-3 bg-white/70 rounded-xl border border-amber-200/60 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-slate-900">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Dispute Resolution & Source Reversals</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  In the event of an order cancellation or approved dispute resolution, eligible monetary refunds are <strong>returned strictly to the same source bank account or debit card details</strong> that originally paid the funds. Unsettled courier fees are escrow-safeguarded by licensed payment processors (Paystack/Flutterwave).
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Recent Payment Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Payment Ledger ({transactions.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Immutable double-entry transaction trail with balance auditing.
                </p>
              </div>
              <button
                onClick={fetchCustomerData}
                className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-emerald-700 transition px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <Wallet className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No Transactions Recorded Yet</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Fund your prepaid wallet or book your first parcel delivery to see live real-time ledger records appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isCredit = tx.transaction_type === 'WALLET_TOPUP' || tx.transaction_type === 'DISPUTE_REFUND' || tx.transaction_type === 'HUB_COMMISSION' || tx.transaction_type === 'RIDER_PAYOUT';
                  const isRefund = tx.transaction_type === 'DISPUTE_REFUND';
                  const amountNum = parseFloat(tx.amount_ngn || 0);

                  let title = 'Logistics Payment';
                  if (tx.transaction_type === 'WALLET_TOPUP') {
                    title = 'Prepaid Logistics Credit Top-up (Bank/Card)';
                  } else if (tx.transaction_type === 'BOOKING_PAYMENT') {
                    title = tx.tracking_code ? `Shipment Dispatch Booking (${tx.tracking_code})` : 'Shipment Dispatch Booking';
                  } else if (tx.transaction_type === 'DISPUTE_REFUND') {
                    title = tx.tracking_code ? `Dispute Resolution / Cancellation Refund (${tx.tracking_code})` : 'Dispute Resolution / Cancellation Refund';
                  } else if (tx.transaction_type === 'HUB_COMMISSION') {
                    title = 'Hub Host Partner Commission Credit';
                  } else if (tx.transaction_type === 'RIDER_PAYOUT') {
                    title = 'Rider Delivery Payout Credit';
                  }

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                            isRefund
                              ? 'bg-blue-100 text-blue-700'
                              : isCredit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isRefund ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{title}</span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                tx.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-2">
                            <span>Ref: {tx.reference || tx.id.slice(0, 16)}</span>
                            <span>•</span>
                            <span>Gateway: {tx.payment_gateway || 'WALLET'}</span>
                            {tx.created_at && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(tx.created_at).toLocaleString('en-NG', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div
                          className={`text-sm font-black font-mono ${
                            isCredit ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₦{amountNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                        {tx.balance_after_ngn !== undefined && tx.balance_after_ngn !== null && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Bal: ₦{Number(tx.balance_after_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
  );
}
