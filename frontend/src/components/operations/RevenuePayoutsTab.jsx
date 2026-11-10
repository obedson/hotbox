import { TablePagination } from './ReportsUi';

export default function RevenuePayoutsTab({ currentPage, filterTier, filteredSettlements, pageSize, paginatedSettlements, setCurrentPage, setFilterTier, setPageSize, summary }) {
  return (
            <div className="space-y-6">
              {/* Revenue & Earnings Summary Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Revenue & Earnings Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Sales</span>
                    <div className="text-xl font-bold text-emerald-950 mt-1">
                      ₦{summary.gross_revenue_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">100% Customer Paid Bookings</p>
                  </div>

                  <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Hub Host Earnings</span>
                    <div className="text-xl font-bold text-blue-950 mt-1">
                      ₦{summary.hub_payouts_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">35% Storage & Release Pool</p>
                  </div>

                  <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200/80">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Driver Earnings</span>
                    <div className="text-xl font-bold text-indigo-950 mt-1">
                      ₦{summary.courier_earnings_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-indigo-700 mt-1">35% Pickup & Delivery Payouts</p>
                  </div>

                  <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200/80">
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Company Margin</span>
                    <div className="text-xl font-bold text-purple-950 mt-1">
                      ₦{summary.platform_margin_ngn.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-purple-700 mt-1">30% Platform Commission</p>
                  </div>
                </div>
              </div>

              {/* Partner Payouts Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Partner Payouts & Balances
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Track and verify payments for hubs and dispatch fleets</p>
                  </div>

                  {/* Filter Status Pills */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { id: 'ALL', label: 'All Partners' },
                      { id: 'Settled', label: 'Paid' },
                      { id: 'Pending Batch Approval', label: 'Pending Approval' },
                      { id: 'Processing', label: 'Processing' }
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setFilterTier(st.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                          filterTier === st.id
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1100px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Partner Name</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Partner Type</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Packages Handled</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Total Handled</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Total Earnings</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Already Paid</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Unpaid Balance</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[160px]">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedSettlements.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {p.partner_name}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {p.partner_type === 'Community Partner Hub' ? 'Partner Hub' : 'Dispatch Fleet'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {p.orders_handled} packages
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              ₦{p.gross_handled_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-800 whitespace-nowrap">
                              ₦{p.commission_payable_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              ₦{p.amount_paid_out_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-amber-800 whitespace-nowrap">
                              ₦{p.pending_settlement_ngn.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {p.settlement_status === 'Settled' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center">
                                  Paid
                                </span>
                              ) : p.settlement_status === 'Processing' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap inline-flex items-center">
                                  Processing
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center">
                                  Pending Approval
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalItems={filteredSettlements.length}
                    label="partners"
                  />
                </div>
              </div>
            </div>
  );
}
