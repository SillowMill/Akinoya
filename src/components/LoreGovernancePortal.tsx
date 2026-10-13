import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Calendar,
  ThumbsUp,
  ExternalLink,
  Camera,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { PlanetSubmission } from '../types/contest';
import { getStoredPlanetSubmissions, togglePlanetSubmissionVote } from '../data/contest';
import { PlanetDossierModal } from './PlanetDossierModal';

interface LoreGovernancePortalProps {
  onNavigateToContest?: () => void;
  onOpenCreator?: (username: string) => void;
  onOpenUpgradeModal?: (reason: string) => void;
}

export const LoreGovernancePortal: React.FC<LoreGovernancePortalProps> = ({
  onNavigateToContest,
  onOpenCreator,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Planet Contest Submissions competing for June 30 voting
  const [contestSubmissions, setContestSubmissions] = useState<PlanetSubmission[]>([]);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSubmission | null>(null);

  useEffect(() => {
    setContestSubmissions(getStoredPlanetSubmissions());
  }, []);

  const handleVoteContest = async (submissionId: string) => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    soundManager.playTone(740, 0.06);
    const res = await togglePlanetSubmissionVote(submissionId, user?.id);
    if (res.success) {
      setContestSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : s
        )
      );
      if (selectedPlanet && selectedPlanet.id === submissionId) {
        setSelectedPlanet((prev) =>
          prev ? { ...prev, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : null
        );
      }
    }
  };

  const handleOpenDossier = (sub: PlanetSubmission) => {
    soundManager.playTone(660, 0.05);
    setSelectedPlanet(sub);
  };

  return (
    <div className="space-y-8 w-full max-w-full box-border">
      {/* Intro Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-black/50 to-black/80 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-bold tracking-wider">
              MODULE 05 · LORE GOVERNANCE &amp; CONTEST VOTING
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>VOTING OPEN UNTIL JUNE 30</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            🗳️ Lore &amp; Governance Portal
          </h1>
          <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
            Cast binding community votes on official planetary territories competing in the 2027 Äkinoya Worldbuilding Contest. Every submission features a complete 5-photo anime dossier and lore archive.
          </p>
        </div>

        {onNavigateToContest && (
          <button
            type="button"
            onClick={onNavigateToContest}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Trophy className="w-4 h-4 fill-black" />
            <span>Enter Contest Launchpad</span>
          </button>
        )}
      </div>

      {/* WORLDBUILDING CONTEST ENTRIES SHOWCASE (CLOSES JUNE 30) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Registered Worldbuilding Territories (Closing June 30)
            </h2>
          </div>
          <span className="text-[10.5px] font-mono text-white/40">
            {contestSubmissions.length} Official Sectors · 5-Photo Visual Galleries
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contestSubmissions.map((sub, idx) => (
            <div
              key={sub.id}
              className="rounded-2xl overflow-hidden bg-black/60 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between shadow-lg group"
            >
              <div
                onClick={() => handleOpenDossier(sub)}
                className="cursor-pointer"
              >
                <div className="relative h-44 w-full overflow-hidden bg-black/90">
                  <img
                    src={sub.renders.hero}
                    alt={sub.planetName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/40">
                    #{idx + 1} RANK
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-cyan-300" />
                    <span>5 PHOTOS</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-display font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {sub.planetName}
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                      View Dossier →
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/60">
                    <div
                      className={`w-4 h-4 rounded-full bg-gradient-to-tr ${
                        sub.authorAvatarGradient || 'from-cyan-400 to-indigo-600'
                      } flex items-center justify-center font-bold text-[8px] text-black`}
                    >
                      {sub.authorName.slice(0, 1)}
                    </div>
                    <span className="truncate">By {sub.authorName}</span>
                  </div>

                  <p className="text-xs text-white/70 font-sans line-clamp-2 leading-relaxed">
                    {sub.generatedLore}
                  </p>
                </div>
              </div>

              <div className="p-3.5 border-t border-white/10 flex items-center justify-between gap-2 bg-[#050812]">
                <button
                  type="button"
                  onClick={() => handleVoteContest(sub.id)}
                  className={`min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    sub.hasVoted
                      ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${sub.hasVoted ? 'fill-black' : ''}`} />
                  <span>{sub.hasVoted ? 'Voted' : 'Vote for World'} ({sub.votesCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDossier(sub)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer text-xs font-mono flex items-center gap-1"
                  title="Open 5-Photo Dossier"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Dossier</span>
                </button>

                {onOpenCreator && (
                  <button
                    type="button"
                    onClick={() => onOpenCreator(sub.authorUsername)}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-cyan-300 transition-colors cursor-pointer text-xs font-mono"
                    title="View Creator Portfolio"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive 5-Photo Planet Dossier Modal */}
      <PlanetDossierModal
        planet={selectedPlanet}
        isOpen={Boolean(selectedPlanet)}
        onClose={() => setSelectedPlanet(null)}
        onVote={handleVoteContest}
        onOpenCreator={onOpenCreator}
      />
    </div>
  );
};
