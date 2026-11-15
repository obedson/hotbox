import { BadgeCheck, FileText, MapPin, ShieldCheck, X } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Field({ label, value, mono = true, full = false }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <span className="text-[10px] text-slate-400 uppercase font-semibold">{label}</span>
      <p className={`font-bold text-slate-900 break-words ${mono ? 'font-mono' : 'font-medium'}`}>{value || '—'}</p>
    </div>
  );
}

export default function CertificateModal({
  isOpen, onClose, digitalBox, profile, currentUser, senderLocation
}) {
  if (!isOpen) return null;

  const certificate = digitalBox?.certificate || null;
  const boxNumber = digitalBox?.boxNumber || '—';
  const holderName = profile?.name || currentUser?.name || 'Certificate Holder';
  const postcode = certificate?.postcode || digitalBox?.activePostcode || '—';
  const addressText = certificate?.addressText || profile?.postcode_description || senderLocation?.address || '—';
  const hierarchy = digitalBox?.hierarchy || {};
  const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
  const verifyUrl = certificate
    ? `${apiBase || window.location.origin}/api/v1/verification/certificate/${certificate.serial}`
    : null;
  const hasCoordinates = certificate?.lat != null && certificate?.lng != null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Proof of Address Certificate</h3>
              <p className="text-[11px] text-slate-500">Hotbox Ground-Truth Address Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-4 border-double border-emerald-900/30 rounded-2xl p-6 bg-gradient-to-b from-white via-emerald-50/20 to-emerald-100/30 space-y-5 text-center relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-emerald-900/20 pb-3">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Federal Republic of Nigeria</p>
              <p className="text-[11px] font-bold text-emerald-800">Hotbox Digital Address Network</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center">
              NG
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Certificate No</p>
              <p className="text-[11px] font-mono font-black text-emerald-800">{certificate?.serial || 'NOT ISSUED'}</p>
            </div>
          </div>

          <div className="py-2 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Certificate of Ground-Truth Address Verification
            </span>
            <h2 className="text-xl font-serif font-black text-slate-950 pt-2">Proof of Address Certificate</h2>
            <p className="text-[11px] text-slate-600 max-w-md mx-auto leading-relaxed">
              This certifies that the identity and doorway of the person named below were physically inspected by an
              accredited Hotbox verification officer, and the address recorded in the Hotbox digital P.O. Box registry.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left bg-white/90 p-4 rounded-xl border border-emerald-900/20 text-xs">
            <Field label="Registered Holder" value={holderName} mono={false} />
            <Field label="Digital P.O. Box" value={boxNumber} />
            <Field label="Postcode" value={postcode} />
            <Field
              label="GPS Coordinates"
              value={hasCoordinates ? `${Number(certificate.lat).toFixed(6)}, ${Number(certificate.lng).toFixed(6)}` : 'Not captured'}
            />
            <Field label="Verified Address" value={addressText} mono={false} full />
            <Field label="District" value={certificate?.district || hierarchy.district} mono={false} />
            <Field label="LGA" value={certificate?.lga || hierarchy.lga} mono={false} />
            <Field label="State" value={certificate?.state || hierarchy.state} mono={false} />
            <Field label="Issued" value={formatDate(certificate?.issuedAt)} mono={false} />
            <Field label="Certificate Status" value={certificate?.status || 'NOT ISSUED'} />
            <Field label="Valid Until" value={formatDate(certificate?.expiresAt)} mono={false} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-900/20 text-[10px] text-slate-500">
            <div className="text-left">
              <p className="font-mono font-bold text-slate-800">{certificate?.serial || 'HBX-CERT-PENDING'}</p>
              {verifyUrl && <p className="font-mono text-slate-500 break-all">{verifyUrl}</p>}
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                Ground-Truth Verified
              </span>
              <p className="text-[9px] text-slate-400">Verify by serial at the link above</p>
            </div>
          </div>
        </div>

        {hasCoordinates && (
          <a
            href={`https://www.google.com/maps?q=${Number(certificate.lat)},${Number(certificate.lng)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition"
          >
            <MapPin className="w-3.5 h-3.5" />
            Open the verified doorway in Google Maps
          </a>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}