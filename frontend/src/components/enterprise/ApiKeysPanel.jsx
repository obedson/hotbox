import { Key, CheckCircle2, ShieldCheck, Copy, Plus, ExternalLink, RefreshCw, X, Trash2, Check } from 'lucide-react';

export default function ApiKeysPanel({ activeCodeTab, apiKeyEnvironment, apiKeyPermissions, apiKeys, copiedKeyId, generatedKey, handleDeleteKey, handleGenerateKey, handleRevokeKey, isAddKeyOpen, keyActionLoading, loading, newKeyName, setActiveCodeTab, setApiKeyEnvironment, setApiKeyPermissions, setIsAddKeyOpen, setNewKeyName, copyToClipboard }) {
  return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Developer API Keys & Scopes</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {apiKeys.filter(k => !k.is_revoked).length} Active Keys
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Organization-scoped API credentials for programmatic parcel booking, tracking, and KYC address verification
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddKeyOpen(!isAddKeyOpen)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              {isAddKeyOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isAddKeyOpen ? 'Close Generator' : 'Generate New Key'}</span>
            </button>
          </div>

          {/* NEW SECRET GENERATED POPUP */}
          {generatedKey && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  New Secret API Key Generated Successfully!
                </div>
                <button
                  onClick={() => copyToClipboard(generatedKey, 'gen')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-800 font-semibold flex items-center gap-1 transition shadow-xs"
                >
                  {copiedKeyId === 'gen' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyId === 'gen' ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 break-all bg-white p-2.5 rounded-xl border border-emerald-200 select-all">
                {generatedKey}
              </div>
              <div className="text-[11px] text-emerald-700">
                ⚠️ <strong>Security Requirement:</strong> Copy and store this secret safely. For security, full keys are salted & hashed in PostgreSQL and cannot be retrieved again.
              </div>
            </div>
          )}

          {/* GENERATE KEY FORM MODAL */}
          {isAddKeyOpen && (
            <form onSubmit={handleGenerateKey} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Configure API Key Parameters</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Key Name / Client System *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ERP Backend Gateway, Mobile App Srv"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Environment Tier *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApiKeyEnvironment('production')}
                      className={`p-2 rounded-xl border text-left transition ${
                        apiKeyEnvironment === 'production'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs">Live Production</div>
                      <div className="text-[10px] opacity-80">1,000 req/min limit</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApiKeyEnvironment('sandbox')}
                      className={`p-2 rounded-xl border text-left transition ${
                        apiKeyEnvironment === 'sandbox'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs">Sandbox Test</div>
                      <div className="text-[10px] opacity-80">100 req/min limit</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scopes checklist */}
              <div className="text-xs space-y-1.5">
                <label className="block text-slate-700 font-semibold">Authorized Scopes & Permissions:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'shipments:read', label: 'shipments:read', desc: 'Read tracking & dispatches' },
                    { id: 'shipments:write', label: 'shipments:write', desc: 'Book bulk & single parcels' },
                    { id: 'kyc:verify', label: 'kyc:verify', desc: 'NIPOST NDAPS address validation' },
                    { id: 'manifests:read', label: 'manifests:read', desc: 'Export batch dispatch manifests' }
                  ].map(scope => {
                    const isChecked = apiKeyPermissions.includes(scope.id);
                    return (
                      <label
                        key={scope.id}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2 ${
                          isChecked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setApiKeyPermissions(apiKeyPermissions.filter(p => p !== scope.id));
                            } else {
                              setApiKeyPermissions([...apiKeyPermissions, scope.id]);
                            }
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-[11px]">{scope.label}</div>
                          <div className="text-[10px] text-slate-500">{scope.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddKeyOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newKeyName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Generating...' : `Generate ${apiKeyEnvironment === 'sandbox' ? 'Sandbox' : 'Production'} Key`}</span>
                </button>
              </div>
            </form>
          )}

          {/* LIVE API KEYS TABLE */}
          <div className="space-y-3 pt-1">
            {apiKeys.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                No API keys registered in PostgreSQL. Click "Generate New Key" to create your first credential.
              </div>
            ) : (
              apiKeys.map(k => (
                <div
                  key={k.id}
                  className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    k.is_revoked
                      ? 'bg-slate-100/60 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{k.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        k.environment === 'sandbox'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {k.environment || 'production'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        • {k.rate_limit_per_minute || (k.environment === 'sandbox' ? 100 : 1000)} req/min
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        k.is_revoked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {k.is_revoked ? 'Revoked' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold tracking-wider">
                        {k.key_prefix}••••••••••••••••••••••••
                      </span>
                      <button
                        onClick={() => copyToClipboard(k.key_prefix, k.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                        title="Copy Prefix"
                      >
                        {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span className="text-slate-500 font-semibold">Scopes:</span>
                      {(k.permissions || ['shipments:read', 'shipments:write']).map((p, idx) => (
                        <span key={idx} className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                          {p}
                        </span>
                      ))}
                      {k.created_at && (
                        <span className="text-slate-400 ml-2">
                          Created {new Date(k.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                        </span>
                      )}
                      {k.revoked_at && (
                        <span className="text-rose-600 font-semibold ml-1">
                          (Revoked on {new Date(k.revoked_at).toLocaleDateString('en-NG')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {!k.is_revoked && (
                      <button
                        disabled={keyActionLoading === k.id}
                        onClick={() => handleRevokeKey(k.id, k.name)}
                        className="px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Revoke Key</span>
                      </button>
                    )}

                    <button
                      disabled={keyActionLoading === k.id}
                      onClick={() => handleDeleteKey(k.id, k.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Delete Key Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 2: DEVELOPER QUICKSTART INTEGRATION GUIDE (prompt.txt §16 Compliance) */}
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-indigo-400" />
                <span>Developer Quickstart & OpenAPI Integration</span>
              </h3>
              <p className="text-xs text-slate-400">
                Authenticate requests by passing your API key in the <code className="text-indigo-300 font-mono">x-api-key</code> or <code className="text-indigo-300 font-mono">Authorization: Bearer</code> header
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveCodeTab('curl')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeCodeTab === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveCodeTab('node')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeCodeTab === 'node' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Node.js
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800/80 leading-relaxed">
              {activeCodeTab === 'curl' ? `curl -X POST https://api.hotbox.com.ng/api/v1/enterprise/shipments/bulk \
-H "Content-Type: application/json" \
-H "x-api-key: hbx_live_your_secret_key_here" \
-d '{
  "count": 5,
  "destinationPostcode": "FC-01-A03-FK-01",
  "serviceType": "DOOR_TO_HUB"
}'` : `const response = await fetch('https://api.hotbox.com.ng/api/v1/enterprise/shipments/bulk', {
method: 'POST',
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'hbx_live_your_secret_key_here'
},
body: JSON.stringify({
  count: 5,
  destinationPostcode: 'FC-01-A03-FK-01'
})
});
const data = await response.json();
console.log('Batch Manifest Created:', data.manifest);`}
            </pre>

            <button
              onClick={() => {
                const text = activeCodeTab === 'curl'
                  ? `curl -X POST https://api.hotbox.com.ng/api/v1/enterprise/shipments/bulk -H "Content-Type: application/json" -H "x-api-key: hbx_live_your_secret_key_here" -d '{"count": 5}'`
                  : `fetch('https://api.hotbox.com.ng/api/v1/enterprise/shipments/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'hbx_live_your_secret_key_here' } });`;
                copyToClipboard(text, 'code');
              }}
              className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="Copy Code"
            >
              {copiedKeyId === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKeyId === 'code' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
  );
}
