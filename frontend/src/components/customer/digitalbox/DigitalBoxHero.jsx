import { BadgeCheck, Copy, FileText, MapPin } from 'lucide-react';

function Metric({ label, children }) {
  return (
    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
      <p className="text-[10px] text-emerald-300/90 font-semibold uppercase tracking-wider">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function DigitalBoxHero({ digitalBox, profile, onOpenCertificate, showToast }) {
  const boxNumber = digitalBox?.boxNumber || 'Allocating…';
  const postcode = digitalBox?.activePostcode || profile?.postcode || 'Not set';
  const hierarchy = digitalBox?.hierarchy || {};
  const verified = Boolean(digitalBox?.isGroundTruthVerified);
  const subscriptionStatus = digitalBox?.subscriptionStatus || 'ACTIVE';
  const daysRemaining = digitalBox?.daysRemaining ?? 365;
  const moveCount = (digitalBox?.relocations || []).length;
  const certificate = digitalBox?.certificate || null;
  const coordinates = digitalBox?.coordinates || {};
  const hasCoordinates = coordinates.lat != null && coordinates.lng != null;

  const copyBoxNumber = () => {
    if (!digitalBox?.boxNumber) {
      showToast('Your Digital P.O. Box number is still being allocated. Refresh in a moment.', 'error');
      return;
    }
    navigator.clipboard?.writeText(digitalBox.boxNumber);
    showToast('Digital P.O. Box number copied');
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#062419] text-white shadow-xl">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row gap-8 lg:items-center">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
              NIPOST Digital Post Office Box
            </span>
            <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full font-mono border ${
              subscriptionStatus === 'ACTIVE'
                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                : 'bg-amber-400 text-slate-950 border-amber-300'
            }`}>
              {subscriptionStatus}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Your Digital P.O.Box and Ground-Truth, NIPOST Verified Proof of Address
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed max-w-2xl">
            Replacing the traditional physical P.O. Box with a verified digital anchor. Enjoy guaranteed mail delivery, dynamic parcel rerouting upon relocation, and bank-grade NIPOST Ground-Truth Verified Proof of Address.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border bg-white/10 text-emerald-100/80 border-white/15">
              <MapPin className="w-3.5 h-3.5" />
              {hierarchy.district || 'Address'}, {hierarchy.lga || 'LGA'}
            </span>
            {hasCoordinates && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold bg-white/10 text-emerald-100/80 border border-white/15">
                {Number(coordinates.lat).toFixed(5)}, {Number(coordinates.lng).toFixed(5)}
              </span>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[300px] shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Digital P.O. Box Number
          </span>
          <span className="block text-2xl font-mono font-black text-white my-2 tracking-wider break-all">
            {boxNumber}
          </span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={copyBoxNumber}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1 transition cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              Copy Box Number
            </button>
            {certificate && (
              <button
                type="button"
                onClick={onOpenCertificate}
                className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border border-white/30 flex items-center gap-1 transition cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 sm:px-8 pb-6 sm:pb-8">
        <Metric label="Postcode">
          <p className="text-sm font-mono font-black text-white break-all">{postcode}</p>
        </Metric>
        <Metric label="Address Verification">
          <p className={`text-xs font-bold ${verified ? 'text-emerald-300' : 'text-emerald-100/80'}`}>
            {verified ? 'Ground-Truth Verified' : 'Registry Verified'}
          </p>
        </Metric>
        <Metric label="Subscription">
          <p className="text-xs font-bold text-white">{daysRemaining} days remaining</p>
        </Metric>
        <Metric label="Recorded Moves">
          <p className="text-xs font-bold text-white">
            {moveCount} relocation{moveCount === 1 ? '' : 's'}
          </p>
        </Metric>
      </div>
    </section>
  );
}