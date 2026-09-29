import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DemoBannerProps {
  isDemoMode: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ isDemoMode }) => {
  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-950/80 border-b border-amber-600/50 px-4 py-2 text-amber-200">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
          <span className="font-bold text-amber-300">DEMO MODE ACTIVE:</span>
          <span>External live feeds unavailable. System is running on simulated baseline meteorological data.</span>
        </div>
        <span className="hidden sm:inline bg-amber-900/60 px-2 py-0.5 rounded text-[11px] border border-amber-700/60">
          SIMULATED TELEMETRY
        </span>
      </div>
    </div>
  );
};
