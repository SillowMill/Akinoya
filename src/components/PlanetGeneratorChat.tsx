import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  CheckCircle2,
  Globe2,
  Layers,
  Camera,
  Heart,
  Lightbulb,
  Copy,
  Check,
  Beaker,
  Lock,
} from 'lucide-react';
import millAvatar from '../assets/images/mill_photo.jpg';
import { WizardAnswers, ChatMessage } from '../types/contest';
import { soundManager } from '../utils/audio';
import { formatAkinoyaPlanetName, derivePlanetAttributesFromHumanAnswers } from '../data/contest';
import { getStoredSectorClaim } from '../utils/pioneer';

interface PlanetGeneratorChatProps {
  userDisplayName: string;
  isLocked?: boolean;
  isSandboxMode?: boolean;
  onToggleSandbox?: (enabled: boolean) => void;
  onComplete: (answers: WizardAnswers) => void;
  onClose: () => void;
}

interface StepConfig {
  step: number;
  title: string;
  category: string;
  prompt: string;
  placeholder: string;
  helperExample: string;
  icon: React.ElementType;
  field: keyof WizardAnswers;
  isFreeform?: boolean;
}

/**
 * Streamlined 5-Question Personality-Based Planet Generator for Mill
 * Designed around light, fun, and deep human questions to synthesize unique worlds.
 */
export const WIZARD_STEPS: StepConfig[] = [
  {
    step: 1,
    title: 'Inner Landscape & Topography',
    category: 'INNER LANDSCAPE',
    prompt:
      'If your inner world was a landscape, do you lean more towards a stormy, energetic neon city, a quiet misty star-desert, or a deep, mysterious bioluminescent jungle?',
    placeholder: 'e.g. A quiet, misty star-desert with serene crystals and a calm, philosophical vibe...',
    helperExample: 'A quiet, misty star-desert with serene crystals and a calm, philosophical vibe.',
    icon: Layers,
    field: 'naturalEnvironment',
  },
  {
    step: 2,
    title: 'Natural Force & Elemental Drive',
    category: 'ELEMENTAL DRIVE',
    prompt:
      'Which natural force or element matches your drive or hobbies best? (e.g., flowing plasma, freezing oceans, floating cosmic rocks, or ancient forests).',
    placeholder: 'e.g. Floating cosmic rocks with rings of gas and shooting stars...',
    helperExample: 'Floating cosmic rocks with rings of gas and shooting stars.',
    icon: Sparkles,
    field: 'creativeExpression',
  },
  {
    step: 3,
    title: 'Creative Palette & Spectra',
    category: 'COLOR PALETTE',
    prompt:
      'What color palette reflects your personality best when you are at your most creative? (e.g., deep steel-blue and gold, neon purple and emerald green, or warm copper and moonlight silver).',
    placeholder: 'e.g. Deep steel-blue with glowing gold energy lines and copper accents...',
    helperExample: 'Deep steel-blue with glowing gold energy lines and copper accents.',
    icon: Camera,
    field: 'colorPalette',
  },
  {
    step: 4,
    title: 'World Presence & Wildlife',
    category: 'PRESENCE & LIFE',
    prompt:
      'Would your world be a lonely, contemplative place for solo explorers, or burst with life, mysterious creatures, and flora?',
    placeholder: 'e.g. A contemplative place for lone explorers featuring giant monuments of light...',
    helperExample: 'A contemplative place for lone explorers featuring giant monuments of light.',
    icon: Heart,
    field: 'admiredCreature',
  },
  {
    step: 5,
    title: 'Life Motto & Planetary Creed',
    category: 'PLANETARY MOTTO',
    prompt:
      'If you could capture your life motto or vibe in one short sentence for this planet, what would it be? (e.g., \'Peace in the chaos\' or \'Always chasing the horizon\').',
    placeholder: 'e.g. Always chasing the horizon in the silence of the cosmos...',
    helperExample: 'Always chasing the horizon in the silence of the cosmos.',
    icon: Globe2,
    field: 'futurePromise',
    isFreeform: true,
  },
];

export const PlanetGeneratorChat: React.FC<PlanetGeneratorChatProps> = ({
  userDisplayName,
  isLocked,
  isSandboxMode,
  onToggleSandbox,
  onComplete,
  onClose,
}) => {
  const initialClaim = getStoredSectorClaim();
  const designatedPlanetName = formatAkinoyaPlanetName(initialClaim?.sectorName || '', false) || 'Äkinoya Frontier Sector';

  const [internalSandbox, setInternalSandbox] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('akinoya_mill_sandbox_mode');
    return stored !== null ? stored === 'true' : true;
  });

  const isEffectiveSandbox = isSandboxMode !== undefined ? isSandboxMode : internalSandbox;

  const handleToggleSandbox = () => {
    const nextVal = !isEffectiveSandbox;
    if (onToggleSandbox) {
      onToggleSandbox(nextVal);
    } else {
      setInternalSandbox(nextVal);
      if (typeof window !== 'undefined') {
        localStorage.setItem('akinoya_mill_sandbox_mode', String(nextVal));
      }
    }
    soundManager.playTone(nextVal ? 720 : 540, 0.05);
  };

  const isEffectiveLocked = Boolean(isLocked && !isEffectiveSandbox);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<WizardAnswers>(() => {
    const claim = getStoredSectorClaim();
    const pName = formatAkinoyaPlanetName(claim?.sectorName || '', false) || 'Äkinoya Frontier Sector';
    return {
      relaxation: '',
      creativeExpression: '',
      naturalEnvironment: '',
      lifePhilosophy: '',
      admiredCreature: '',
      colorPalette: '',
      resilienceStory: '',
      futurePromise: '',
      planetName: pName,
      atmosphere: '',
      flora: '',
      fauna: '',
      sonicVibe: '',
      visualAesthetic: '',
      landmark: '',
      additionalNotes: '',
      biome: claim?.biome || 'Bioluminescent Canopy',
      sectorName: pName,
    };
  });

  const [inputVal, setInputVal] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isMillTyping, setIsMillTyping] = useState<boolean>(false);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Initialize Mill's opening transmission with realistic human typing animation
  useEffect(() => {
    soundManager.playTone(660, 0.08);

    if (isEffectiveLocked) {
      setMessages([
        {
          id: 'msg-locked',
          sender: 'mill',
          text: `⚠️ SUBMISSION LOCKED — 1 OF 1 TICKET USED\n\nGreetings ${userDisplayName || 'Architect'}. Your single Golden Ticket planet entry for this account has already been synthesized and permanently registered to the Lore Governance Council.\n\nTo preserve API token limits and maintain true digital scarcity, each account is strictly restricted to one planetary generation. You can inspect your active 5-photo planetary dossier directly on your dashboard.\n\n💡 Tip: Toggle "SANDBOX MODE" in the top bar to test the 5-question flow freely without consuming tickets!`,
          timestamp: 'Just now',
        },
      ]);
      return;
    }

    const claim = getStoredSectorClaim();
    const pName = formatAkinoyaPlanetName(claim?.sectorName || designatedPlanetName, false);

    // Initial human touch typing effect
    setIsMillTyping(true);
    const greetingTimer = setTimeout(() => {
      setIsMillTyping(false);
      soundManager.playTone(720, 0.06);

      const greetingText = `Greetings ${userDisplayName || 'Architect'}. I am Mill, your AI worldbuilding companion for Planet Äkinoya.\n\nYour world designation "${pName}" (${claim?.biome || 'Bioluminescent Canopy'}) is locked into telemetry. We will explore 5 light, fun, and deep personality questions to synthesize your custom 5-photo 4K dossier, 9:16 viral trailer, and registered lore.\n\nQuestion 01 of 05 (${WIZARD_STEPS[0].title}):\n${WIZARD_STEPS[0].prompt}`;

      setMessages([
        {
          id: 'msg-greeting',
          sender: 'mill',
          text: greetingText,
          step: 1,
          exampleToCopy: WIZARD_STEPS[0].helperExample,
          timestamp: 'Just now',
        },
      ]);
    }, 1100);

    return () => clearTimeout(greetingTimer);
  }, [userDisplayName, isLocked]);

  // Auto-scroll chat to bottom on new messages, typing events, or synthesis
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isMillTyping, isSynthesizing]);

  // Copy helper example into input field and system clipboard with feedback
  const handleCopyAndAdoptExample = (exampleText: string) => {
    if (!exampleText) return;
    soundManager.playTone(660, 0.04);
    setInputVal(exampleText);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(exampleText).catch(() => {});
    }
    setCopiedExample(exampleText);
    setTimeout(() => {
      setCopiedExample(null);
    }, 2200);
  };

  // Handle advancing step with an answer, realistic human touch typing indicator
  const handleAnswer = (answerText: string) => {
    const trimmed = answerText.trim();
    if (!trimmed || isMillTyping) return;

    soundManager.playTone(740, 0.05);

    // 1. Record user message immediately
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now',
    };

    const nextAnswers: WizardAnswers = {
      ...answers,
      [currentStep.field]: trimmed,
    };
    setAnswers(nextAnswers);
    setInputVal('');
    setMessages((prev) => [...prev, userMsg]);

    const nextStepIdx = currentStepIndex + 1;

    // 2. Start realistic typing indicator
    setIsMillTyping(true);

    if (nextStepIdx < WIZARD_STEPS.length) {
      setCurrentStepIndex(nextStepIdx);
      const nextStepConfig = WIZARD_STEPS[nextStepIdx];

      setTimeout(() => {
        setIsMillTyping(false);
        soundManager.playTone(820, 0.06);

        const millNextMsg: ChatMessage = {
          id: `mill-${Date.now()}`,
          sender: 'mill',
          text: `Recorded. Thank you.\n\nQuestion 0${nextStepConfig.step} of 05 (${nextStepConfig.title}):\n${nextStepConfig.prompt}`,
          step: nextStepConfig.step,
          exampleToCopy: nextStepConfig.helperExample,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, millNextMsg]);
      }, 1300);
    } else {
      // Completed all 5 personality-driven questions!
      const claim = getStoredSectorClaim();
      const completeAnswers = derivePlanetAttributesFromHumanAnswers({
        ...nextAnswers,
        biome: nextAnswers.biome || claim?.biome || '',
        sectorName: nextAnswers.sectorName || claim?.sectorName || designatedPlanetName,
      });
      setAnswers(completeAnswers);

      setTimeout(() => {
        setIsMillTyping(false);
        setIsSynthesizing(true);
        soundManager.playUnlockChime();

        const finalMsg: ChatMessage = {
          id: `mill-done-${Date.now()}`,
          sender: 'mill',
          text: `Territory protocol complete! All 5 personality dimensions recorded.\n\nDesignated World: ${completeAnswers.planetName}\n\nConnecting to Najno Banajna 8K Photorealistic AI and Val.ai 24fps FPV pipeline to synthesize your 5-photo 4K dossier and registered lore...`,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, finalMsg]);

        // Hand off to parent synthesis engine
        setTimeout(() => {
          onComplete(completeAnswers);
        }, 1300);
      }, 1400);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLocked || isMillTyping) return;
    handleAnswer(inputVal);
  };

  const handleReset = () => {
    if (isLocked) return;
    soundManager.playTone(400, 0.06);
    const claim = getStoredSectorClaim();
    const pName = formatAkinoyaPlanetName(claim?.sectorName || designatedPlanetName, false);

    setCurrentStepIndex(0);
    setAnswers({
      relaxation: '',
      creativeExpression: '',
      naturalEnvironment: '',
      lifePhilosophy: '',
      admiredCreature: '',
      colorPalette: '',
      resilienceStory: '',
      futurePromise: '',
      planetName: pName,
      atmosphere: '',
      flora: '',
      fauna: '',
      sonicVibe: '',
      visualAesthetic: '',
      landmark: '',
      additionalNotes: '',
      biome: claim?.biome || 'Bioluminescent Canopy',
      sectorName: pName,
    });
    setInputVal('');
    setIsMillTyping(true);

    setTimeout(() => {
      setIsMillTyping(false);
      setMessages([
        {
          id: `reset-${Date.now()}`,
          sender: 'mill',
          text: `Protocol recalibrated for "${pName}". Let us begin anew with the 5 personality questions:\n\nQuestion 01 of 05 (${WIZARD_STEPS[0].title}):\n${WIZARD_STEPS[0].prompt}`,
          step: 1,
          exampleToCopy: WIZARD_STEPS[0].helperExample,
          timestamp: 'Just now',
        },
      ]);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-black/85 backdrop-blur-xl p-0 md:p-4 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.25 }}
        className="w-full md:max-w-3xl h-[100dvh] md:h-[90vh] md:max-h-[820px] bg-[#050811] border-0 md:border border-cyan-500/30 rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden box-border"
      >
        {/* Chatbot Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#070b16] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-display font-bold text-white tracking-wide truncate">
                  Mill · Planetary AI Guide
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/40 shrink-0">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] font-mono text-white/50 truncate">
                5 Personality Questions (~3 Mins) · 1 Golden Ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sandbox Mode Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSandbox}
              className={`px-2.5 py-1 rounded-lg font-mono text-[10px] sm:text-[10.5px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isEffectiveSandbox
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-white/5 text-white/60 border-white/15 hover:text-white'
              }`}
              title="Toggle Sandbox Mode (Risk-Free UI & Generation Testing without API/DB writes)"
            >
              <Beaker className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">SANDBOX:</span>
              <span>{isEffectiveSandbox ? 'ON' : 'OFF'}</span>
            </button>

            {!isEffectiveLocked && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset Questionnaire"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Sandbox Active Ribbon */}
        {isEffectiveSandbox && (
          <div className="px-4 sm:px-6 py-1.5 bg-gradient-to-r from-emerald-950/80 via-[#061719] to-cyan-950/70 border-b border-emerald-400/40 flex items-center justify-between text-[10.5px] font-mono text-emerald-300 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold">SANDBOX PREVIEW MODE:</span>
              <span className="text-white/80 hidden sm:inline">Zero DB writes · Placeholder assets · Risk-free testing</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-400/15 border border-emerald-400/40 text-[9px] font-extrabold uppercase tracking-wider text-emerald-200">
              ISOLATED TEST RUN
            </span>
          </div>
        )}

        {/* Wizard Progress Ribbon (5 Steps) */}
        {!isEffectiveLocked && (
          <div className="px-4 sm:px-6 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between gap-2 text-xs font-mono shrink-0">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="font-bold">QUESTION {Math.min(currentStepIndex + 1, 5)} OF 5:</span>
              <span className="text-white/80 truncate max-w-[200px] sm:max-w-none">
                {currentStep ? currentStep.title : 'Synthesizing World'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {WIZARD_STEPS.map((s, idx) => (
                <span
                  key={s.step}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx < currentStepIndex
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                      : idx === currentStepIndex
                      ? 'bg-amber-400 animate-pulse scale-110 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Message Feed Area */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 box-border scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'mill' && (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400/60 shrink-0 shadow-sm mt-0.5">
                  <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm font-sans whitespace-pre-line leading-relaxed shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                    : 'bg-[#0b1020] border border-cyan-500/20 text-white/90 rounded-tl-none'
                }`}
              >
                <div>{msg.text}</div>

                {/* Interactive Copyable Example Card inside Mill's question bubbles */}
                {msg.exampleToCopy && (
                  <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-black/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-white/80 italic font-sans leading-relaxed text-[11px] sm:text-xs">
                        &ldquo;{msg.exampleToCopy}&rdquo;
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCopyAndAdoptExample(msg.exampleToCopy!)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-[10px] sm:text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Copy example to clipboard and fill answer input"
                      >
                        {copiedExample === msg.exampleToCopy ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">COPIED &amp; LOADED!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-cyan-300" />
                            <span>COPY EXAMPLE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Realistic Human Touch Typing Animation */}
          {isMillTyping && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400/60 shrink-0 shadow-sm mt-0.5">
                <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
              </div>

              <div className="bg-[#0b1020] border border-cyan-500/30 rounded-2xl rounded-tl-none p-3.5 px-4.5 shadow-md flex items-center gap-2">
                <span className="text-[11px] font-mono text-cyan-300 font-semibold tracking-wide">
                  Mill is typing
                </span>
                <span className="flex items-center gap-1.5 pl-1">
                  <span
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDuration: '900ms', animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDuration: '900ms', animationDelay: '200ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDuration: '900ms', animationDelay: '400ms' }}
                  />
                </span>
              </div>
            </div>
          )}

          {/* Synthesis Loader */}
          {isSynthesizing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-950/40 border border-cyan-400/30 text-cyan-300 text-xs font-mono animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span>Mill is aligning your 5 personality answers with Najno Banajna 8K AI &amp; Val.ai to synthesize your 5-photo dossier...</span>
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <footer className="p-3 sm:p-4 bg-[#070b16] border-t border-white/10 shrink-0 box-border space-y-2">
          {isEffectiveLocked ? (
            <div className="py-2.5 px-3 text-center text-xs font-mono text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-2 bg-amber-950/40 rounded-xl border border-amber-500/30">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>One-Shot Ticket Locked</span>
              </span>
              <button
                type="button"
                onClick={handleToggleSandbox}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 font-bold text-[11px] cursor-pointer flex items-center gap-1"
              >
                <Beaker className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch to Sandbox Test Mode →</span>
              </button>
            </div>
          ) : currentStepIndex < WIZARD_STEPS.length ? (
            <form onSubmit={handleFormSubmit} className="space-y-2">
              {/* Helper Example Adopt Banner */}
              <div className="flex items-center justify-between text-[11px] font-mono text-white/60 px-1">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspiration Example Available</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyAndAdoptExample(currentStep.helperExample)}
                  className="px-2.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer text-[10.5px] font-mono flex items-center gap-1"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>{copiedExample === currentStep.helperExample ? 'Copied & Loaded!' : 'Adopt Helper Example'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentStep.isFreeform ? (
                  <textarea
                    rows={2}
                    value={inputVal}
                    disabled={isMillTyping}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="flex-1 bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-sans resize-none min-h-[48px] disabled:opacity-50"
                  />
                ) : (
                  <input
                    type="text"
                    value={inputVal}
                    disabled={isMillTyping}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="flex-1 min-h-[48px] bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-sans disabled:opacity-50"
                  />
                )}

                <button
                  type="submit"
                  disabled={!inputVal.trim() || isMillTyping}
                  className="min-h-[48px] px-4 sm:px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                >
                  <span>Submit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10.5px] font-mono text-white/50 px-1">
                <span className="text-cyan-400 font-semibold">5 questions · Deep personality synthesis</span>
                <span>Press Enter ↵ to submit</span>
              </div>
            </form>
          ) : (
            <div className="py-2 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>5-Question Protocol Completed — Initializing Sci-Fi Synthesizer...</span>
            </div>
          )}
        </footer>
      </motion.div>
    </div>
  );
};
