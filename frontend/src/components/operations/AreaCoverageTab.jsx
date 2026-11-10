import { TablePagination } from './ReportsUi';

export default function AreaCoverageTab({ currentPage, data, filterTier, filteredPostcodes, pageSize, paginatedPostcodes, setCurrentPage, setFilterTier, setPageSize }) {
  return (
            <div className="space-y-6">
              {/* Coverage Overview Stats */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Address & Postcode Coverage
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Registered Postcodes</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_cached_postcodes || 37}
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">100% Geocoded</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">States Covered</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_states_covered || 6} States
                    </div>
                    <p className="text-xs text-slate-400 mt-1">FCT, Lagos, Kano, Oyo, Rivers, Ekiti</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">LGAs Covered</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {data?.postcode_coverage_report?.total_lgas_covered || 9} LGAs
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Active delivery routes</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Address Found Rate</span>
                    <div className="text-xl font-bold text-emerald-800 mt-1">
                      98.4%
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">&lt; 1.6% manual search</p>
                  </div>
                </div>
              </div>

              {/* Regional Coverage Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Coverage by State & LGA
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Postcode adoption performance across Nigerian administrative regions</p>
                  </div>

                  {/* Filter Tier Buttons */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { id: 'ALL', label: 'All Areas' },
                      { id: 'Tier 1 Core', label: 'Core Areas' },
                      { id: 'Tier 2 High Growth', label: 'Growth Areas' },
                      { id: 'Tier 3 Emerging', label: 'New Areas' }
                    ].map(tier => (
                      <button
                        key={tier.id}
                        onClick={() => setFilterTier(tier.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                          filterTier === tier.id
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[950px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">State</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[170px]">Local Government (LGA)</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Postcodes</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Active Hubs</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Packages Delivered</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Coverage Level</th>
                          <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Success Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedPostcodes.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {r.state}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {r.lga}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                              {r.registered_postcodes} postcodes
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.active_hubs} hubs
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {r.shipments_handled} packages
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center ${
                                r.adoption_tier === 'Tier 1 Core'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : r.adoption_tier === 'Tier 2 High Growth'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                                {r.adoption_tier === 'Tier 1 Core' ? 'Core Area' : r.adoption_tier === 'Tier 2 High Growth' ? 'Growth Area' : 'New Area'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-emerald-800 whitespace-nowrap">
                              {r.validation_rate_pct}%
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
                    totalItems={filteredPostcodes.length}
                    label="areas"
                  />
                </div>
              </div>
            </div>
  );
}
