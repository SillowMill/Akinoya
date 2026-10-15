import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserStatusConfig } from '../utils/statusPill';

export interface UserBadgeProps {
  showIndicator?: boolean;
  className?: string;
}

export const UserBadge: React.FC<UserBadgeProps> = ({
  showIndicator = true,
  className = '',
}) => {
  const { user, profile, role, isAuthenticated, isVip } = useAuth();
  const statusConfig = getUserStatusConfig(
    isAuthenticated,
    user,
    profile,
    role,
    isVip
  );

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Dynamic Status Pill */}
      <span
        className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 shrink-0 ${statusConfig.pillClassName}`}
      >
        {statusConfig.pillLabel}
      </span>

      {/* Preserve "ACCESS GRANTED" / "PUBLIC ACCESS" Indicator Box */}
      {showIndicator && (
        <div
          title={statusConfig.indicatorLabel}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 text-[9.5px] sm:text-[10px] rounded-lg font-mono whitespace-nowrap shrink-0 ${statusConfig.indicatorClassName}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
          <span className="font-bold tracking-wide">{statusConfig.indicatorLabel}</span>
        </div>
      )}
    </div>
  );
};
