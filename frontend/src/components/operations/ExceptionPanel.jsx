import { useState } from 'react';
import { Store, ShieldAlert, AlertTriangle, CheckCircle2, Clock, Search, RefreshCw, Download, ChevronRight, ChevronLeft, Copy, Check, X, Eye, Package, AlertOctagon, Info, RotateCcw, Truck } from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Issues', tooltip: 'All active delivery delays, overdue hub pickups, and customer claims' },
  { id: 'STALLED', label: 'Delayed in Transit', tooltip: 'Parcels with no courier scan or movement for over 24 hours' },
  { id: 'OVERDUE', label: 'Overdue for Pickup', tooltip: 'Parcels stored at pickup hubs past the 3-day free window' },
  { id: 'CLAIMS', label: 'Damage & Loss Claims', tooltip: 'Customer reports for damaged or lost parcels' },
  { id: 'RESOLVED', label: 'Resolved & Closed', tooltip: 'Issues resolved with approved compensation or completed delivery' },
];

// Layman Tooltip component
function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-xl pointer-events-none border border-slate-700 transition-all ${
            position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[260px] whitespace-normal text-center leading-snug'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap'
          }`}
        >
          {content}
          {position === 'bottom' ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text, position = 'bottom' }) {
  return (
    <Tooltip content={text} position={position}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 inline-block shrink-0" />
    </Tooltip>
  );
}

// Standardized Table Pagination
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'exceptions' }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= 0) return null;

  return (
    <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl">
      <div className="flex items-center gap-3">
        <div>
          Showing <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
          <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> {label}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="font-bold text-slate-900 px-1">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ExceptionPanel({ directory }) {
  const {
    actionNotice, activeTab, copiedCode, counts, currentPage, error, exceptions, fetchExceptions, formatIncidentType, handleCopyCode, handleExportCSV, handleOpenDossier, handleSeedExceptions, loading, pageSize, paginatedExceptions, refreshing, searchQuery, seeding, setActionNotice, setActiveTab, setCurrentPage, setPageSize, setSearchQuery, setSeverityFilter, severityFilter
  } = directory;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
          actionNotice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Page Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Delivery Issues
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {counts.total_open} Active Cases
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1" title="Track delayed shipments, overdue pickup parcels, and missing or damaged item claims.">
              Delivery Issues & Claims
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Stalled linehaul dispatches, overdue hub bays & customer claims.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSeedExceptions}
              disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Reset sample test delivery issues for demonstration"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={exceptions.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Export delivery issues to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchExceptions(true)}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Refresh delivery issues list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-100">
          {/* Total Active Issues */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Total parcels currently experiencing delivery delays, overdue holding, or active disputes."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Active Issues
                <InfoTooltip text="Total parcels currently experiencing delivery delays, overdue holding, or active disputes." />
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{counts.total_open}</div>
            <div className="text-[11px] text-rose-700 font-semibold mt-0.5 truncate" title={`₦${Number(counts.total_financial_exposure_ngn || 0).toLocaleString()} Claim Value at Risk`}>
              ₦{Number(counts.total_financial_exposure_ngn || 0).toLocaleString()} Exposure
            </div>
          </div>

          {/* Delayed in Transit */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Couriers with no handover scan or GPS progress update for over 24 hours."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Delayed Linehaul
                <InfoTooltip text="Couriers with no handover scan or GPS progress update for over 24 hours." />
              </span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-950 mt-1">{counts.stalled_transit}</div>
            <div className="text-[11px] text-amber-800 font-medium mt-0.5 truncate" title="Needs driver follow-up or re-dispatch">
              Re-dispatch needed
            </div>
          </div>

          {/* Overdue for Pickup */}
          <div
            className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
            title="Parcels held at neighborhood collection hubs exceeding the 3-day free window."
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center font-bold text-slate-700">
                Overdue Hub Bays
                <InfoTooltip text="Parcels held at neighborhood collection hubs exceeding the 3-day free window." />
              </span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-950 mt-1">{counts.overdue_holding}</div>
            <div className="text-[11px] text-orange-800 font-medium mt-0.5 truncate" title="Daily late storage fees applying past 3 days">
              Late fees applying
            </div>
          </div>

          {/* Damage & Loss Claims */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center">
                Damage & Loss Claims
                <InfoTooltip text="Formal compensation requests submitted by senders or recipients." />
              </span>
              <ShieldAlert className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-950 mt-1">{counts.open_claims}</div>
            <div className="text-[11px] text-purple-800 font-medium mt-0.5">
              Awaiting review & compensation
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Category Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          let badgeCount = 0;
          if (tab.id === 'ALL') badgeCount = counts.total_open;
          else if (tab.id === 'STALLED') badgeCount = counts.stalled_transit;
          else if (tab.id === 'OVERDUE') badgeCount = counts.overdue_holding;
          else if (tab.id === 'CLAIMS') badgeCount = counts.open_claims;
          else if (tab.id === 'RESOLVED') badgeCount = counts.resolved_count;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                isActive ? 'bg-slate-800 text-rose-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {badgeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Search and Severity Dropdown Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking Code, Customer, Recipient, Route..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || severityFilter !== 'ALL' || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('ALL');
                setActiveTab('ALL');
              }}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Clean Exceptions Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading operational exception ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">Failed to load exceptions</p>
            <p className="text-[11px] text-rose-600 font-mono">{error}</p>
            <button
              onClick={() => fetchExceptions(true)}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg mt-2"
            >
              Retry Connection
            </button>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">No Exceptions Found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              All deliveries, courier movements, and hub holding bays are currently operating normally under this criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  {/* Fixed column width & whitespace-nowrap prevents tracking ID wrapping */}
                  <th className="py-3 px-3.5 min-w-[175px] whitespace-nowrap">
                    <span className="flex items-center">
                      Waybill / Tracking No.
                      <InfoTooltip text="Unique shipment tracking code with service type." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[175px]">
                    <span className="flex items-center">
                      Issue & Priority
                      <InfoTooltip text="Delivery problem description and operational priority level." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Sender & Recipient
                      <InfoTooltip text="Customer sender and destination recipient." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px] max-w-[170px]">
                    <span className="flex items-center">
                      Current Location
                      <InfoTooltip text="Partner hub or courier currently holding the parcel." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[140px]">
                    <span className="flex items-center">
                      Route / Zones
                      <InfoTooltip text="Origin postal zone to destination postal zone." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">
                    <span className="flex items-center">
                      Parcel Value
                      <InfoTooltip text="Declared parcel value or customer compensation request." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">
                    <span className="flex items-center">
                      Late Storage Fee
                      <InfoTooltip text="Storage fee charged when a parcel is held past the 3-day free pickup window." />
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[120px]">
                    <span className="flex items-center">
                      Status
                      <InfoTooltip text="Current resolution or investigation status." />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-right min-w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedExceptions.map((exc) => {
                  const isCritical = exc.severity === 'CRITICAL';
                  const isHigh = exc.severity === 'HIGH';

                  return (
                    <tr
                      key={exc.id}
                      onClick={() => handleOpenDossier(exc)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      {/* 1. Tracking ID (Now strictly single-line, no wrapping!) */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {exc.tracking_code}
                          </span>
                          <button
                            onClick={(e) => handleCopyCode(exc.tracking_code, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                            title="Copy Tracking ID"
                          >
                            {copiedCode === exc.tracking_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono uppercase text-[9px] font-bold">
                            {exc.service_type || 'STANDARD'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Incident & Severity */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border whitespace-nowrap ${
                            isCritical
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isHigh
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {exc.severity}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5 truncate max-w-[190px]" title={exc.description}>
                          {formatIncidentType(exc.incident_type)}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[190px]" title={exc.description}>
                          {exc.description}
                        </div>
                      </td>

                      {/* 3. Shipper & Recipient */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={exc.customer_name}>
                          {exc.customer_name || 'Shipper'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={exc.recipient_name}>
                          ➔ {exc.recipient_name || 'Recipient'}
                        </div>
                      </td>

                      {/* 4. Custodian */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-semibold flex items-center gap-1.5 truncate max-w-[160px]" title={exc.current_custodian}>
                          {exc.hub_name ? (
                            <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : exc.rider_name ? (
                            <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{exc.current_custodian}</span>
                        </div>
                      </td>

                      {/* 5. Route */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-600 font-mono text-[11px] truncate max-w-[140px]" title={exc.route}>
                          {exc.route || 'Route Pending'}
                        </div>
                      </td>

                      {/* 6. Declared Value */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">
                          ₦{Number(exc.amount_ngn || 0).toLocaleString()}
                        </div>
                        {exc.type === 'CLAIM' && (
                          <div className="text-[9px] text-purple-700 font-bold uppercase">Claim Amount</div>
                        )}
                      </td>

                      {/* 7. Late Storage Fee */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {exc.holding_fee_ngn > 0 ? (
                          <span className="font-bold text-orange-600 font-mono">
                            ₦{Number(exc.holding_fee_ngn).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 8. Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                          exc.status === 'STORED_IN_BAY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : exc.status === 'IN_TRANSIT_TO_HUB'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : exc.status === 'SUBMITTED' || exc.status === 'UNDER_REVIEW'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : exc.status === 'RETURN_REQUESTED' || exc.status === 'DISPUTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {exc.status?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDossier(exc);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Standardized Table Pagination */}
        {!loading && exceptions.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalItems={exceptions.length}
            label="exceptions"
          />
        )}
      </div>

    </div>
  );
}
