import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Info } from 'lucide-react';

// Sleek Tooltip & InfoTooltip components with Touch & Mobile Support
export function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShow(prev => !prev);
      }}
    >
      {children}
      {show && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
          }}
          className={`absolute z-50 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-xl border border-slate-700 transition-all cursor-pointer ${
            position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[260px] whitespace-normal text-center leading-snug'
              : position === 'right'
              ? 'left-full top-1/2 -translate-y-1/2 ml-2 max-w-[240px] whitespace-normal leading-snug'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap'
          }`}
        >
          {content}
          {position === 'bottom' ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
          ) : position === 'right' ? (
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          )}
        </div>
      )}
    </div>
  );
}

export function InfoTooltip({ text, position = 'bottom' }) {
  return (
    <Tooltip content={text} position={position}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 inline-block shrink-0" />
    </Tooltip>
  );
}

export function formatDistance(km) {
  if (km === undefined || km === null) return '';
  const num = parseFloat(km);
  if (isNaN(num)) return '';
  if (num < 1) {
    const meters = Math.round(num * 1000);
    return `${meters}m away`;
  }
  return `${num.toFixed(2)} km away`;
}

export function estimateTime(km) {
  if (km === undefined || km === null) return '';
  const num = parseFloat(km);
  if (isNaN(num)) return '';
  if (num <= 1) {
    const mins = Math.max(1, Math.round(num * 12));
    return `~${mins} min walk`;
  }
  const mins = Math.max(2, Math.round(num * 2.5));
  return `~${mins} min drive`;
}

export function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}
