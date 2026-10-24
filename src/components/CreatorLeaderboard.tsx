import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Globe2,
  Camera,
  ThumbsUp,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { getStoredPlanetSubmissions, togglePlanetSubmissionVote, fetchPlanetSubmissions, subscribeToPlanetSubmissions } from '../data/contest';
import { soundManager } from '../utils/audio';
import { isFoundingPioneerPlanet, isPioneerPlanet } from '../utils/pioneer';
import { formatAuthorName } from '../utils/holder';
import { PlanetDossierModal } from './PlanetDossierModal';
import { useAuth } from '../context/AuthContext';

export interface CreatorLeaderboardProps {
  onSelectCreator?: (username: string) => void;
  selectedUsername?: string;
  onSelectPlanet?: (planet: PlanetSubmission) => void;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({
  onSelectPlanet,
}) => {
  const { user, profile } = useAuth();
  const [selectedModalPlanet, setSelectedModalPlanet] = useState<PlanetSubmission | null>(null);
  const [planetSubmissions, setPlanetSubmissions] = useState<PlanetSubmission[]>(() => getStoredPlanetSubmissions());

  useEffect(() => {
    fetchPlanetSubmissions(user?.id, user?.email).then((subs) => {
      if (subs && subs.length > 0) {
        setPlanetSubmissions(subs);
      }
    });

    const unsubscribe = subscribeToPlanetSubmissions((fresh) => {
      if (fresh && fresh.length > 0) {
        setPlanetSubmissions(fresh);
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.email]);

  // Planets data dynamically sorted descending by total votesCount
  const rankedPlanets = [...planetSubmissions].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  const topFavoritePlanet = rankedPlanets[0];

  const handleOpenPlanetModal = (planet: PlanetSubmission) => {
    soundManager.playTone(660, 0.05);
    if (onSelectPlanet) {
      onSelectPlanet(planet);
    } else {
      setSelectedModalPlanet(planet);
    }
  };

  const handleVotePlanet = async (submissionId: string) => {
    soundManager.playTone(740, 0.06);
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    const userUsername = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || '';
    const res = await togglePlanetSubmissionVote(submissionId, user?.id, userEmail, userUsername);
    if (!res.success && res.error) {
      soundManager.playError();
      alert(res.error);
      return;
    }
    if (res.success) {
      setPlanetSubmissions((prev) =>
        prev
          .map((p) => (p.id === submissionId ? { ...p, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : p))
          .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
      );
    } else {
      setPlanetSubmissions(getStoredPlanetSubmissions());
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Pure Group's Favorite Planets Spotlight & Rankings */}
      {rankedPlanets.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-cyan-950/35 via-[#060c18]/80 to-[#040812]/90 backdrop-blur-xl border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Globe2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-display font-bold text-white tracking-wide">
              No Worlds Synthesized Yet
            </h4>
            <p className="text-xs text-white/50 font-mono max-w-md mx-auto">
              Be the first creator to synthesize a planetary world and lead the community leaderboard.
            </p>
          </div>
          <a
            href="/contest"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-black shrink-0" />
            <span>CLAIM &amp; SYNTHESIZE A WORLD →</span>
          </a>
        </div>
      ) : (
        <>
          {/* Spotlight Banner: #1 Group's Favorite Planet (Ämlemi) */}
          {topFavoritePlanet && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/75 via-[#070d1b]/85 to-cyan-950/50 backdrop-blur-xl border border-amber-400/50 p-5 sm:p-7 shadow-[0_0_45px_rgba(245,158,11,0.28),inset_0_1px_1px_rgba(255,255,255,0.12)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                    <Crown className="w-4 h-4 fill-black text-black" />
                  </span>
                  <div>
                    <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300 block drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                      Group&apos;s Favorite Planet · Official Community Benchmark
                    </span>
                    <span className="text-[10px] font-mono text-white/55">
                      Top-ranked planetary dossier voted by Äkinoya explorers
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isPioneerPlanet(topFavoritePlanet) && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-amber-500/30 via-yellow-500/25 to-amber-600/30 text-amber-200 border border-amber-300/70 flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                      <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>
                        {isFoundingPioneerPlanet(topFavoritePlanet)
                          ? '👑 FOUNDING PIONEER · #01'
                          : '⚡ PIONEER 2027'}
                      </span>
                    </span>
                  )}
                  <span className="px-3.5 py-1 rounded-full text-xs font-mono font-black bg-[#050914]/90 border border-amber-400/60 flex items-center gap-1.5 shadow-[0_0_16px_rgba(251,191,36,0.35)]">
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                      #1 BENCHMARK · {topFavoritePlanet.votesCount} VOTES
                    </span>
                  </span>
                </div>
              </div>

              {/* Stacked through portrait/landscape tablets (sidebar narrows the content column); side-by-side only on xl */}
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 sm:gap-5 mt-2 relative z-10">
                <div className="flex items-center gap-4 min-w-0 w-full xl:w-auto xl:flex-1">
                  <div
                    onClick={() => handleOpenPlanetModal(topFavoritePlanet)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 p-0.5 shadow-[0_0_28px_rgba(245,158,11,0.45)] shrink-0 bg-black/90 cursor-pointer group/thumb"
                  >
                    <img
                      src={topFavoritePlanet.renders.hero}
                      alt={topFavoritePlanet.planetName}
                      className="w-full h-full object-cover rounded-xl group-hover/thumb:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide truncate">
                        {topFavoritePlanet.planetName}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/40 shrink-0">
                        5-PHOTO CINEMATIC DOSSIER
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-mono text-amber-200/90 truncate">
                      By {formatAuthorName(topFavoritePlanet.authorName)} (@{topFavoritePlanet.authorUsername})
                    </p>
                    <p className="text-xs text-white/75 font-sans line-clamp-2 max-w-2xl leading-relaxed">
                      {topFavoritePlanet.futurePromise || topFavoritePlanet.generatedLore}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPlanetModal(topFavoritePlanet)}
                  className="relative w-full xl:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.35)] xl:hover:scale-[1.02] flex items-center justify-center gap-2.5 shrink-0 whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 text-black shrink-0" />
                  <span className="truncate">Explore 5-Photo Dossier</span>
                  <ArrowRight className="w-4 h-4 text-black shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* Group's Favorite Planets Leaderboard Table / Rankings */}
          <div className="rounded-3xl bg-gradient-to-br from-cyan-950/35 via-[#070c18]/85 to-[#040812]/90 backdrop-blur-xl border border-cyan-500/30 p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.55)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <h4 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Group&apos;s Favorite Planets Rankings
                </h4>
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-cyan-300/80">Realtime Community Tally</span>
            </div>

            <div className="space-y-2.5">
              {rankedPlanets.slice(0, 10).map((planet, index) => {
                const rank = index + 1;
                const isFounder = isFoundingPioneerPlanet(planet);
                const isPioneer = isPioneerPlanet(planet);
                return (
                  <div
                    key={planet.id}
                    onClick={() => handleOpenPlanetModal(planet)}
                    className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                      isFounder
                        ? 'border-amber-400/50 bg-gradient-to-r from-amber-950/35 via-[#070c18]/80 to-[#050914]/90 hover:border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : 'border-white/10 bg-[#050914]/80 hover:bg-cyan-950/35 hover:border-cyan-400/45'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* High-End Luminous Metallic/Neon Rank Badge */}
                      <div className="w-9 h-9 rounded-xl bg-[#040812] border border-white/15 flex items-center justify-center shrink-0 font-display font-black text-xs sm:text-sm shadow-inner">
                        {rank === 1 ? (
                          <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]">
                            #1
                          </span>
                        ) : rank === 2 ? (
                          <span className="bg-gradient-to-b from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.65)]">
                            #2
                          </span>
                        ) : rank === 3 ? (
                          <span className="bg-gradient-to-b from-amber-200 via-orange-300 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]">
                            #3
                          </span>
                        ) : (
                          <span className="text-cyan-300/80 font-mono">#{rank}</span>
                        )}
                      </div>

                      {/* Planet Hero Thumbnail */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-amber-400/30 shrink-0 bg-black shadow-md">
                        <img
                          src={planet.renders.hero}
                          alt={planet.planetName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {planet.planetName}
                          </span>
                          {isPioneer && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.28)] uppercase tracking-wider">
                              {isFounder ? '👑 FOUNDING PIONEER' : '⚡ PIONEER 2027'}
                            </span>
                          )}
                          <span className="text-[10px] sm:text-xs font-mono text-white/55 truncate">
                            by {formatAuthorName(planet.authorName)}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs font-sans text-white/60 line-clamp-1 mt-0.5">
                          {planet.futurePromise || planet.landmark || planet.atmosphere}
                        </p>
                      </div>
                    </div>

                    {/* Luminous Votes Count & Arrow */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-400/45 shadow-[0_0_12px_rgba(251,191,36,0.2)] text-right">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-black justify-end">
                          <ThumbsUp className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                          <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                            {planet.votesCount}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-200/60 uppercase tracking-wider hidden sm:block">
                          Votes
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-amber-300 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Embedded 5-Photo Planet Dossier Modal for Direct Inspection */}
      <PlanetDossierModal
        planet={selectedModalPlanet}
        isOpen={Boolean(selectedModalPlanet)}
        onClose={() => setSelectedModalPlanet(null)}
        onVote={handleVotePlanet}
      />
    </div>
  );
};
