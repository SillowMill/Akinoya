import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Globe2,
  Camera,
  ThumbsUp,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { getStoredPlanetSubmissions, togglePlanetSubmissionVote, fetchPlanetSubmissions, subscribeToPlanetSubmissions } from '../data/contest';
import { soundManager } from '../utils/audio';
import { PlanetDossierModal } from './PlanetDossierModal';

export interface CreatorLeaderboardProps {
  onSelectCreator?: (username: string) => void;
  selectedUsername?: string;
  onSelectPlanet?: (planet: PlanetSubmission) => void;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({
  onSelectPlanet,
}) => {
  const [selectedModalPlanet, setSelectedModalPlanet] = useState<PlanetSubmission | null>(null);
  const [planetSubmissions, setPlanetSubmissions] = useState<PlanetSubmission[]>(() => getStoredPlanetSubmissions());

  useEffect(() => {
    fetchPlanetSubmissions().then((subs) => {
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
  }, []);

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
    const res = await togglePlanetSubmissionVote(submissionId);
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
        <div className="p-8 sm:p-12 rounded-2xl bg-black/40 border border-white/10 text-center space-y-4">
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/85 via-yellow-950/70 to-amber-900/60 border border-amber-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-400 text-black shrink-0 shadow-md">
                    <Crown className="w-4 h-4 fill-black text-black" />
                  </span>
                  <div>
                    <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300 block">
                      Group&apos;s Favorite Planet · Official Community Benchmark
                    </span>
                    <span className="text-[10px] font-mono text-white/50">
                      Top-ranked planetary dossier voted by Äkinoya explorers
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-sm">
                  <ThumbsUp className="w-3.5 h-3.5 fill-amber-300" />
                  <span>#1 BENCHMARK · {topFavoritePlanet.votesCount} VOTES</span>
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mt-2 relative z-10">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    onClick={() => handleOpenPlanetModal(topFavoritePlanet)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/70 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.35)] shrink-0 bg-black/90 cursor-pointer group/thumb"
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
                      By {topFavoritePlanet.authorName} (@{topFavoritePlanet.authorUsername})
                    </p>
                    <p className="text-xs text-white/70 font-sans line-clamp-2 max-w-2xl leading-relaxed">
                      {topFavoritePlanet.futurePromise || topFavoritePlanet.generatedLore}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPlanetModal(topFavoritePlanet)}
                  className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:scale-[1.02] flex items-center justify-center gap-2.5 shrink-0"
                >
                  <Camera className="w-4 h-4 text-black" />
                  <span>Explore 5-Photo Dossier</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
          )}

          {/* Group's Favorite Planets Leaderboard Table / Rankings */}
          <div className="rounded-3xl bg-[#090d16] border border-white/10 p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Group&apos;s Favorite Planets Rankings
                </h4>
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-white/40">Realtime Community Tally</span>
            </div>

            <div className="space-y-2.5">
              {rankedPlanets.slice(0, 10).map((planet, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={planet.id}
                    onClick={() => handleOpenPlanetModal(planet)}
                    className="p-3.5 sm:p-4 rounded-2xl border border-white/5 bg-black/40 hover:bg-white/5 hover:border-amber-400/40 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Rank badge */}
                      <div className="w-7 shrink-0 text-center font-mono font-bold text-xs sm:text-sm">
                        {rank === 1 ? (
                          <span className="text-amber-400">#1</span>
                        ) : rank === 2 ? (
                          <span className="text-slate-300">#2</span>
                        ) : rank === 3 ? (
                          <span className="text-amber-600">#3</span>
                        ) : (
                          <span className="text-white/40">#{rank}</span>
                        )}
                      </div>

                      {/* Planet Hero Thumbnail */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black">
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
                          <span className="text-[10px] sm:text-xs font-mono text-white/50 truncate">
                            by {planet.authorName}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs font-sans text-white/60 line-clamp-1 mt-0.5">
                          {planet.futurePromise || planet.landmark || planet.atmosphere}
                        </p>
                      </div>
                    </div>

                    {/* Votes Count & Arrow */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-bold text-amber-400 justify-end">
                          <ThumbsUp className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{planet.votesCount}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono text-white/40 hidden sm:inline">
                          Votes
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
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
