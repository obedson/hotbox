import { Upload, CheckCircle2, Download, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ShipmentsPanel({ bulkCount, bulkResult, fetchShipments, handleDownloadManifestCsv, handleExecuteBulk, handleSearchSubmit, loading, manifests, manifestsLoading, searchQuery, selectedManifestId, setBulkCount, setSearchQuery, setSelectedManifestId, setStatusFilter, shipments, shipmentsCounts, shipmentsLoading, shipmentsPage, shipmentsTotal, shipmentsTotalPages, statusFilter }) {
  return (
      <div className="space-y-6">
        {/* SECTION 1: BULK SHIPMENT INGESTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bulk Shipment Ingestion & Manifest Generation</h3>
                <p className="text-xs text-slate-500">Dispatch batches of parcels across Nigerian digital postcodes into PostgreSQL ledger</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              ● Live Production DB Integration
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-700 font-semibold">Parcels to Ingest:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={bulkCount}
                onChange={e => setBulkCount(parseInt(e.target.value, 10) || 1)}
                className="w-20 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExecuteBulk}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{loading ? 'Processing Batch...' : `Execute Bulk Dispatch (${bulkCount} Parcels)`}</span>
            </button>
          </div>

          {bulkResult && (
            <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs space-y-1.5 animate-in fade-in">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Batch Ingested Successfully into Live Database!
              </div>
              <div className="text-slate-700 flex flex-wrap gap-4 pt-1">
                <div>Manifest ID: <strong className="font-mono text-indigo-700">{bulkResult.batchId}</strong></div>
                <div>Total Processed: <strong>{bulkResult.totalProcessed} Parcels</strong></div>
                <div>Sample Tracking: <strong className="font-mono text-slate-900">{bulkResult.sampleTracking}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: LIVE DISPATCH MANIFESTS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Live Dispatch Manifests</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {manifests.length} Batches
                </span>
              </div>
              <p className="text-xs text-slate-500">Grouped batch handovers to courier fleet and destination partner hubs</p>
            </div>

            {selectedManifestId !== 'ALL' && (
              <button
                onClick={() => setSelectedManifestId('ALL')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 self-start sm:self-auto bg-indigo-50 px-2.5 py-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Manifest Filter</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Manifest ID</th>
                  <th className="py-2.5 px-3">Dispatch Date</th>
                  <th className="py-2.5 px-3">Parcels</th>
                  <th className="py-2.5 px-3">Destination Hubs</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manifestsLoading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading dispatch manifests from database...
                    </td>
                  </tr>
                ) : manifests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No dispatch manifests found in database.
                    </td>
                  </tr>
                ) : (
                  manifests.map((row) => (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50 transition ${selectedManifestId === row.id ? 'bg-indigo-50/60' : ''}`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {row.manifest_code}
                        {selectedManifestId === row.id && (
                          <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 bg-indigo-600 text-white font-bold rounded">
                            Active Filter
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {row.actual_parcels || row.parcel_count} Items
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={row.destination_hubs_summary}>
                        {row.destination_hubs_summary || 'Metro Partner Hubs'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          row.status === 'IN_TRANSIT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {row.status === 'IN_TRANSIT' ? 'In Transit' : 'Delivered'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedManifestId(row.id === selectedManifestId ? 'ALL' : row.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            {selectedManifestId === row.id ? 'Show All' : 'Filter Parcels'}
                          </button>
                          <button
                            onClick={() => handleDownloadManifestCsv(row.id, row.manifest_code)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            title="Download Manifest CSV"
                          >
                            <Download className="w-3 h-3" />
                            <span>CSV</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: LIVE ENTERPRISE SHIPMENTS LEDGER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Shipments Volume Ledger</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  {shipmentsTotal.toLocaleString('en-NG')} Total
                </span>
              </div>
              <p className="text-xs text-slate-500">Live PostgreSQL feed of individual customer dispatches with NDAPS routing</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tracking, recipient, postcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-60 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Search
              </button>
            </form>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { key: 'ALL', label: 'All Shipments', count: shipmentsCounts.all },
              { key: 'IN_TRANSIT_TO_HUB', label: 'Active In-Transit', count: shipmentsCounts.inTransit },
              { key: 'COLLECTED_AT_HUB', label: 'Collected / Delivered', count: shipmentsCounts.delivered },
              { key: 'DISPUTED', label: 'Disputes & Exceptions', count: shipmentsCounts.disputed },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.key ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count?.toLocaleString('en-NG') || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Shipments Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Recipient & Contact</th>
                  <th className="py-2.5 px-3">Delivery Postcode</th>
                  <th className="py-2.5 px-3">Destination Hub</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Manifest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipmentsLoading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Querying PostgreSQL shipments table...
                    </td>
                  </tr>
                ) : shipments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No shipments found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  shipments.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-indigo-600">{s.tracking_code}</div>
                        <div className="text-[10px] text-slate-400">{s.service_type || 'DOOR_TO_HUB'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{s.recipient_name}</div>
                        <div className="text-[10px] text-slate-500">{s.recipient_phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-slate-800">{s.recipient_postcode}</div>
                        <div className="text-[10px] text-slate-500 max-w-xs truncate">{s.recipient_address_text}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{s.destination_hub_name || 'Assigned Partner Hub'}</div>
                        <div className="text-[10px] text-indigo-600 font-mono">{s.destination_hub_postcode || 'NDAPS Hub'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          s.status === 'COLLECTED_AT_HUB'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'DISPUTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {s.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        ₦{parseFloat(s.pricing_total_ngn || 1300).toLocaleString('en-NG')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {s.manifest_code || 'UNASSIGNED'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing page <strong className="text-slate-900">{shipmentsPage}</strong> of <strong className="text-slate-900">{shipmentsTotalPages}</strong> ({shipmentsTotal.toLocaleString('en-NG')} shipments total)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={shipmentsPage <= 1 || shipmentsLoading}
                onClick={() => fetchShipments(shipmentsPage - 1, statusFilter, searchQuery, selectedManifestId)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="px-2 font-mono text-xs font-bold text-slate-800">
                {shipmentsPage} / {shipmentsTotalPages}
              </span>
              <button
                disabled={shipmentsPage >= shipmentsTotalPages || shipmentsLoading}
                onClick={() => fetchShipments(shipmentsPage + 1, statusFilter, searchQuery, selectedManifestId)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
