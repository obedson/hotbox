import { InfoTooltip, TablePagination } from './ReportsUi';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function DeliverySpeedTab({ currentPage, data, filteredSlaRecords, pageSize, paginatedSlaRecords, setCurrentPage, setPageSize }) {
  return (
            <div className="space-y-6">
              {/* Delivery Time Targets */}
              <div>
                <div className="flex items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Delivery Time Targets
                  </h3>
                  <InfoTooltip text="Standard target delivery times vs actual performance for each stage" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'Sender to Driver Handover', actual: '38 mins', target: '45 mins', status: 'On Schedule' },
                    { label: 'Drop-off at Hub', actual: '11 mins', target: '15 mins', status: 'On Schedule' },
                    { label: 'Direct Door Delivery', actual: '18.4 hours', target: '24 hours', status: 'On Schedule' },
                    { label: 'Transfer Between Hubs', actual: '34.2 hours', target: '48 hours', status: 'On Schedule' }
                  ].map((b, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{b.label}</span>
                        <span className="font-semibold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200 text-[10px]">
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-slate-900">{b.actual}</span>
                        <span className="text-xs text-slate-400">Target: {b.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Speed by Service Type Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Delivery Speed by Service Type
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">Delivery Type</th>
                        <th className="py-3 px-4 whitespace-nowrap">Total Packages</th>
                        <th className="py-3 px-4 whitespace-nowrap">Share</th>
                        <th className="py-3 px-4 whitespace-nowrap">Total Sales</th>
                        <th className="py-3 px-4 whitespace-nowrap">Average Cost</th>
                        <th className="py-3 px-4 whitespace-nowrap">Average Time</th>
                        <th className="py-3 px-4 whitespace-nowrap">On-Time Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data?.delivery_sla_report?.service_breakdown?.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                            <span>{s.service_name}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold whitespace-nowrap">{s.count} packages</td>
                          <td className="py-3 px-4 whitespace-nowrap">{s.pct_of_total}%</td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">₦{s.total_revenue_ngn.toLocaleString()}</td>
                          <td className="py-3 px-4 whitespace-nowrap">₦{s.avg_cost_ngn.toLocaleString()}</td>
                          <td className="py-3 px-4 whitespace-nowrap">{s.avg_transit_hours} hrs</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center">
                              {s.on_time_rate_pct}% On-Time
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Deliveries Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Recent Deliveries & Times
                    </h3>
                    <InfoTooltip text="Live list of recent shipments showing transit time and arrival status" />
                  </div>
                  <span className="text-xs text-slate-400">{filteredSlaRecords.length} records</span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4 whitespace-nowrap">Tracking ID</th>
                          <th className="py-3 px-4 whitespace-nowrap">Delivery Type</th>
                          <th className="py-3 px-4 whitespace-nowrap">Destination Hub</th>
                          <th className="py-3 px-4 whitespace-nowrap">Date & Time Sent</th>
                          <th className="py-3 px-4 whitespace-nowrap">Time Taken</th>
                          <th className="py-3 px-4 whitespace-nowrap">Current Status</th>
                          <th className="py-3 px-4 whitespace-nowrap">Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedSlaRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                              {r.tracking_code}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-slate-100 rounded text-[11px] font-semibold text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.service_type === 'DOOR_TO_HUB' ? 'Door to Hub' : r.service_type === 'HUB_TO_HUB' ? 'Hub to Hub' : 'Door to Door'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-medium whitespace-nowrap">
                              {r.destination_hub}
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {new Date(r.picked_up_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                              {r.duration_hours}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap inline-flex items-center">
                                {r.custody_status === 'IN_TRANSIT_TO_HUB' ? 'On The Move' : r.custody_status === 'STORED_IN_BAY' ? 'At Hub Locker' : r.custody_status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {r.sla_status === 'ON_TIME' ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit whitespace-nowrap">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  On-Time
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit whitespace-nowrap">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  Late
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
                    totalItems={filteredSlaRecords.length}
                    label="shipments"
                  />
                </div>
              </div>
            </div>
  );
}
