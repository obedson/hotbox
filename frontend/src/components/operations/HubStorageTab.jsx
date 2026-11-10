import { InfoTooltip, TablePagination } from './ReportsUi';

export default function HubStorageTab({ currentPage, data, filteredHubs, pageSize, paginatedHubs, setCurrentPage, setPageSize }) {
  return (
            <div className="space-y-6">
              {/* Locker Compartment Tiers */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Locker Compartments & Storage Space
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Small Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        Letters & Pouches
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.small?.occupied || 6} / {data?.hub_capacity_report?.bay_tiers?.small?.total || 9} Full
                    </div>
                    <p className="text-xs text-slate-400 mt-1">66.7% occupancy rate</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Medium Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        Boxes & Cartons
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.medium?.occupied || 0} / {data?.hub_capacity_report?.bay_tiers?.medium?.total || 15} Full
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">All Available</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-600">Large Lockers</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        Big Crates & Luggage
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {data?.hub_capacity_report?.bay_tiers?.large?.occupied || 0} / {data?.hub_capacity_report?.bay_tiers?.large?.total || 15} Full
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">All Available</p>
                  </div>
                </div>
              </div>

              {/* Hub Locker Space Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Hub Locker Space & Load
                    </h3>
                    <InfoTooltip text="Storage capacity, occupied lockers, and dwell time for each partner hub" />
                  </div>
                  <span className="text-xs text-slate-400">{filteredHubs.length} Facilities • 39 Total Lockers</span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Hub Name</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Location</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Status</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Space Used</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Space Full %</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Overdue Packages</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Avg Storage Days</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Storage Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedHubs.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {h.hub_name}
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {h.location}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap inline-flex items-center ${
                                h.status === 'accredited'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {h.status === 'accredited' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {h.occupied_bays} of {h.total_bays} lockers
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{ width: `${Math.min(100, h.utilization_pct)}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold text-slate-900 text-xs">{h.utilization_pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {h.overdue_count > 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center">
                                  {h.overdue_count} overdue
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                              {h.average_holding_days} days
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-800 whitespace-nowrap">
                              ₦{h.revenue_generated_ngn.toLocaleString()}
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
                    totalItems={filteredHubs.length}
                    label="hubs"
                  />
                </div>
              </div>
            </div>
  );
}
