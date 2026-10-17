import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Play,
  Pause,
  Sliders,
  FolderDown,
  Lock,
  Globe2,
  Crown,
  Volume2,
  VolumeX,
  Compass,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Layers,
  MessageSquare,
  Trophy,
  Cpu,
  Tv,
  Film,
  Zap,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { openClaimWorldModal } from '../utils/pioneer';

import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import akinoyaPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.jpg';
import moodboardImg from '../assets/images/Mood.png';
import millAvatar from '../assets/images/mill_photo.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';

export interface WelcomeVisionPortalProps {
  isMember?: boolean;
  onNavigateToWorkflows: () => void;
  onNavigateToVault: () => void;
  onNavigateToDiscussion: () => void;
  onNavigateToLeaderboard: () => void;
  onOpenAuthModal?: () => void;
}

export const WelcomeVisionPortal: React.FC<WelcomeVisionPortalProps> = ({
  isMember = false,
  onNavigateToWorkflows,
  onNavigateToVault,
  onNavigateToDiscussion,
  onNavigateToLeaderboard,
  onOpenAuthModal,
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleToggleVideo = () => {
    soundManager.playTone(isVideoPlaying ? 420 : 640, 0.06);
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handleClaimPlanetClick = () => {
    soundManager.playTone(520, 0.05);
    openClaimWorldModal();
  };

  return (
    <div className="relative w-full text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 space-y-8 sm:space-y-12">
      {/* Background Cosmic Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/10 via-purple-600/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-2/3 left-1/4 w-[450px] h-[450px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* ======================================================== */}
        {/* HERO HEADER: MYSTERIOUS COSMIC GLASSMORPHISM             */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-gradient-to-r from-[#0a0e1c]/95 via-[#060913]/90 to-[#0c0818]/95 border border-cyan-500/30 p-6 sm:p-10 shadow-[0_0_45px_rgba(0,242,254,0.15)] overflow-hidden"
        >
          {/* Subtle Grid Lines & Bioluminescent Accents */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#00f2fe 1px, transparent 1px), linear-gradient(90deg, #00f2fe 1px, transparent 1px)`,
              backgroundSize: '36px 36px',
            }}
          />
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10.5px] font-mono px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-extrabold tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  00 · WELCOME &amp; VISION PORTAL
                </span>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                  DECENTRALIZED WORLDBUILDING
                </span>
                {isMember ? (
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-emerald-400" />
                    FOUNDER / VIP PASS ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300/90 font-semibold tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    MEMBERSHIP GATE · JAN 9, 2027
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-[1.1]">
                Welcome to the{' '}
                <span className="bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
                  Sillow Mill
                </span>{' '}
                Universe
              </h1>

              <p className="text-sm sm:text-base text-white/80 font-sans leading-relaxed max-w-2xl">
                A sovereign sci-fi universe built on hybrid AI engineering, Blender 3D previs, and
                decentralized community planetary governance. Discover the exact 5-stage production
                blueprint behind <em>Äkinoya</em> and prepare to forge your own custom world.
              </p>
            </div>

            {/* Quick Hero Guide Persona */}
            <div className="shrink-0 flex items-center gap-3 p-3.5 px-4 rounded-2xl bg-black/70 border border-cyan-500/30 max-w-sm backdrop-blur-md self-start lg:self-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="relative shrink-0">
                <img
                  src={millAvatar}
                  alt="Mill"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.5)]"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-black" />
              </div>
              <div className="text-xs leading-snug font-sans">
                <span className="font-mono font-bold text-cyan-300 block">Mill (Universe Guide):</span>
                <span className="text-white/80 text-[11.5px]">
                  &ldquo;Watch Odi&apos;s transmission below to understand how every stage connects directly to our future VR galaxy.&rdquo;
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* EMBEDDED VIDEO HERO FRAME (16:9 CINEMATIC TRANSMISSION)  */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-cyan-500/30 sm:border-2 sm:border-cyan-500/40 bg-black shadow-[0_0_50px_rgba(0,242,254,0.15)] group/video my-2 sm:my-4"
        >
          {/* Top Video Header Chrome */}
          <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-[#070b16]/95 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 uppercase tracking-wider truncate">
                TRANSMISSION LOCKED · WELCOME &amp; VISION
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-[10.5px] font-mono text-white/60 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-400/40 text-amber-300 font-bold whitespace-nowrap shadow-sm text-[9.5px] sm:text-[10.5px]">
                🔒 RELEASE: JANUARY 9, 2027
              </span>
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80">
                16:9 CINEMATIC · 4K UHD
              </span>
            </div>
          </div>

          {/* Video Canvas Container: Generous min-height on mobile/iPad portrait to eliminate edge-crowding */}
          <div className="relative min-h-[390px] sm:min-h-[430px] md:min-h-[440px] lg:min-h-0 lg:aspect-[16/9] w-full overflow-hidden bg-[#04060c] flex items-center justify-center">
            {/* Visual Poster & Ambient Scanlines */}
            <img
              src={akinoyaVistaImg}
              alt="Äkinoya Vista Transmission"
              className="w-full h-full object-cover brightness-75 filter group-hover/video:scale-102 transition-transform duration-1000"
            />

            {/* Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 pointer-events-none" />

            {/* Glowing Amber/Gold Ambient Core */}
            <div className="absolute inset-0 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Glowing Cyan Vector Scanline Overlay */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,242,254,0.15) 0px, transparent 2px, transparent 4px)',
              }}
            />

            {/* Gold Lock Overlay (Spacious, beautifully padded & centered) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 xs:p-6 sm:p-8 md:p-10 text-center space-y-3 sm:space-y-4 z-20">
              {/* Prominent Gold Lock Icon */}
              <div
                onClick={() => {
                  soundManager.playTone(330, 0.08);
                  alert(
                    "🔒 Personal Studio Transmission Locked\n\nPersonal Studio Transmission will be available on release day: January 9, 2027.\n\nOdi's personal welcome & system breakdown recorded live from the home studio."
                  );
                }}
                className="relative group/lock flex items-center justify-center cursor-pointer shrink-0"
                title="Personal Studio Transmission will be available on release day: January 9, 2027"
              >
                <div className="absolute -inset-4 rounded-full bg-amber-400/25 blur-2xl group-hover/lock:bg-amber-400/40 transition-all duration-300" />
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)] group-hover/lock:scale-110 transition-transform border-2 border-amber-200">
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-black fill-black/20" />
                </div>
              </div>

              {/* Gold Lock Overlay Badge & Text */}
              <div className="space-y-2 sm:space-y-2.5 max-w-xl px-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-amber-950/90 border border-amber-400/60 text-amber-300 font-mono text-[9px] xs:text-[9.5px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase shadow-md max-w-full">
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">TRANSMISSION LOCKED · RELEASES JANUARY 9, 2027</span>
                  </span>
                </div>

                <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 drop-shadow-md leading-snug px-2">
                  Personal Studio Transmission will be available on release day: January 9, 2027
                </h3>

                <p className="text-xs sm:text-sm text-amber-100/90 font-sans drop-shadow-sm max-w-md mx-auto leading-relaxed px-2">
                  Odi&apos;s personal welcome &amp; system breakdown recorded live from the home studio.
                </p>

                <div className="pt-1 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-mono text-white/50 tracking-wider">
                  <span>STUDIO 4K RAW MASTER</span>
                  <span>·</span>
                  <span>RECORDED FROM HOME STUDIO</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* THE NARRATIVE & META-VISION (3 CORE PILLARS)             */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Pillar 1: The Hybrid Production Blueprint */}
          <div className="p-6 rounded-3xl bg-[#070b16]/95 border border-cyan-500/35 backdrop-blur-2xl space-y-3.5 shadow-[0_0_30px_rgba(0,242,254,0.12)] flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                <Sliders className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                PILLAR 01 · PRODUCTION BLUEPRINT
              </span>
              <h3 className="text-lg font-display font-extrabold text-white">
                The 5-Stage Hybrid Pipeline
              </h3>
              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Zero generic one-prompt AI slop. Sillow Mill combines hand-drawn 2.39:1 CinemaScope
                storyboards, Blender 3D kinematic camera rigs, structured 4-block prompt syntax bibles,
                and uncompressed 24-bit 96kHz audio masters.
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateToWorkflows}
              className="pt-2 text-xs font-mono font-bold text-cyan-300 hover:text-cyan-100 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span>Explore 5-Stage Workflow</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Pillar 2: Drive Asset Vault Deliverables */}
          <div className="p-6 rounded-3xl bg-[#070b16]/95 border border-purple-500/35 backdrop-blur-2xl space-y-3.5 shadow-[0_0_30px_rgba(177,66,240,0.12)] flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(177,66,240,0.3)]">
                <FolderDown className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                PILLAR 02 · 1-TO-1 ASSET DELIVERABLES
              </span>
              <h3 className="text-lg font-display font-extrabold text-white">
                5-Folder Drive Vault Directory
              </h3>
              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Inspect every asset from pre-production to post-mastering. Explore original character
                turnaround model sheets, Ableton Live .als templates, Blender .blend cockpit rigs,
                and 120+ structured prompt JSON databases.
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateToVault}
              className="pt-2 text-xs font-mono font-bold text-purple-300 hover:text-purple-100 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span>Inspect Drive Asset Vault</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Pillar 3: Sovereign Planet Governance & VR Meta-Experience */}
          <div className="p-6 rounded-3xl bg-[#070b16]/95 border border-amber-500/35 backdrop-blur-2xl space-y-3.5 shadow-[0_0_30px_rgba(245,158,11,0.12)] flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Globe2 className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                PILLAR 03 · THE META-VISION
              </span>
              <h3 className="text-lg font-display font-extrabold text-white">
                Planetary Governance &amp; VR Galaxy
              </h3>
              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Every member will forge, name, and govern their own custom planet. What begins as
                lore dossiers and leaderboard voting will directly evolve into a fully immersive,
                interconnected VR/Meta-Experience in the future.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClaimPlanetClick}
              className="pt-2 text-xs font-mono font-bold text-amber-300 hover:text-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Create Your Free World [PIONEER-2027] →</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE CALL-TO-ACTIONS (PRIMARY NAVIGATION CTAS)    */}
        {/* ======================================================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/90 via-[#060a14]/98 to-purple-950/90 border border-cyan-500/40 shadow-[0_0_45px_rgba(0,242,254,0.2)] space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[10.5px] font-mono text-cyan-300 font-extrabold uppercase tracking-widest">
              COMMENCE YOUR JOURNEY
            </span>
            <h2 className="text-xl sm:text-3xl font-display font-black text-white">
              Where would you like to begin?
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-sans">
              Choose your portal into the Äkinoya universe. From step-by-step production theory to
              real-time community discussion and live planet voting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* CTA 1 */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(600, 0.05);
                onNavigateToWorkflows();
              }}
              className="p-4 sm:p-5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_25px_rgba(0,242,254,0.5)] flex flex-col items-center justify-center gap-2 group hover:scale-[1.02]"
            >
              <Sliders className="w-6 h-6 text-black" />
              <span>Explore 5-Stage Workflow →</span>
              <span className="text-[10px] font-sans font-normal text-black/70">
                Storyboards, 3D Rigs, Prompts
              </span>
            </button>

            {/* CTA 2 */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(600, 0.05);
                onNavigateToVault();
              }}
              className="p-4 sm:p-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-cyan-400 text-white font-mono font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group hover:scale-[1.02]"
            >
              <FolderDown className="w-6 h-6 text-cyan-400" />
              <span>Inspect Asset Vault →</span>
              <span className="text-[10px] font-sans font-normal text-white/60">
                5 Workflow-Mapped Folders
              </span>
            </button>

            {/* CTA 3 */}
            <button
              type="button"
              onClick={handleClaimPlanetClick}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 hover:from-amber-500/35 hover:to-yellow-500/30 border border-amber-400/60 text-amber-300 font-mono font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group hover:scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold">
                  [PIONEER-2027]
                </span>
              </div>
              <span>Create Your Free World →</span>
              <span className="text-[10px] font-sans font-normal text-amber-200/80">
                Create your free world before 09/01/2027
              </span>
            </button>
          </div>

          {/* Quick Sub-Links to Chat & Leaderboard */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-white/60">
            <span>Also explore:</span>
            <button
              type="button"
              onClick={onNavigateToDiscussion}
              className="text-cyan-300 hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comm-Net Chat (8 Channels)</span>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onNavigateToLeaderboard}
              className="text-amber-300 hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Favorite Planets Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
