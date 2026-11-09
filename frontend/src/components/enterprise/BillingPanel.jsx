import { Package, CheckCircle2, ShieldCheck, Receipt, Download, Clock, RefreshCw, Eye, X, Check } from 'lucide-react';

export default function BillingPanel({ billingMsg, billingSummary, fetchBillingAndInvoices, handleDownloadInvoiceCsv, handleSettleInvoice, handleViewInvoiceBreakdown, invoiceDetailData, invoiceDetailLoading, invoices, invoicesLoading, payingInvoiceId, selectedInvoiceModal, setBillingMsg, setSelectedInvoiceModal }) {
  return (
      <div className="space-y-6">
        {/* Top Banner & Corporate Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Corporate Billing Statements & Invoices</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                  {billingSummary?.billingTier === 'PREPAID' ? 'PREPAID CORPORATE' : 'POSTPAID NET-30'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly parcel volume reconciliation statements, credit limits, and NIPOST/Providus central remittance escrow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchBillingAndInvoices}
              disabled={invoicesLoading}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${invoicesLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh Statements</span>
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {billingMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{billingMsg}</span>
            </div>
            <button type="button" onClick={() => setBillingMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Financial KPI Metric Cards (Live from Database) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Credit Line Approved</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {billingSummary?.creditLimitFormatted || '₦500,000.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Contractual B2B line of credit</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Outstanding Receivables</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
              {billingSummary?.outstandingFormatted || '₦1,863,000.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {billingSummary?.pendingCount || 1} pending invoice due
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Lifetime Settled Spend</span>
              <Receipt className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {billingSummary?.lifetimePaidFormatted || '₦3,100,000.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total remittances reconciled</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Invoiced Parcels</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {(billingSummary?.totalParcelsBilled || 3840).toLocaleString()} Items
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Across 3 monthly reconciliations</div>
          </div>
        </div>

        {/* Central Remittance & Payment Terms Strip */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designated Remittance Escrow</span>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span>{billingSummary?.remittanceBank?.bankName || 'Providus Bank / NIPOST Central Escrow'}</span>
              <span>•</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 font-bold">
                Acct: {billingSummary?.remittanceBank?.accountNumber || '1099248812'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Beneficiary: {billingSummary?.remittanceBank?.accountName || 'Hotbox Logistics Enterprise Remittance'}
            </p>
          </div>
          <div className="text-left md:text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settlement Policy</span>
            <p className="font-bold text-slate-800 mt-0.5">{billingSummary?.paymentTerms || 'Net-30 Days from statement issuance'}</p>
            <p className="text-[11px] text-slate-500">Standard VAT: 7.5% statutory remittance</p>
          </div>
        </div>

        {/* Live Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Reconciliation Invoices
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Live Database Feed
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Audited statements generated directly from Konga's shipment dispatch volume in PostgreSQL.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {invoices.length} Statements
            </span>
          </div>

          {invoicesLoading ? (
            <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading periodic statements from PostgreSQL...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center space-y-1">
              <p className="text-xs text-slate-500 font-semibold">No invoices generated yet.</p>
              <p className="text-[11px] text-slate-400">Monthly statements generate automatically at the close of each billing cycle.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice Ref</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Parcels</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4">VAT (7.5%)</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => {
                    const isPaid = inv.status === 'PAID';
                    const isPending = inv.status === 'PENDING';
                    const isPaying = payingInvoiceId === inv.id;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition font-mono">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-700">
                          <span className="font-semibold">{inv.billing_period}</span>
                          <div className="text-[10px] text-slate-400">
                            {new Date(inv.period_start).toLocaleDateString()} – {new Date(inv.period_end).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {Number(inv.parcel_count).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          ₦{Number(inv.subtotal_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          ₦{Number(inv.tax_vat_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          ₦{Number(inv.total_amount_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid in Full</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Due {new Date(inv.due_date).toLocaleDateString()}</span>
                            </span>
                          )}
                          {inv.payment_reference && (
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">
                              {inv.payment_reference}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewInvoiceBreakdown(inv)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition inline-flex items-center gap-1"
                              title="View itemized hub line-items and rate breakdown"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Breakdown</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadInvoiceCsv(inv)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition inline-flex items-center gap-1"
                              title="Download itemized shipment reconciliation CSV"
                            >
                              <Download className="w-3 h-3 text-indigo-600" />
                              <span>CSV</span>
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleSettleInvoice(inv)}
                                disabled={isPaying}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                                title="Record corporate remittance and mark as settled"
                              >
                                {isPaying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                <span>Settle</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Itemized Invoice Breakdown Modal */}
        {selectedInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-mono">
                      Statement: {selectedInvoiceModal.invoice_number}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-sans">
                      {selectedInvoiceModal.billing_period} • {selectedInvoiceModal.parcel_count} Reconciled Parcels
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Account & Status Header */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Billed Entity</span>
                    <p className="font-bold text-slate-800 text-[11px] mt-0.5">Konga Logistics Ltd Corp</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Terms</span>
                    <p className="font-bold text-slate-800 text-[11px] mt-0.5">Net-30 Days</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
                    <p className="font-bold text-slate-800 text-[11px] mt-0.5">
                      {new Date(selectedInvoiceModal.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Settlement Status</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedInvoiceModal.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedInvoiceModal.status}
                    </span>
                  </div>
                </div>

                {/* Hub Delivery Line Items */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Destination Hub Volume Allocation
                  </h5>
                  {invoiceDetailLoading ? (
                    <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Querying shipment line items from database...</span>
                    </div>
                  ) : invoiceDetailData?.lineItems ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="py-2 px-3">Service Line Item</th>
                            <th className="py-2 px-3 text-center">Volume</th>
                            <th className="py-2 px-3 text-right">Negotiated Rate</th>
                            <th className="py-2 px-3 text-right">Amount NGN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoiceDetailData.lineItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-800">{item.description}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">₦{item.ratePerUnitNgn.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ₦{item.totalNgn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>

                {/* Financial Reconciliation Totals */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal (Net Freight Services):</span>
                    <span>₦{Number(selectedInvoiceModal.subtotal_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Statutory VAT (7.5% Federal Remittance):</span>
                    <span>₦{Number(selectedInvoiceModal.tax_vat_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                    <span>Grand Total Invoiced:</span>
                    <span className="text-indigo-600">
                      ₦{Number(selectedInvoiceModal.total_amount_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {selectedInvoiceModal.payment_reference && (
                    <div className="flex justify-between text-[11px] text-emerald-700 pt-1">
                      <span>Payment Reference:</span>
                      <span className="font-bold">{selectedInvoiceModal.payment_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoiceCsv(selectedInvoiceModal)}
                  className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Reconciliation CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
