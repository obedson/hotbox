import { useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import {
  ArrowRight, ArrowUpDown, BadgeCheck, Calendar, CheckCircle2, ChevronDown, Clock, Copy,
  ExternalLink, Link2, MapPin, Navigation, Pencil, Phone, RefreshCw, Search, User, X
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
        <div className="flex flex-1 min-w-0 items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
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
  const daysRemaining = digitalBox?.daysRemaining ?? 0;
  const status = digitalBox?.subscriptionStatus || 'ACTIVE';
  const annualFee = digitalBox?.annualFeeNgn || 3500;
  const expiresAt = digitalBox?.expiresAt ? new Date(digitalBox.expiresAt) : null;
  const startedAt = digitalBox?.lastRenewedAt || digitalBox?.subscriptionStartedAt || null;
  let progress = null;
  if (expiresAt && startedAt) {
    const total = expiresAt.getTime() - new Date(startedAt).getTime();
    if (total > 0) {
      progress = Math.max(0, Math.min(100, Math.round(((expiresAt.getTime() - Date.now()) / total) * 100)));
    }
  }
  const statusTone = status === 'ACTIVE'
    ? 'text-emerald-700 bg-emerald-100'
    : status === 'GRACE'
      ? 'text-amber-700 bg-amber-100'
      : 'text-rose-700 bg-rose-100';
  const progressBar = status === 'ACTIVE' ? 'bg-emerald-500' : status === 'GRACE' ? 'bg-amber-500' : 'bg-rose-500';
  const expiryLabel = expiresAt
    ? expiresAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-900">Box Subscription</h3>
          <p className="text-[11px] text-slate-500">Annual digital P.O. Box & forwarding cover.</p>
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Status</span>
          <span className={`font-black px-2 py-0.5 rounded text-[10px] ${statusTone}`}>
            {status} · {daysRemaining} days left
          </span>
        </div>
        {progress != null && (
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progressBar}`} style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Renews until</span>
          <span className="font-bold text-slate-900">{expiryLabel}</span>
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function LinkLegacyBoxCard({ digitalBox, getAuthHeaders, fetchCustomerData, showToast }) {
  const [legacyBoxInput, setLegacyBoxInput] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [documentDataUrl, setDocumentDataUrl] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentError, setDocumentError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const linked = digitalBox?.legacyBoxNumber || null;
  const isLinked = digitalBox?.legacyBoxStatus === 'APPROVED' && Boolean(linked);
  const request = digitalBox?.legacyRequest || null;
  const isOpen = Boolean(request && ['PENDING', 'CONTESTED'].includes(request.status));
  const fees = digitalBox?.legacyLinkFees || { nipostVerificationFeeNgn: 0, hotboxPlatformFeeNgn: 0, totalNgn: 0 };
  const feeTotal = Number(fees.totalNgn) || 0;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setDocumentError('Please choose a JPEG, PNG, WebP or PDF file.');
      setDocumentDataUrl(null);
      setDocumentName('');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setDocumentError('The document must be 2 MB or smaller.');
      setDocumentDataUrl(null);
      setDocumentName('');
      return;
    }
    setDocumentError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentDataUrl(String(reader.result));
      setDocumentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const statusPill = (() => {
    if (isLinked) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-200">
          <BadgeCheck className="w-3 h-3" />
          NIPOST Verified
        </span>
      );
    }
    if (!request) return null;
    const map = {
      PENDING: { label: 'Awaiting NIPOST', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
      CONTESTED: { label: 'Contested', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
      REJECTED: { label: 'Not Approved', classes: 'bg-rose-100 text-rose-800 border-rose-200' },
      REVOKED: { label: 'Revoked', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
      EXPIRED: { label: 'Expired', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
      WITHDRAWN: { label: 'Withdrawn', classes: 'bg-slate-100 text-slate-600 border-slate-200' }
    };
    const meta = map[request.status] || { label: request.status, classes: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${meta.classes}`}>
        {meta.label}
      </span>
    );
  })();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const clean = legacyBoxInput.trim();
    if (!clean) {
      setMessage({ type: 'error', text: 'Enter your old P.O. Box number first.' });
      return;
    }
    if (!registeredPhone.trim()) {
      setMessage({ type: 'error', text: 'Enter the phone number registered on the old box.' });
      return;
    }
    if (!declaration) {
      setMessage({ type: 'error', text: 'Please confirm the ownership declaration before submitting.' });
      return;
    }
    if (!documentDataUrl) {
      setMessage({ type: 'error', text: 'Attach the required proof documents: NIPOST-verified proof of address, current postcode and P.O. Box renewal receipt.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/v1/customer/link-legacy-box', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          legacyBoxNumber: clean,
          registeredPhone: registeredPhone.trim(),
          declaration: true,
          documentDataUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setLegacyBoxInput('');
        setRegisteredPhone('');
        setDeclaration(false);
        setDocumentDataUrl(null);
        setDocumentName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchCustomerData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Could not submit that link request.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while submitting your request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!request?.id) return;
    setIsWithdrawing(true);
    try {
      const res = await apiFetch('/api/v1/customer/legacy-box-request/withdraw', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ requestId: request.id })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Link request withdrawn.');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Could not withdraw that request.', 'error');
      }
    } catch (err) {
      showToast('Network error while withdrawing the request.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900">Link Your Old P.O. Box</h3>
            <p className="text-[11px] text-slate-500">
              Have an old Post office box number? Link it to your new Digital P.O. Box so mail sent to the old number still reaches you.
            </p>
          </div>
        </div>
        {statusPill}
      </div>

      {isLinked && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Old P.O. Box <strong className="font-mono">{linked}</strong> is verified by NIPOST and forwards to{' '}
            <strong className="font-mono">{digitalBox?.boxNumber}</strong>.
          </span>
        </div>
      )}

      {isOpen && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 space-y-2.5">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Request for <strong className="font-mono">{request.legacyBoxNumber}</strong> is awaiting NIPOST verification.
              Mail forwarding starts once it is approved.
            </span>
          </div>
          <p className="text-[11px] text-amber-700">
            Submitted {formatDate(request.submittedAt)}
            {request.expiresAt ? ` · response due by ${formatDate(request.expiresAt)}` : ''}
          </p>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 disabled:opacity-50 cursor-pointer"
          >
            {isWithdrawing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Withdraw request
          </button>
        </div>
      )}

      {request && request.status === 'REJECTED' && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 space-y-1">
          <p className="font-black">Not approved</p>
          <p>{request.reviewNote || 'NIPOST could not verify this P.O. Box number.'}</p>
          <p className="text-[11px]">You can submit a new request below with additional evidence.</p>
        </div>
      )}

      {feeTotal > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
          <p className="font-black text-slate-800">Charged to your wallet only when NIPOST approves</p>
          <p>NIPOST verification fee: <span className="font-mono font-bold">₦{Number(fees.nipostVerificationFeeNgn || 0).toLocaleString('en-NG')}</span></p>
          <p>Hotbox platform fee: <span className="font-mono font-bold">₦{Number(fees.hotboxPlatformFeeNgn || 0).toLocaleString('en-NG')}</span></p>
        </div>
      )}

      {!isOpen && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={legacyBoxInput}
            onChange={(e) => setLegacyBoxInput(e.target.value.toUpperCase())}
            placeholder="Enter your old NIPOST P.O. Box number"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none bg-slate-50"
          />
          <input
            type="tel"
            value={registeredPhone}
            onChange={(e) => setRegisteredPhone(e.target.value)}
            placeholder="Phone number registered on the old box"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-600 focus:outline-none bg-slate-50"
          />
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700">
              Proof documents <span className="text-rose-500 font-black">(required)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="w-full text-[11px] text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-[11px] file:font-bold file:text-slate-700 file:bg-white hover:file:bg-slate-50"
            />
            <p className="text-[10px] text-slate-500 leading-snug">
              Required: a NIPOST-verified proof of address, your current postcode, and your last or current
              P.O. Box renewal receipt.
            </p>
            {documentName && <p className="text-[10px] text-emerald-700 font-bold">{documentName} attached</p>}
            {documentError && <p className="text-[10px] text-rose-600 font-bold">{documentError}</p>}
          </div>
          <label className="flex items-start gap-2 text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={declaration}
              onChange={(e) => setDeclaration(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>
              I declare that I am the lawful holder of this old P.O. Box number and I authorise NIPOST
              to confirm it with Hotbox.
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            <span>{linked ? 'Link a different old box' : 'Submit for NIPOST verification'}</span>
          </button>
        </form>
      )}

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
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <ArrowUpDown className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-900">Your Relocation & Mail Forwarding Records</h3>
          <p className="text-[11px] text-slate-500">
            Mail addressed to a previous postcode routes to your active address automatically.
          </p>
        </div>
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
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="w-full flex items-start justify-between gap-3 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-900">How a Courier Resolves Your Address</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            One lookup works for a digital box number, a linked old P.O. Box number, or your postcode.
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-4 space-y-4">
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