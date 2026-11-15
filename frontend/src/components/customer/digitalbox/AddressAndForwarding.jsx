import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import {
  ArrowRight, ArrowUpDown, BadgeCheck, Calendar, CheckCircle2, Copy,
  ExternalLink, Link2, MapPin, Navigation, Pencil, Phone, RefreshCw, Search, User
} from 'lucide-react';

function GoogleMapsLink({ lat, lng, label = 'Open in Google Maps' }) {
  if (lat == null || lng == null) return null;
  return (
    <a
      href={`https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition shrink-0"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}

function DeliveryAddressCard({ digitalBox, profile, onChangeAddress, showToast }) {
  const hierarchy = digitalBox?.hierarchy || {};
  const coordinates = digitalBox?.coordinates || {};
  const verified = Boolean(digitalBox?.isGroundTruthVerified);
  const postcode = digitalBox?.activePostcode || profile?.postcode || 'Not set';
  const description = profile?.postcode_description || profile?.postcode_neighbourhood || '';

  const copyAddress = () => {
    const text = `${postcode} — ${hierarchy.district || ''}, ${hierarchy.lga || ''}, ${hierarchy.state || ''}`;
    navigator.clipboard?.writeText(text);
    showToast('Delivery address copied');
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Your Delivery Address</h3>
            <p className="text-[11px] text-slate-500">What a courier resolves when your box number is searched.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
          verified ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <BadgeCheck className="w-3 h-3" />
          {verified ? 'Ground-Truth Verified' : 'Registry Verified'}
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-sm font-black text-emerald-800 break-all">{postcode}</span>
          <div className="flex items-center gap-3">
            <GoogleMapsLink lat={coordinates.lat} lng={coordinates.lng} />
            <button
              type="button"
              onClick={copyAddress}
              className="text-slate-400 hover:text-emerald-700 transition cursor-pointer"
              title="Copy delivery address"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-800">
          {hierarchy.district || '—'}, {hierarchy.lga || '—'}, {hierarchy.state || '—'}
        </p>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
        {coordinates.lat != null && coordinates.lng != null && (
          <p className="text-[11px] font-mono text-slate-500">
            {Number(coordinates.lat).toFixed(6)}, {Number(coordinates.lng).toFixed(6)}
          </p>
        )}
        {profile?.phone && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{profile.phone}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onChangeAddress}
        className="w-full py-2.5 px-4 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-700 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
        Change Address or Postcode
      </button>
      <p className="text-[10px] text-center text-slate-400">
        Updating your postcode records a relocation and starts mail forwarding automatically.
      </p>
    </div>
  );
}

function SubscriptionCard({ digitalBox, wallet, onRenew, isRenewing }) {
  const daysRemaining = digitalBox?.daysRemaining ?? 365;
  const status = digitalBox?.subscriptionStatus || 'ACTIVE';
  const annualFee = digitalBox?.annualFeeNgn || 3500;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Box Subscription</h3>
          <p className="text-[11px] text-slate-500">Annual digital P.O. Box & forwarding cover.</p>
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Status</span>
          <span className={`font-black px-2 py-0.5 rounded text-[10px] ${
            status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'
          }`}>
            {status} · {daysRemaining} days left
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Annual fee</span>
          <span className="font-bold text-slate-900">₦{Number(annualFee).toLocaleString('en-NG')}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Wallet balance</span>
          <span className="font-bold text-slate-900">
            ₦{parseFloat(wallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRenew}
        disabled={isRenewing}
        className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
      >
        {isRenewing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Extending 365 days…</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Renew Subscription (₦{Number(annualFee).toLocaleString('en-NG')} / yr)</span>
          </>
        )}
      </button>
      <p className="text-[10px] text-center text-slate-400">Debited from your prepaid Hotbox wallet.</p>
    </div>
  );
}

function LinkLegacyBoxCard({ digitalBox, getAuthHeaders, fetchCustomerData, showToast }) {
  const [legacyBoxInput, setLegacyBoxInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState(null);

  const linked = digitalBox?.legacyBoxNumber || null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const clean = legacyBoxInput.trim();
    if (!clean) {
      setMessage({ type: 'error', text: 'Enter your old P.O. Box number first.' });
      return;
    }
    setIsLinking(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/v1/customer/link-legacy-box', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ legacyBoxNumber: clean })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setLegacyBoxInput('');
        fetchCustomerData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Could not link that box number.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while linking your old box number.' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
          <Link2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Link Your Old P.O. Box</h3>
          <p className="text-[11px] text-slate-500">
            Have an old Post office box number? Link it to your new Digital P.O. Box so mail sent to the old number still reaches you.
          </p>
        </div>
      </div>

      {linked && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Old P.O. Box <strong className="font-mono">{linked}</strong> is linked and forwards to{' '}
            <strong className="font-mono">{digitalBox?.boxNumber}</strong>.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={legacyBoxInput}
          onChange={(e) => setLegacyBoxInput(e.target.value.toUpperCase())}
          placeholder="Enter your old NIPOST P.O. Box number"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none bg-slate-50"
        />
        <button
          type="submit"
          disabled={isLinking}
          className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLinking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          <span>{linked ? 'Update Linked Number' : 'Link Old Box Number'}</span>
        </button>
      </form>

      {message && (
        <p className={`text-[11px] font-semibold ${message.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function RelocationLedger({ relocations }) {
  const rows = relocations || [];

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Relocation & Forwarding Ledger</h3>
            <p className="text-[11px] text-slate-500">
              Mail addressed to a previous postcode routes to your active address automatically.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0 self-start sm:self-auto">
          Auto-forwarding active
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Previous Address</th>
              <th className="py-2.5 px-3">New Address</th>
              <th className="py-2.5 px-3 text-right">Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map((rel, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition align-top">
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    {rel.changedAt ? new Date(rel.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-slate-800">{rel.oldPostcode || '—'}</span>
                    {rel.oldAddress && <span className="block text-[11px] text-slate-500">{rel.oldAddress}</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-emerald-800">{rel.newPostcode || '—'}</span>
                    {rel.newAddress && <span className="block text-[11px] text-slate-500">{rel.newAddress}</span>}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      <ArrowRight className="w-3 h-3" />
                      Forwarding
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                  No relocations recorded yet. When you change your postcode, the forwarding trail is indexed here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourierResolver({ boxNumber }) {
  const steps = [
    {
      icon: Search,
      title: '1. Courier searches the mail',
      body: 'They enter whatever is written on the mail — your digital P.O. Box number, an old P.O. Box number, or your postcode.'
    },
    {
      icon: User,
      title: '2. Registry resolves the resident',
      body: 'The Hotbox registry returns your current postcode, delivery address and contact number in one lookup.'
    },
    {
      icon: Navigation,
      title: '3. Mail is delivered or rerouted',
      body: 'If you have relocated, the active forwarding address is returned so the item reaches you instead of being returned.'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-900">How a Courier Resolves Your Address</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          One lookup works for a digital box number, a linked old P.O. Box number, or your postcode.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div key={step.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <step.icon className="w-4 h-4 text-emerald-700" />
            <p className="text-xs font-black text-slate-900">{step.title}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
      {boxNumber && (
        <p className="text-[11px] text-slate-400 font-mono break-all">
          Try it in the Rider Radar console: {boxNumber}
        </p>
      )}
    </div>
  );
}

export default function AddressAndForwarding({
  digitalBox, profile, wallet, relocations, onRenew, isRenewing,
  onChangeAddress, getAuthHeaders, fetchCustomerData, showToast
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeliveryAddressCard
            digitalBox={digitalBox}
            profile={profile}
            onChangeAddress={onChangeAddress}
            showToast={showToast}
          />
        </div>
        <div className="space-y-6">
          <SubscriptionCard digitalBox={digitalBox} wallet={wallet} onRenew={onRenew} isRenewing={isRenewing} />
          <LinkLegacyBoxCard
            digitalBox={digitalBox}
            getAuthHeaders={getAuthHeaders}
            fetchCustomerData={fetchCustomerData}
            showToast={showToast}
          />
        </div>
      </div>

      <RelocationLedger relocations={relocations} />
      <CourierResolver boxNumber={digitalBox?.boxNumber} />
    </div>
  );
}