import React, { useState } from 'react';
import LegacyBoxLinkRequests from './operations/LegacyBoxLinkRequests';
import LegacyLinkRemittance from './operations/LegacyLinkRemittance';
import { isOperationsDeskRole } from '../lib/portals';

const VIEWS = [
  { id: 'queue', label: 'Review queue' },
  { id: 'remittance', label: 'Remittance' }
];

export default function LegacyBoxLinkManagement({ currentUser }) {
  const isDesk = isOperationsDeskRole(currentUser?.role);
  const views = isDesk ? VIEWS : VIEWS.filter((item) => item.id !== 'remittance');
  const [view, setView] = useState('queue');
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
              view === item.id
                ? 'bg-[#062419] text-white border-[#062419]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
            {item.id === 'queue' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {view === 'queue'
        ? <LegacyBoxLinkRequests currentUser={currentUser} onPendingCount={setPendingCount} />
        : <LegacyLinkRemittance />}
    </div>
  );
}
