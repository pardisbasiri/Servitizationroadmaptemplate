import { Wifi } from 'lucide-react';

interface LiveIndicatorProps {
  isLive: boolean;
}

export function LiveIndicator({ isLive }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-200 shadow-sm">
      <div className="relative flex items-center justify-center">
        <Wifi
          size={14}
          className={`transition-colors ${
            isLive ? 'text-green-600' : 'text-gray-400'
          }`}
        />
        {isLive && (
          <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>
      <span
        className={`text-xs transition-colors ${
          isLive ? 'text-green-700' : 'text-gray-500'
        }`}
        style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
      >
        {isLive ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
