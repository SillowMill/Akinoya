import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  CheckCircle2,
  Globe2,
  Volume2,
  Compass,
  Trees,
  Layers,
  Camera,
  Heart,
  Shield,
  Lightbulb,
} from 'lucide-react';
import millAvatar from '../assets/images/mill_photo.jpg';
import { WizardAnswers, ChatMessage } from '../types/contest';
import { soundManager } from '../utils/audio';
import { formatAkinoyaPlanetName, generateOrganicPlanetName, derivePlanetAttributesFromHumanAnswers } from '../data/contest';

interface PlanetGeneratorChatProps {
  userDisplayName: string;
  isLocked?: boolean;
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

export const WIZARD_STEPS: StepConfig[] = [
  {
    step: 1,
    title: 'Planeet Naam & Aanduiding',
    category: 'PLANET NAME',
    prompt:
      'Hoe wil jij je planeet noemen? (What do you want to name your planet?)\nGive your new world an evocative, organic name (e.g. Arbitron, Lucina, Elysia, Valerion). Machine codes, serial numbers, hyphens, and numbers are strictly prohibited.',
    placeholder: 'e.g., Arbitron, Lucina, Elysia, Valerion, Aethelgard...',
    helperExample: 'Arbitron',
    icon: Globe2,
    field: 'planetName',
  },
  {
    step: 2,
    title: 'Free Time & Inner Relaxation',
    category: 'RELAXATION & CALM',
    prompt:
      'How do you spend your free time or find true relaxation? What peaceful rituals recharge your spirit?\n(Your answer shapes the tranquility, atmospheric rhythm, and sanctuary biomes of your world.)',
    placeholder: 'e.g., Long walks in the forest, listening to vinyl by candlelight, sketching at midnight...',
    helperExample: 'Long walks in the forest, listening to vinyl by candlelight, sketching at midnight.',
    icon: Trees,
    field: 'relaxation',
  },
  {
    step: 3,
    title: 'Creative, Visual & Musical Expression',
    category: 'ART & SONIC VIBE',
    prompt:
      'What forms of art, music, or creative expressions resonate most deeply with you?\n(This defines the acoustic frequency, synthesizers, and artistic architecture of your sector.)',
    placeholder: 'e.g., Cyberpunk aesthetics, cinematic space epics, deep analog synth soundtracks, ambient soundscapes...',
    helperExample: 'Cyberpunk aesthetics, cinematic space epics, deep analog synth soundtracks, ambient soundscapes.',
    icon: Volume2,
    field: 'creativeExpression',
  },
  {
    step: 4,
    title: 'Comforting Natural Environments & Horizons',
    category: 'NATURAL ENVIRONMENT',
    prompt:
      'What natural landscape or environment brings you the deepest sense of peace, awe, or belonging?\n(This shapes your planetary surface topography, flora systems, and horizon canopy.)',
    placeholder: 'e.g., A misty mountain ridge at sunrise, a bioluminescent rainforest, a secluded ocean cove under starlight...',
    helperExample: 'A misty mountain ridge at sunrise, a bioluminescent rainforest, a secluded ocean cove under starlight.',
    icon: Layers,
    field: 'naturalEnvironment',
  },
  {
    step: 5,
    title: 'Admired Animal & Celestial Wildlife',
    category: 'ADMIRED CREATURE',
    prompt:
      'What animal or creature do you admire most in nature or myth, and what quality draws you to them?\n(This breathes life into the apex fauna and celestial wildlife inhabiting your world.)',
    placeholder: 'e.g., A wolf for its pack loyalty, an eagle for boundless freedom, a manta ray for effortless grace...',
    helperExample: 'A wolf for its pack loyalty, an eagle for boundless freedom, a manta ray for effortless grace.',
    icon: Heart,
    field: 'admiredCreature',
  },
  {
    step: 6,
    title: 'Natural Color Preference & Celestial Spectra',
    category: 'COLOR PALETTE',
    prompt:
      'What natural colors and tonal palette resonate with you?\n(These exact tones will render your planetary disc, orbital rings, and atmospheric auroras.)',
    placeholder: 'e.g., Deep indigo blue combined with neon purple and warm copper accents...',
    helperExample: 'Deep indigo blue combined with neon purple and warm copper accents.',
    icon: Camera,
    field: 'colorPalette',
  },
  {
    step: 7,
    title: 'Resilience & Overcome Challenge',
    category: 'RESILIENCE & MONUMENT',
    prompt:
      'Share a brief story of a challenge you overcame, or a moment that shaped your resilience.\n(This will be forged into an iconic planetary monument or ancient megastructure on your horizon.)',
    placeholder: 'e.g., Building a creative project entirely from scratch despite doubt, navigating through the unknown...',
    helperExample: 'Building a creative project entirely from scratch despite doubt, persevering through the unknown.',
    icon: Sparkles,
    field: 'resilienceStory',
    isFreeform: true,
  },
  {
    step: 8,
    title: 'Future Promise & Planetary Creed',
    category: 'PLANETARY PROMISE',
    prompt:
      'What is your future promise, guiding philosophy, or message for the new world?\n(This founding creed will be permanently inscribed upon your Lore Dossier Cover and archival documents.)',
    placeholder: 'e.g., Never forget that true beauty lies in curiosity and persistence...',
    helperExample: 'Never forget that true beauty lies in curiosity and persistence.',
    icon: Globe2,
    field: 'futurePromise',
    isFreeform: true,
  },
];

export const PlanetGeneratorChat: React.FC<PlanetGeneratorChatProps> = ({
  userDisplayName,
  isLocked,
  onComplete,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<WizardAnswers>({
    relaxation: '',
    creativeExpression: '',
    naturalEnvironment: '',
    lifePhilosophy: '',
    admiredCreature: '',
    colorPalette: '',
    resilienceStory: '',
    futurePromise: '',
    planetName: '',
    atmosphere: '',
    flora: '',
    fauna: '',
    sonicVibe: '',
    visualAesthetic: '',
    landmark: '',
    additionalNotes: '',
  });

  const [inputVal, setInputVal] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Initialize Mill's opening transmission
  useEffect(() => {
    soundManager.playTone(660, 0.08);

    if (isLocked) {
      setMessages([
        {
          id: 'msg-locked',
          sender: 'mill',
          text: `⚠️ SUBMISSION LOCKED — 1 OF 1 TICKET USED\n\nGreetings ${userDisplayName || 'Architect'}. Your single Golden Ticket planet entry for this account has already been synthesized and permanently registered to the Lore Governance Council.\n\nTo preserve API token limits and maintain true digital scarcity, each account is strictly restricted to one planetary generation. You can inspect your active 5-photo planetary dossier directly on your dashboard.`,
          timestamp: 'Just now',
        },
      ]);
      return;
    }

    const greetingText = `Greetings ${userDisplayName || 'Architect'}. I am Mill, your AI worldbuilding companion for Planet Äkinoya.\n\nThis is an open-ended, human-centric worldbuilding protocol designed to take ~10 minutes of genuine creative exploration. There are no rigid presets—I will ask you 8 thoughtful questions about your life, passions, aesthetics, and vision.\n\nUpon completion, your answers will synthesize a custom 5-photo high-resolution cinematic sci-fi dossier (anchored to Mood.png and Äkinoya.jpg), technical telemetry, and official lore for the June 30 Lore Governance Council.\n\nLet us begin with Question 01: ${WIZARD_STEPS[0].title}.`;

    const firstQuestionText = WIZARD_STEPS[0].prompt;

    setMessages([
      {
        id: 'msg-greeting',
        sender: 'mill',
        text: greetingText,
        timestamp: 'Just now',
      },
      {
        id: 'msg-q1',
        sender: 'mill',
        text: firstQuestionText,
        step: 1,
        timestamp: 'Just now',
      },
    ]);
  }, [userDisplayName, isLocked]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSynthesizing]);

  // Handle advancing step with an answer
  const handleAnswer = (answerText: string) => {
    const trimmed = answerText.trim();
    if (!trimmed) return;

    soundManager.playTone(740, 0.05);

    const processedText =
      currentStep.field === 'planetName' ? formatAkinoyaPlanetName(trimmed) : trimmed;

    // Record user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: processedText,
      timestamp: 'Just now',
    };

    const nextAnswers: WizardAnswers = {
      ...answers,
      [currentStep.field]: processedText,
    };
    setAnswers(nextAnswers);
    setInputVal('');

    setMessages((prev) => [...prev, userMsg]);

    const nextStepIdx = currentStepIndex + 1;

    if (nextStepIdx < WIZARD_STEPS.length) {
      setCurrentStepIndex(nextStepIdx);
      const nextStepConfig = WIZARD_STEPS[nextStepIdx];

      setTimeout(() => {
        soundManager.playTone(820, 0.06);
        const millNextMsg: ChatMessage = {
          id: `mill-${Date.now()}`,
          sender: 'mill',
          text: `Recorded. Thank you.\n\nQuestion 0${nextStepConfig.step} of 08 (${nextStepConfig.title}):\n${nextStepConfig.prompt}`,
          step: nextStepConfig.step,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, millNextMsg]);
      }, 400);
    } else {
      // Completed all 8 human-centric steps!
      setIsSynthesizing(true);
      soundManager.playUnlockChime();

      // Derive planetary attributes & Äkinoya designation
      const completeAnswers = derivePlanetAttributesFromHumanAnswers({
        ...nextAnswers,
        lifePhilosophy:
          nextAnswers.lifePhilosophy ||
          nextAnswers.futurePromise ||
          'Harmony between technology, creativity, and nature',
      });
      setAnswers(completeAnswers);

      setTimeout(() => {
        const finalMsg: ChatMessage = {
          id: `mill-done-${Date.now()}`,
          sender: 'mill',
          text: `Territory protocol complete! All 8 human-centric coordinates recorded.\n\nDesignated World: ${completeAnswers.planetName}\n\nInitializing Google Gemini AI live synthesis for your 5-photo high-resolution cinematic sci-fi dossier and registered lore...`,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, finalMsg]);
        setIsSynthesizing(false);

        // Notify parent with full answers
        setTimeout(() => {
          onComplete(completeAnswers);
        }, 1200);
      }, 1500);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLocked) return;
    handleAnswer(inputVal);
  };

  const handleAdoptExample = () => {
    if (!currentStep) return;
    soundManager.playTone(600, 0.04);
    if (currentStep.field === 'planetName') {
      setInputVal(generateOrganicPlanetName());
    } else {
      setInputVal(currentStep.helperExample);
    }
  };

  const handleReset = () => {
    if (isLocked) return;
    soundManager.playTone(400, 0.06);
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
      planetName: '',
      atmosphere: '',
      flora: '',
      fauna: '',
      sonicVibe: '',
      visualAesthetic: '',
      landmark: '',
      additionalNotes: '',
    });
    setInputVal('');
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'mill',
        text: `Wizard reset. Let us begin anew (~10 mins guided workflow):\n\nQuestion 01 of 08 (${WIZARD_STEPS[0].title}):\n${WIZARD_STEPS[0].prompt}`,
        step: 1,
        timestamp: 'Just now',
      },
    ]);
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
                8 Human-Centric Questions (~10 Mins) · 1 Golden Ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isLocked && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset Wizard"
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

        {/* Wizard Progress Ribbon */}
        {!isLocked && (
          <div className="px-4 sm:px-6 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between gap-2 text-xs font-mono shrink-0">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="font-bold">QUESTION {Math.min(currentStepIndex + 1, 8)} OF 8:</span>
              <span className="text-white/80 truncate max-w-[200px] sm:max-w-none">
                {currentStep ? currentStep.title : 'Generating Dossier'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {WIZARD_STEPS.map((s, idx) => (
                <span
                  key={s.step}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx < currentStepIndex
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                      : idx === currentStepIndex
                      ? 'bg-amber-400 animate-pulse'
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
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm font-sans whitespace-pre-line leading-relaxed shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                    : 'bg-[#0b1020] border border-cyan-500/20 text-white/90 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Synthesis Loader */}
          {isSynthesizing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-950/40 border border-cyan-400/30 text-cyan-300 text-xs font-mono animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span>Mill is aligning your 8 answers with Google Gemini AI to synthesize a 5-photo dossier...</span>
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <footer className="p-3 sm:p-4 bg-[#070b16] border-t border-white/10 shrink-0 box-border space-y-2">
          {isLocked ? (
            <div className="py-2.5 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2 bg-amber-950/40 rounded-xl border border-amber-500/30">
              <span>⚠️ One-Shot Account Limit Reached · Inspect Your Active Dossier on Launchpad</span>
            </div>
          ) : currentStepIndex < WIZARD_STEPS.length ? (
            <form onSubmit={handleFormSubmit} className="space-y-2">
              {/* Helper Example Adopt Banner */}
              <div className="flex items-center justify-between text-[11px] font-mono text-white/60 px-1">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspiring Example Available</span>
                </span>
                <button
                  type="button"
                  onClick={handleAdoptExample}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer text-[10.5px]"
                >
                  Adopt Helper Example
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentStep.isFreeform ? (
                  <textarea
                    rows={2}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="flex-1 bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-sans resize-none min-h-[48px]"
                  />
                ) : (
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="flex-1 min-h-[48px] bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-sans"
                  />
                )}

                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="min-h-[48px] px-4 sm:px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                >
                  <span>Submit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10.5px] font-mono text-white/50 px-1">
                <span className="text-cyan-400 font-semibold">~10-min guided workflow · Take your time</span>
                <span>Press Enter ↵ to submit</span>
              </div>
            </form>
          ) : (
            <div className="py-2 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Planetary Wizard Completed — Initializing Sci-Fi Synthesizer...</span>
            </div>
          )}
        </footer>
      </motion.div>
    </div>
  );
};
