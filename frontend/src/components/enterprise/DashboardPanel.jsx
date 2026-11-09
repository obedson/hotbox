import { Package, Key, Webhook, Upload, CheckCircle2, Receipt, Clock } from 'lucide-react';

export default function DashboardPanel({ stats, setActiveNav }) {
  return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Total merchant packages dispatched in the billing cycle">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="font-bold text-slate-700">Monthly Parcels</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.monthlyParcelsFormatted || '1,420 Items'}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              ↑ {stats?.growthMoM || 12}% vs last month
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Parcels currently en route with courier riders">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="font-bold text-slate-700">In-Transit</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.activeInTransitFormatted || '38 Dispatches'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {stats?.activeInTransitSubtext || 'Within delivery SLA'}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Percentage of consignments completed within guaranteed delivery window">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="font-bold text-slate-700">On-Time SLA</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {stats?.onTimeSlaFormatted || '98.4%'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Target: &gt; 95% {stats?.completedCount ? `(${stats.completedCount.toLocaleString('en-NG')} done)` : ''}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" title="Current invoice balance accrued in cycle">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="font-bold text-slate-700">Monthly Spend</span>
              <Receipt className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.monthlySpendFormatted || '₦1,850,000'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              ₦{stats?.flatRateNgn ? stats.flatRateNgn.toLocaleString('en-NG') : '1,300'} flat rate
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setActiveNav && setActiveNav('shipments')}
                className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition"
                title="Upload CSV consignment batch or schedule linehaul"
              >
                <Upload className="w-5 h-5 text-indigo-600 mb-2" />
                <div className="font-bold text-xs text-slate-900">Bulk Ingestion</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Upload CSV or batch dispatch</div>
              </button>
              <button
                onClick={() => setActiveNav && setActiveNav('api_keys')}
                className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition"
                title="Manage REST API tokens and Sandbox credentials"
              >
                <Key className="w-5 h-5 text-emerald-600 mb-2" />
                <div className="font-bold text-xs text-slate-900">API Credentials</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Manage integration keys</div>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Integration Health</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">Production REST API</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Operational (100%)</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">Webhook Delivery Success</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">99.8% Delivered</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">NDAPS Resolution Speed</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">18ms Avg Latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
