import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Heart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Music,
  Crown,
  Globe2,
  Camera,
  ThumbsUp,
  Flame,
} from 'lucide-react';
import { CreatorProfile, getStoredCreators } from '../data/creators';
import { PlanetSubmission } from '../types/contest';
import { getStoredPlanetSubmissions, togglePlanetSubmissionVote, fetchPlanetSubmissions } from '../data/contest';
import { soundManager } from '../utils/audio';
import { PlanetDossierModal } from './PlanetDossierModal';

interface CreatorLeaderboardProps {
  onSelectCreator: (username: string) => void;
  selectedUsername?: string;
  onSelectPlanet?: (planet: PlanetSubmission) => void;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({
  onSelectCreator,
  selectedUsername,
  onSelectPlanet,
}) => {
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'planets' | 'creators'>('planets');
  const [selectedModalPlanet, setSelectedModalPlanet] = useState<PlanetSubmission | null>(null);
  const [planetSubmissions, setPlanetSubmissions] = useState<PlanetSubmission[]>(() => getStoredPlanetSubmissions());

  useEffect(() => {
    fetchPlanetSubmissions().then((subs) => {
      setPlanetSubmissions(subs);
    });
  }, []);

  // Creators data
  const creators = getStoredCreators();
  const rankedCreators = [...creators].sort((a, b) => b.likesCount - a.likesCount);
  const portfolioOfTheMonth = rankedCreators[0];

  // Planets data (sorted descending by votesCount)
  const rankedPlanets = [...planetSubmissions].sort((a, b) => b.votesCount - a.votesCount);
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
    const updated = await togglePlanetSubmissionVote(submissionId);
    setPlanetSubmissions(updated);
  };

  return (
    <div className="space-y-6">
      {/* Dual Tab Mode Switcher: Group's Favorite Planets vs Creator Syndicate */}
      <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            soundManager.playTone(600, 0.04);
            setActiveLeaderboardTab('planets');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeLeaderboardTab === 'planets'
              ? 'bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${activeLeaderboardTab === 'planets' ? 'fill-black' : 'text-amber-400'}`} />
          <span>Group's Favorite Planets</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playTone(550, 0.04);
            setActiveLeaderboardTab('creators');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeLeaderboardTab === 'creators'
              ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className={`w-3.5 h-3.5 ${activeLeaderboardTab === 'creators' ? 'fill-black' : 'text-cyan-400'}`} />
          <span>Creator Portfolios</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: GROUP'S FAVORITE PLANETS SPOTLIGHT & LEADERBOARD  */}
      {/* ======================================================== */}
      {activeLeaderboardTab === 'planets' && (
        <div className="space-y-6">
          {rankedPlanets.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-black/40 border border-white/10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Globe2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-display font-bold text-white tracking-wide">
                  No Sectors Synthesized Yet
                </h4>
                <p className="text-xs text-white/50 font-mono max-w-md mx-auto">
                  Be the first creator to synthesize a planetary sector and lead the community leaderboard.
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
              {/* Spotlight Banner: #1 Group's Favorite Planet */}
              {topFavoritePlanet && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/85 via-yellow-950/70 to-amber-900/60 border border-amber-500/40 p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-400 text-black shrink-0">
                        <Crown className="w-4 h-4 fill-black text-black" />
                      </span>
                      <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                        Group's Favorite Planet · Spotlight
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 fill-amber-300" />
                      <span>#1 RANKED · {topFavoritePlanet.votesCount} VOTES</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 relative z-10">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/60 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 bg-black/80">
                        <img
                          src={topFavoritePlanet.renders.hero}
                          alt={topFavoritePlanet.planetName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-display font-extrabold text-white tracking-wide truncate">
                            {topFavoritePlanet.planetName}
                          </h3>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/30 shrink-0">
                            5 PHOTOS
                          </span>
                        </div>
                        <p className="text-xs font-mono text-amber-200/90 truncate">
                          By {topFavoritePlanet.authorName} (@{topFavoritePlanet.authorUsername})
                        </p>
                        <p className="text-[11px] font-sans text-white/70 line-clamp-1 mt-0.5">
                          {topFavoritePlanet.futurePromise || topFavoritePlanet.generatedLore}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPlanetModal(topFavoritePlanet)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Explore 5-Photo Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Group's Favorite Planets Leaderboard Table / Rankings */}
              <div className="rounded-2xl bg-[#090d16] border border-white/10 p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Group's Favorite Planets Rankings
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">Realtime Community Tally</span>
                </div>

                <div className="space-y-2">
                  {rankedPlanets.slice(0, 5).map((planet, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={planet.id}
                        onClick={() => handleOpenPlanetModal(planet)}
                        className="p-3 sm:p-3.5 rounded-xl border border-white/5 bg-black/40 hover:bg-white/5 hover:border-amber-400/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank badge */}
                          <div className="w-6 shrink-0 text-center font-mono font-bold text-xs">
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
                          <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black">
                            <img
                              src={planet.renders.hero}
                              alt={planet.planetName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                                {planet.planetName}
                              </span>
                              <span className="text-[10px] font-mono text-white/50 truncate">
                                by {planet.authorName}
                              </span>
                            </div>
                            <p className="text-[11px] font-sans text-white/60 line-clamp-1 mt-0.5">
                              {planet.futurePromise || planet.landmark || planet.atmosphere}
                            </p>
                          </div>
                        </div>

                        {/* Votes Count & Arrow */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 justify-end">
                              <ThumbsUp className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{planet.votesCount}</span>
                            </div>
                            <span className="text-[9px] font-mono text-white/40 hidden sm:inline">
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: CREATOR SYNDICATE LEADERBOARDS                   */}
      {/* ======================================================== */}
      {activeLeaderboardTab === 'creators' && (
        <div className="space-y-6">
          {portfolioOfTheMonth && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-amber-900/60 border border-amber-500/40 p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
              <div className="absolute top-0 right-0 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-400 text-black shrink-0">
                    <Trophy className="w-4 h-4 fill-black" />
                  </span>
                  <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                    Portfolio of the Month
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  #1 RANKED · {portfolioOfTheMonth.likesCount} APPRECIATIONS
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${portfolioOfTheMonth.avatarGradient} p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 flex items-center justify-center`}>
                    <span className="text-lg font-bold text-white font-mono">
                      {portfolioOfTheMonth.fullName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                        {portfolioOfTheMonth.fullName}
                      </h3>
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-xs font-mono text-amber-200/80">@{portfolioOfTheMonth.username}</p>
                    <p className="text-[11px] font-sans text-white/70 line-clamp-1 mt-0.5">
                      {portfolioOfTheMonth.headline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(660, 0.05);
                    onSelectCreator(portfolioOfTheMonth.username);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
                >
                  <span>Explore Spotlight Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#090d16] border border-white/10 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Creator Leaderboard &amp; Showcase Rankings
                </h4>
              </div>
              <span className="text-[10px] font-mono text-white/40">Updated Live</span>
            </div>

            <div className="space-y-2">
              {rankedCreators.map((creator, index) => {
                const isSelected = selectedUsername?.toLowerCase() === creator.username.toLowerCase();
                const rank = index + 1;
                return (
                  <div
                    key={creator.id}
                    onClick={() => {
                      soundManager.playTone(540 + index * 40, 0.04);
                      onSelectCreator(creator.username);
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-black/40 hover:bg-white/5 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 shrink-0 text-center font-mono font-bold text-xs">
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

                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${creator.avatarGradient} shrink-0 flex items-center justify-center text-xs font-bold font-mono text-white`}
                      >
                        {creator.fullName.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">
                            {creator.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-white/50">@{creator.username}</span>
                          {creator.isArtist && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-violet-950/80 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                              <Music className="w-2.5 h-2.5" />
                              <span>Artist</span>
                            </span>
                          )}
                          {creator.hasVipPass && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>VIP</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-sans text-white/60 line-clamp-1 mt-0.5">
                          {creator.headline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400 justify-end">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          <span>{creator.likesCount}</span>
                        </div>
                        <span className="text-[9px] font-mono text-white/40 hidden sm:inline">
                          {creator.showcaseItems.length} items
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 hover:text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
