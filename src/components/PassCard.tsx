import React from 'react';
import { Sparkles, ShieldCheck, Lock } from 'lucide-react';
import passCardImg from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import { useAuth } from '../context/AuthContext';
import { getUserStatusConfig } from '../utils/statusPill';

export interface PassCardProps {
  passId?: string;
  className?: string;
  onInspect?: () => void;
}

export const PassCard: React.FC<PassCardProps> = ({
  passId,
  className = '',
  onInspect,
}) => {
  const { user, profile, role, isAuthenticated, isVip } = useAuth();
  const statusConfig = getUserStatusConfig(
    isAuthenticated,
    user,
    profile,
    role,
    isVip
  );

  const displayPassId = passId || (profile?.vip_code_redeemed ? `#${profile.vip_code_redeemed}` : 'AKN-VIP-2027-X001');

  return (
    <div
      onClick={onInspect}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#070b14] hover:border-cyan-400/50 transition-all shadow-xl ${
        onInspect ? 'cursor-pointer hover:scale-[1.01]' : ''
      } ${className}`}
    >
      {/* Visual Canvas Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
        <img
          src={passCardImg}
          alt="Sillow Mill Digital Pass"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* Top Floating Badges: Status Pill + ACCESS GRANTED Indicator Box */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md rounded-full text-[9.5px] xs:text-[10px] font-mono truncate ${statusConfig.pillClassName}`}
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">{statusConfig.pillLabel}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md rounded-full text-[9.5px] xs:text-[10px] font-mono font-bold shrink-0 whitespace-nowrap ${statusConfig.indicatorClassName}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
            <span>• {statusConfig.indicatorLabel}</span>
          </div>
        </div>
      </div>

      {/* Details Footer */}
      <div className="p-4 bg-gradient-to-b from-[#060c14] to-[#03060a] border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-white/50 tracking-wider">SILLOW MILL PASS</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${statusConfig.pillClassName}`}>
            {statusConfig.pillLabel}
          </span>
        </div>

        <div className="text-sm font-display font-bold text-white tracking-wide flex items-center justify-between">
          <span>{statusConfig.tier === 'VIP' ? 'FOUNDING VIP ARCHIVE' : 'DIGITAL PASS HOLDER'}</span>
          <span className="text-xs font-mono text-cyan-400">{displayPassId}</span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-white/50 pt-1 border-t border-white/5">
          <span>STATUS: {statusConfig.indicatorLabel}</span>
          <span>LAUNCH: 09.01.2027</span>
        </div>
      </div>
    </div>
  );
};
