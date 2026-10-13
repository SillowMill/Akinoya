import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Vote,
  Trophy,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  ThumbsUp,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { PlanetSubmission } from '../types/contest';
import { getStoredPlanetSubmissions, togglePlanetSubmissionVote } from '../data/contest';

interface GovernanceBallot {
  id: string;
  title: string;
  category: string;
  description: string;
  totalVotes: number;
  userVoteId?: string;
  options: { id: string; label: string; votes: number }[];
}

interface LoreGovernancePortalProps {
  onNavigateToContest?: () => void;
  onOpenCreator?: (username: string) => void;
  onOpenUpgradeModal?: (reason: string) => void;
}

export const LoreGovernancePortal: React.FC<LoreGovernancePortalProps> = ({
  onNavigateToContest,
  onOpenCreator,
  onOpenUpgradeModal,
}) => {
  const { user, isVip, role, isAuthenticated, openAuthModal } = useAuth();

  const isVipOrAbove =
    isVip ||
    role === 'VIP_GUEST' ||
    role === 'ANNUAL_PASS' ||
    role === 'CREATOR';

  // Standard Storyline Governance Ballots
  const [governanceBallots, setGovernanceBallots] = useState<GovernanceBallot[]>([
    {
      id: 'ballot-territory',
      title: 'Council Ballot #01: Chapter 2 Planetary Territory Exploration',
      category: 'FREE SAMPLE BALLOT',
      description:
        'Community & Patrons vote to decide which territory within Planet Äkinoya will serve as the primary setting for Chapter 2 of the animated story.',
      totalVotes: 104,
      options: [
        { id: 'opt-spire', label: 'Sector 04 — The Obsidian Spire & Resonance Core', votes: 52 },
        { id: 'opt-archipelago', label: 'The Neon Archipelago of Upper Äkinoya', votes: 34 },
        { id: 'opt-caverns', label: 'Sub-Surface Crystal Caverns & Bioluminescent Vault', votes: 18 },
      ],
      userVoteId: undefined,
    },
    {
      id: 'ballot-merch',
      title: 'Council Ballot #02: Wave 2 Exclusive Physical Artifact Drop',
      category: 'PATRON EXCLUSIVE BALLOT',
      description:
        'Which physical collector piece should be prioritized for the upcoming batch release for Founding Pass & Patron members?',
      totalVotes: 78,
      options: [
        { id: 'opt-jacket', label: 'Embroidered Äkinoya Pilot Flight Jacket', votes: 38 },
        { id: 'opt-hoodie', label: 'Heavyweight Screenprinted Graphic Hooded Fleece', votes: 27 },
        { id: 'opt-keycard', label: 'Anodized Titanium VIP Keycard & NFC Medallion', votes: 13 },
      ],
      userVoteId: undefined,
    },
  ]);

  // Planet Contest Submissions competing for June 30 voting
  const [contestSubmissions, setContestSubmissions] = useState<PlanetSubmission[]>([]);

  useEffect(() => {
    setContestSubmissions(getStoredPlanetSubmissions());
  }, []);

  const handleVoteBallot = (ballotId: string, optionId: string, isFirstBallot: boolean) => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    if (!isVipOrAbove && !isFirstBallot) {
      soundManager.playTone(480, 0.08);
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Council Ballot #02 is reserved for verified VIP and Patron members. Annual membership (€60/year, ~€5/month) launches on 09/01/2027.'
        );
      }
      return;
    }

    soundManager.playUnlockChime();
    setGovernanceBallots((prev) =>
      prev.map((b) => {
        if (b.id === ballotId) {
          const prevVoted = b.userVoteId;
          const updatedOptions = b.options.map((opt) => {
            if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
            if (prevVoted && opt.id === prevVoted) return { ...opt, votes: Math.max(0, opt.votes - 1) };
            return opt;
          });
          return {
            ...b,
            options: updatedOptions,
            userVoteId: optionId,
            totalVotes: prevVoted ? b.totalVotes : b.totalVotes + 1,
          };
        }
        return b;
      })
    );
  };

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
    }
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
            Cast binding community votes on storyline territory branches and vote for your favorite user-generated worlds in the 2027 Äkinoya Worldbuilding Contest.
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

      {/* SECTION A: WORLDBUILDING CONTEST ENTRIES (CLOSES JUNE 30) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Community Worldbuilding Submissions (Closing June 30)
            </h2>
          </div>
          <span className="text-[10.5px] font-mono text-white/40">
            {contestSubmissions.length} Registered Worlds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contestSubmissions.map((sub, idx) => (
            <div
              key={sub.id}
              className="rounded-2xl overflow-hidden bg-black/60 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between shadow-lg group"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-black/90">
                  <img
                    src={sub.renders.hero}
                    alt={sub.planetName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/40">
                    #{idx + 1} RANK
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-400/40">
                    {sub.votesCount} VOTES
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-display font-bold text-white truncate">
                    {sub.planetName}
                  </h3>

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
                  <span>{sub.hasVoted ? 'Voted' : 'Vote for World'}</span>
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

      {/* SECTION B: CORE COUNCIL STORYLINE BALLOTS */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Planetary Directives &amp; Physical Drop Ballots
          </h2>
        </div>

        <div className="space-y-6">
          {governanceBallots.map((ballot, index) => {
            const isFirstBallot = index === 0;
            const isLocked = !isVipOrAbove && !isFirstBallot;

            return (
              <div
                key={ballot.id}
                className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-emerald-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-400/40">
                    {ballot.category}
                  </span>
                  <span className="text-xs font-mono text-white/50">{ballot.totalVotes} Total Ballots</span>
                </div>

                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  {ballot.title}
                </h3>

                <p className="text-xs sm:text-sm text-white/70 font-sans">
                  {ballot.description}
                </p>

                {isLocked ? (
                  <div className="p-6 rounded-xl backdrop-blur-md bg-black/70 border border-emerald-500/30 text-center flex flex-col items-center justify-center">
                    <Lock className="w-8 h-8 text-yellow-400 mb-2" />
                    <div className="text-sm font-display font-bold text-white mb-1">
                      COUNCIL BALLOT #02 RESERVED FOR PATRONS
                    </div>
                    <p className="text-xs text-white/70 mb-4 max-w-sm">
                      Activate membership for €60/year (~€5/mo) to cast your binding vote on physical merchandise drops and lore directives.
                    </p>
                    <button
                      type="button"
                      disabled={true}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300/80 font-mono font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-1.5 opacity-85 select-none text-center"
                    >
                      <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>LAUNCHES 09/01/2027 — €60/YEAR (~€5/MONTH)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {ballot.options.map((opt) => {
                      const pct = ballot.totalVotes > 0 ? Math.round((opt.votes / ballot.totalVotes) * 100) : 0;
                      const isVoted = ballot.userVoteId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleVoteBallot(ballot.id, opt.id, isFirstBallot)}
                          className={`w-full min-h-[44px] text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                            isVoted
                              ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : 'bg-black/50 border-white/10 hover:border-emerald-500/40 text-white/80'
                          }`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-emerald-500/15 pointer-events-none transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isVoted
                                    ? 'border-emerald-400 bg-emerald-400'
                                    : 'border-white/30 group-hover:border-emerald-400'
                                }`}
                              >
                                {isVoted && <CheckCircle2 className="w-3 h-3 text-black" />}
                              </div>
                              <span className="text-xs sm:text-sm font-semibold truncate">
                                {opt.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                              <span className="text-emerald-400 font-bold">{pct}%</span>
                              <span className="text-white/40 text-[11px]">({opt.votes})</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {ballot.userVoteId && (
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ballot recorded against your identity.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
