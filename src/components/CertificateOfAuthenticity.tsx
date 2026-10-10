import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { BingaaCertificate, formatClaimDate, formatSignature } from '../utils/certificate';

interface CertificateOfAuthenticityProps {
  certificate: BingaaCertificate;
  compact?: boolean;
}

/** Official Bingäa Issue #1 Certificate of Authenticity (100% English copy). */
export const CertificateOfAuthenticity: React.FC<CertificateOfAuthenticityProps> = ({ certificate, compact }) => (
  <div className="relative overflow-hidden rounded-xl border border-cyan-400/30 bg-[#07090f] p-4 sm:p-6 font-mono">
    <div className="absolute inset-1.5 sm:inset-2 rounded-lg border border-white/10 pointer-events-none" />

    <div className="relative text-center space-y-1">
      <div className="text-[9px] sm:text-[10px] tracking-[0.2em] text-cyan-300">SILLOW MILL · ÄKINOYA</div>
      <h4 className="text-[13px] sm:text-lg font-display font-bold text-white leading-snug tracking-wide">
        CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1
      </h4>
    </div>

    <dl className={`relative mt-4 grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-x-6 gap-y-3 text-center sm:text-left`}>
      <div className="min-w-0">
        <dt className="text-[9px] sm:text-[10px] tracking-wider text-white/40">OWNER</dt>
        <dd className="text-[11px] sm:text-xs text-white font-semibold break-words">
          REGISTERED HOLDER: {certificate.holderName.toUpperCase()}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[9px] sm:text-[10px] tracking-wider text-white/40">EDITION</dt>
        <dd className="text-[11px] sm:text-xs text-white font-semibold">
          FOUNDING MEMBER COPY #{certificate.editionNumber} OF {certificate.editionTotal}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[9px] sm:text-[10px] tracking-wider text-white/40">STATUS</dt>
        <dd className="text-[11px] sm:text-xs text-emerald-300 font-semibold">{certificate.status}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[9px] sm:text-[10px] tracking-wider text-white/40">CERTIFICATE ID</dt>
        <dd className="text-[11px] sm:text-xs text-white/85 break-all">{certificate.certificateId}</dd>
      </div>
    </dl>

    <div className="relative mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-3">
      <div className="min-w-0 text-center sm:text-left">
        <div className="text-[9px] sm:text-[10px] tracking-wider text-white/40">
          CRYPTOGRAPHIC SIGNATURE ({certificate.signatureAlgorithm})
        </div>
        <div className="text-[10px] sm:text-[11px] text-cyan-200/90 break-all leading-relaxed">
          {formatSignature(certificate.signature, 8)}
        </div>
        <div className="text-[9px] sm:text-[10px] text-white/40 mt-1">
          Claimed {formatClaimDate(certificate.claimedAt)} · Pass #{certificate.passId}
          {certificate.emailVerified ? ' · Email verified' : ''}
        </div>
      </div>

      {/* Official stamp */}
      <div
        className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-emerald-400/80 flex items-center justify-center -rotate-12"
        aria-label="Official authenticity stamp"
      >
        <div className="w-[86%] h-[86%] rounded-full border border-emerald-400/70 flex flex-col items-center justify-center text-emerald-300 leading-none">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[8px] sm:text-[9px] font-bold tracking-wider">OFFICIAL</span>
          <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider">AUTHENTIC</span>
          <span className="text-[7px] sm:text-[8px] mt-0.5">
            {certificate.editionNumber}/{certificate.editionTotal}
          </span>
        </div>
      </div>
    </div>
  </div>
);
