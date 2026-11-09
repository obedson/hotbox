import { Webhook, CheckCircle2, ShieldCheck, Copy, Plus, FileText, RefreshCw, Eye, X, Trash2, Check, Play, Pause, EyeOff, Send, Activity, Lock } from 'lucide-react';
import { AVAILABLE_WEBHOOK_EVENTS } from './useWebhooks';

export default function WebhooksPanel({ copiedKeyId, deletingWebhookId, fetchWebhooksAndLogs, handleDeleteWebhook, handleRegisterWebhook, handleTestPing, handleToggleWebhook, isRegisterWebhookOpen, loading, newWebhookUrl, selectedPayloadLog, selectedWebhookEvents, setIsRegisterWebhookOpen, setNewWebhookUrl, setSelectedPayloadLog, setWebhookDocTab, setWebhookMsg, setWebhookTestFeedback, showSecretIds, testingWebhookId, toggleEventSelection, toggleSecretVisibility, togglingWebhookId, webhookDocTab, webhookLogs, webhookLogsLoading, webhookMsg, webhookTestFeedback, webhooks, copyToClipboard }) {
  return (
      <div className="space-y-6">
        {/* Top Banner & Quick Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Real-Time Webhook Listeners & Event Subscriptions</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  Live HMAC Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated HTTPS callbacks with HMAC SHA-256 signatures for parcel custody transitions, OTP redemptions, and NDAPS address validations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchWebhooksAndLogs}
              disabled={webhookLogsLoading}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${webhookLogsLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh Logs</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRegisterWebhookOpen(!isRegisterWebhookOpen)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isRegisterWebhookOpen ? 'Close Form' : 'Register New Endpoint'}</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Configured Endpoints</span>
              <Webhook className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{webhooks.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Tenant-isolated listeners</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active Listeners</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              {webhooks.filter(w => w.is_active).length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {webhooks.some(w => !w.is_active) ? `${webhooks.filter(w => !w.is_active).length} paused` : 'All endpoints active'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Delivery Attempts</span>
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {webhooks.reduce((acc, w) => acc + (parseInt(w.total_deliveries) || 0), 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Logged in PostgreSQL</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Delivery Success Rate</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {(() => {
                const total = webhooks.reduce((acc, w) => acc + (parseInt(w.total_deliveries) || 0), 0);
                const success = webhooks.reduce((acc, w) => acc + (parseInt(w.success_deliveries) || 0), 0);
                return total > 0 ? `${Math.round((success / total) * 100)}%` : '100%';
              })()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">HTTP 2xx acknowledgments</div>
          </div>
        </div>

        {/* Test Ping Feedback Banner */}
        {webhookTestFeedback && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md animate-fade-in relative">
            <button
              type="button"
              onClick={() => setWebhookTestFeedback(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                webhookTestFeedback.delivery?.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                <Send className="w-4 h-4" />
              </div>
              <div className="space-y-1 pr-6">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span>{webhookTestFeedback.message}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    webhookTestFeedback.delivery?.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    HTTP {webhookTestFeedback.delivery?.response_status || 'ERR'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono truncate max-w-xl">
                  Target: {webhookTestFeedback.targetUrl}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Header: <span className="text-emerald-400">x-hotbox-signature:</span> {webhookTestFeedback.signatureHeader}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form (Collapsible) */}
        {isRegisterWebhookOpen && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Register New Webhook Endpoint</h4>
                <p className="text-xs text-slate-500">Provide an HTTPS endpoint to receive live JSON payloads from Hotbox.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterWebhookOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target URL Endpoint (HTTPS Required for Production)
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/fulfillment/webhook"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hotbox sends an HTTP POST request with an HMAC SHA-256 signature in the <code className="text-slate-700 font-bold">x-hotbox-signature</code> header.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Subscribed Event Topics
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {AVAILABLE_WEBHOOK_EVENTS.map(ev => {
                    const isChecked = selectedWebhookEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                          isChecked ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-100/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEventSelection(ev.id)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-bold text-slate-800">{ev.label}</span>
                          <p className="text-[11px] text-slate-500 leading-tight">{ev.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterWebhookOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Register Endpoint & Generate Secret</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {webhookMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{webhookMsg}</span>
            </div>
            <button type="button" onClick={() => setWebhookMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Registered Listeners Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Webhook Listeners</h4>
              <p className="text-[11px] text-slate-500">Live PostgreSQL endpoints registered to Konga Logistics Ltd Corp</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {webhooks.length} {webhooks.length === 1 ? 'Endpoint' : 'Endpoints'}
            </span>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Webhook className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">No webhooks registered yet.</p>
              <p className="text-[11px] text-slate-400">Click "Register New Endpoint" above to configure your receiver URL.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {webhooks.map(wh => {
                const isVisible = showSecretIds[wh.id];
                const isTesting = testingWebhookId === wh.id;
                const isToggling = togglingWebhookId === wh.id;
                const isDeleting = deletingWebhookId === wh.id;

                return (
                  <div key={wh.id} className="p-4 hover:bg-slate-50/50 transition space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 break-all">
                            {wh.target_url}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            wh.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${wh.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            {wh.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Created: {new Date(wh.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Deliveries: {wh.total_deliveries || 0} attempts ({wh.success_deliveries || 0} successful)</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestPing(wh)}
                          disabled={isTesting || !wh.is_active}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                          title="Send an instant test ping event to this endpoint"
                        >
                          <Send className={`w-3 h-3 ${isTesting ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
                          <span>{isTesting ? 'Pinging...' : 'Test Ping'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleWebhook(wh)}
                          disabled={isToggling}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title={wh.is_active ? 'Pause delivery pings' : 'Resume delivery pings'}
                        >
                          {wh.is_active ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
                          <span>{wh.is_active ? 'Pause' : 'Resume'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteWebhook(wh)}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete endpoint permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Event Subscription Topics */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Topics:</span>
                      {wh.events && wh.events.map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>

                    {/* HMAC Signing Secret Bar */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-500">Signing Secret:</span>
                        <span className="font-mono text-[11px] text-slate-800 font-semibold select-all">
                          {isVisible ? wh.secret_hash : 'whsec_••••••••••••••••••••••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(wh.id)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded transition"
                          title={isVisible ? 'Hide Secret' : 'Reveal Secret'}
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(wh.secret_hash, `sec-${wh.id}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded flex items-center gap-1 transition"
                        >
                          {copiedKeyId === `sec-${wh.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKeyId === `sec-${wh.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Delivery Audit Trail (webhook_delivery_logs table) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Live Webhook Delivery Audit Trail
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Live PostgreSQL Logs
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Real-time record of all dispatched webhook events, status codes, and HTTP responses.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {webhookLogs.length} Delivery Records
            </span>
          </div>

          {webhookLogsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Loading delivery audit logs from PostgreSQL...</span>
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <p className="text-xs text-slate-500 font-semibold">No webhook deliveries recorded yet.</p>
              <p className="text-[11px] text-slate-400">Trigger a test ping or wait for parcel events to populate this audit trail.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Event Topic</th>
                    <th className="py-2.5 px-4">Target Endpoint</th>
                    <th className="py-2.5 px-4">HTTP Status</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4 text-right">Payload Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhookLogs.map(log => {
                    const is2xx = log.response_status >= 200 && log.response_status < 300;
                    const is4xx = log.response_status >= 400 && log.response_status < 500;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition font-mono">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-800">{log.event_name}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                          {log.target_url || 'Registered Endpoint'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            is2xx
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : is4xx
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${is2xx ? 'bg-emerald-500' : is4xx ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            HTTP {log.response_status || 'TIMEOUT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => setSelectedPayloadLog(log)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Payload</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payload Inspector Modal */}
        {selectedPayloadLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-mono">
                      Delivery Record: {selectedPayloadLog.event_name}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Dispatched {new Date(selectedPayloadLog.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPayloadLog(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target Endpoint</span>
                    <p className="font-mono text-slate-800 break-all text-[11px] mt-0.5">{selectedPayloadLog.target_url}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Response Code</span>
                    <p className="font-bold text-slate-800 text-[11px] mt-0.5">HTTP {selectedPayloadLog.response_status}</p>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Dispatched JSON Body
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
                    {typeof selectedPayloadLog.payload === 'string'
                      ? selectedPayloadLog.payload
                      : JSON.stringify(selectedPayloadLog.payload, null, 2)}
                  </pre>
                </div>

                {selectedPayloadLog.response_body && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Endpoint Response Body
                    </span>
                    <pre className="p-3 bg-slate-100 text-slate-800 rounded-xl text-xs font-mono overflow-x-auto max-h-36 border border-slate-200">
                      {selectedPayloadLog.response_body}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPayloadLog(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HMAC SHA-256 Signature Verification Developer Guide */}
        <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                HMAC SHA-256 Webhook Verification Guide
              </h4>
            </div>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setWebhookDocTab('nodejs')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  webhookDocTab === 'nodejs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Node.js / Express
              </button>
              <button
                type="button"
                onClick={() => setWebhookDocTab('python')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  webhookDocTab === 'python' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python / FastAPI
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Every webhook request from Hotbox includes an <code className="text-emerald-400 font-bold">x-hotbox-signature</code> header formatted as <code className="text-slate-200">t=&lt;timestamp&gt;,v1=&lt;signature&gt;</code>. Validate the signature with your signing secret to prevent spoofing and replay attacks.
          </p>

          {webhookDocTab === 'nodejs' && (
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
{`const crypto = require('crypto');

app.post('/webhooks/hotbox', express.raw({ type: 'application/json' }), (req, res) => {
const sigHeader = req.headers['x-hotbox-signature'];
const [tPart, v1Part] = sigHeader.split(',');
const timestamp = tPart.split('=')[1];
const signature = v1Part.split('=')[1];

// 1. Prevent replay attacks (> 5 minutes tolerance)
if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) {
  return res.status(400).send('Timestamp tolerance exceeded');
}

// 2. Verify HMAC SHA-256 signature
const secret = process.env.HOTBOX_WEBHOOK_SECRET; // e.g. whsec_...
const computed = crypto.createHmac('sha256', secret)
  .update(\`\${timestamp}.\${req.body.toString('utf-8')}\`)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
  return res.status(401).send('Invalid signature');
}

// Process verified payload
const event = JSON.parse(req.body);
console.log('Received Hotbox Event:', event.event, event.data);
res.status(200).json({ received: true });
});`}
            </pre>
          )}

          {webhookDocTab === 'python' && (
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
{`import hmac, hashlib, time, json
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhooks/hotbox")
async def hotbox_webhook(request: Request):
  raw_body = await request.body()
  sig_header = request.headers.get("x-hotbox-signature", "")
  parts = dict(part.split("=") for part in sig_header.split(","))
  timestamp = parts.get("t")
  signature = parts.get("v1")

  # 1. Replay attack protection (300 seconds window)
  if abs(int(time.time()) - int(timestamp)) > 300:
      raise HTTPException(status_code=400, detail="Timestamp out of tolerance window")

  # 2. Compute HMAC SHA-256
  secret = "whsec_...".encode("utf-8")
  payload_to_sign = f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8")
  computed = hmac.new(secret, payload_to_sign, hashlib.sha256).hexdigest()

  if not hmac.compare_digest(signature, computed):
      raise HTTPException(status_code=401, detail="Invalid HMAC signature")

  event = json.loads(raw_body)
  print(f"Verified event {event['event']}")
  return {"received": True}`}
            </pre>
          )}
        </div>
      </div>
  );
}
