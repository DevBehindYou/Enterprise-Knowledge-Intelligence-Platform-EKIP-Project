import React, { useState, useEffect } from 'react';
import { useBackendHealth } from '../../context/BackendHealthContext.jsx';
import { RefreshCw, CheckCircle2, Server, AlertCircle } from 'lucide-react';

export default function BackendStatusBanner({ className = '' }) {
  const { status, isWarming, isReady, isError, retryWarmup, attempt } = useBackendHealth();
  const [showReadyBriefly, setShowReadyBriefly] = useState(false);

  useEffect(() => {
    if (isReady) {
      setShowReadyBriefly(true);
      const timer = setTimeout(() => {
        setShowReadyBriefly(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (!isWarming && !isError && !showReadyBriefly) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-lg transition-all duration-300 ${className}`}>
      {/* Top Indeterminate Shimmering Progress Bar */}
      {isWarming && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-line overflow-hidden z-10">
          <div className="h-full bg-gradient-to-r from-transparent via-accent to-transparent w-1/2 animate-[shimmer_1.6s_infinite_linear]" 
               style={{
                 animation: 'shimmerProgress 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1)'
               }}
          />
        </div>
      )}

      {/* Warming State Banner */}
      {isWarming && (
        <div className="bg-surface-elevated/80 border border-accent/30 p-3.5 rounded-lg text-ink">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold flex items-center justify-between">
                <span>Waking up server...</span>
                <span className="text-[11px] text-ink-muted font-mono">Attempt {attempt}</span>
              </div>
              <p className="text-[12px] text-ink-muted mt-0.5 leading-normal">
                Render free-tier spin up in progress. This may take up to a minute on the first connection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ready State Banner (Fades out smoothly) */}
      {isReady && showReadyBriefly && (
        <div className="bg-success/10 border border-success/30 p-3 rounded-lg text-success flex items-center gap-2.5 animate-in fade-in duration-300">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <div className="text-[12.5px] font-medium">
            Server ready — you can now log in.
          </div>
        </div>
      )}

      {/* Timeout / Error State Banner with Retry */}
      {isError && (
        <div className="bg-danger/10 border border-danger/30 p-3.5 rounded-lg text-danger">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={17} className="text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold">
                Server taking longer than expected
              </div>
              <p className="text-[12px] text-ink-muted mt-0.5 leading-normal">
                The backend service is taking a moment to boot. Please retry connecting.
              </p>
              <button
                type="button"
                onClick={retryWarmup}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger text-white rounded-md text-xs font-semibold hover:bg-danger/90 transition-colors shadow-sm"
              >
                <RefreshCw size={13} /> Retry connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS keyframe for smooth progress animation */}
      <style>{`
        @keyframes shimmerProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
