import React from 'react';
import { Trophy, Heart, Sparkles, ShieldCheck, ArrowRight, Music, Crown } from 'lucide-react';
import { CreatorProfile, getStoredCreators } from '../data/creators';
import { soundManager } from '../utils/audio';

interface CreatorLeaderboardProps {
  onSelectCreator: (username: string) => void;
  selectedUsername?: string;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({
  onSelectCreator,
  selectedUsername,
}) => {
  const creators = getStoredCreators();
  // Sort creators descending by likesCount
  const rankedCreators = [...creators].sort((a, b) => b.likesCount - a.likesCount);
  const portfolioOfTheMonth = rankedCreators[0];

  return (
    <div className="space-y-6">
      {/* Portfolio of the Month Spotlight Banner */}
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

      {/* Leaderboard Table / Cards */}
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
                  {/* Rank number badge */}
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

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${creator.avatarGradient} shrink-0 flex items-center justify-center text-xs font-bold font-mono text-white`}
                  >
                    {creator.fullName.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
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

                {/* Right side: Likes Count & CTA */}
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
  );
};
