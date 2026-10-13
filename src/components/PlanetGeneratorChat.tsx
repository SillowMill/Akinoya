import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Globe2,
  Volume2,
  Compass,
  Trees,
  Layers,
  Camera,
  Edit3,
} from 'lucide-react';
import millAvatar from '../assets/images/mill_photo.jpg';
import { WizardAnswers, ChatMessage } from '../types/contest';
import { soundManager } from '../utils/audio';
import { formatAkinoyaPlanetName } from '../data/contest';

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
  icon: React.ElementType;
  field: keyof WizardAnswers;
  isFreeform?: boolean;
}

const WIZARD_STEPS: StepConfig[] = [
  {
    step: 1,
    title: 'Planet Designation (Äkinoya Convention)',
    category: 'DESIGNATION',
    prompt:
      'Under the Äkinoya Planetary Protocol, all designated frontier worlds must begin with the letter "Ä" (such as Ämlemie, Älkan-IV, Ämero, or Äkinoya Prime). What designation do you bestow upon this planetary sector? (If you enter a title without an "Ä", I will automatically align it with the protocol, e.g. Xyris → Äxyris):',
    placeholder: 'Enter planet designation (e.g. Ämlemie, Älkan-IV, Ämero, Äxyris)...',
    icon: Globe2,
    field: 'planetName',
  },
  {
    step: 2,
    title: 'Atmosphere & Biome Spectra',
    category: 'CLIMATE & SPECTRA',
    prompt:
      'Describe the atmosphere, sky gradient, and planetary biomes. What dominates the atmospheric horizon? (e.g., Ionized basalt dust with violet aurora storms and neon turquoise ring shadows, super-dense methane storm clouds, crystalline auroral bands):',
    placeholder: 'Describe atmospheric composition, sky color gradients, aurora phenomena, cloud horizons...',
    icon: Layers,
    field: 'atmosphere',
  },
  {
    step: 3,
    title: 'Flora & Botanical Life Systems',
    category: 'BOTANY',
    prompt:
      'What plant and fungal organisms thrive on the planetary surface? Describe the foliage, bio-structures, and glowing spores that explorers encounter upon landing. (e.g., Giant resonance spore mushrooms emitting glowing violet luminescence, subterranean root networks transmitting bio-signals, silicon-veined crystalline moss):',
    placeholder: 'Describe surface botany, glowing spore towers, alien canopies, bio-luminescence...',
    icon: Trees,
    field: 'flora',
  },
  {
    step: 4,
    title: 'Fauna & Wildlife Ecosystem',
    category: 'ECOLOGY',
    prompt:
      'What creatures and wildlife inhabit the ecosystems? How do they navigate or survive this environment? (e.g., Leviathan plasma-wings drifting in upper troposphere thermals, bioluminescent hexapod crawlers in cobalt valleys, silicon-shelled crystalline predators):',
    placeholder: 'Describe apex fauna, wildlife adaptations, predatory behaviors, aerial lifeforms...',
    icon: Compass,
    field: 'fauna',
  },
  {
    step: 5,
    title: 'Sonic Vibe & Audio Profile',
    category: 'AUDIO COLLAB',
    prompt:
      'For the official Sillow Mill music collaboration, what sonic profile and acoustic frequency characterize this world? What instruments, synthesizers, or rhythms resonate across this landscape? (e.g., Deep modular sub-bass 808s and cinematic ACEScc synthesizer pads, glitch ambient lo-fi with tape saturation, aggressive neurofunk drops):',
    placeholder: 'Describe the acoustic profile, synth textures, bassline aesthetic, musical genre...',
    icon: Volume2,
    field: 'sonicVibe',
  },
  {
    step: 6,
    title: 'Visual Rendering Aesthetic',
    category: 'CINEMATIC PIPELINE',
    prompt:
      'All planetary visualizers adhere to the official Sillow Mill 2D sci-fi anime aesthetic (anchored by Mood.png and akinoya_hero_bg.jpg). How should the cinematography, lighting, and camera perspectives frame your world? (e.g., 2D cel-shaded anime concept art with heavy film grain, cinematic cockpit canopy landing angle, neon turquoise and cosmic violet palette):',
    placeholder: 'Describe visual lighting, camera angles, anime cel-shading style, palette focus...',
    icon: Camera,
    field: 'visualAesthetic',
  },
  {
    step: 7,
    title: 'Iconic Planetary Landmark',
    category: 'MONUMENTS',
    prompt:
      'Every territory requires an iconic megastructure, natural anomaly, or monumental wonder visible from orbit. What monument anchors this territory? (e.g., The Obsidian Spire infinite energy conduit, a shattered celestial Dyson ring fragment hovering at the equator, the sunken cobalt caldera of Upper Äkinoya):',
    placeholder: 'Describe your iconic megastructure, alien monolith, or natural wonder...',
    icon: Sparkles,
    field: 'landmark',
  },
  {
    step: 8,
    title: 'Additional World Lore & Secrets',
    category: 'FREEFORM CREATIVITY',
    prompt:
      'Unrestricted Creative Freedom: Take the final minutes of your protocol to detail any secret lore, pilot logs, forgotten factions, derelict transmissions, or hidden anomalies. Let your imagination run wild!',
    placeholder: 'Detail secret factions, pilot backstories, hidden anomalies, forgotten tech...',
    icon: Edit3,
    field: 'additionalNotes',
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
          text: `⚠️ SUBMISSION LOCKED — 1 GOLDEN TICKET USED\n\nGreetings ${userDisplayName || 'Architect'}. Your single Golden Ticket planet entry for this account has already been synthesized and submitted to the 2027 Lore Governance Council.\n\nTo preserve API token limits, each account is permitted one golden ticket generation. You can inspect your active 5-photo planetary dossier directly on the launchpad.`,
          timestamp: 'Just now',
        },
      ]);
      return;
    }

    const greetingText = `Greetings ${userDisplayName || 'Architect'}. I am Mill, your AI worldbuilding companion for Planet Äkinoya.\n\nThis is an open-ended, guided worldbuilding protocol designed to take ~10 minutes of deep creative focus. There are no preset shortcut chips—you have full creative freedom to describe your sector of the Äkinoya galaxy.\n\nUpon completing all 8 questions, I will synthesize a full 5-photo 2D anime visual dossier (anchored strictly to Mood.png and akinoya_hero_bg.jpg), technical telemetry, and official lore for the June 30 Lore Governance vote.\n\nLet us begin with Step 01: ${WIZARD_STEPS[0].title}.`;

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
    let trimmed = answerText.trim();
    if (!trimmed) return;

    // Enforce Äkinoya 'Ä' convention if currently answering planetName
    let wasModifiedWithA = false;
    if (currentStep.field === 'planetName') {
      const formatted = formatAkinoyaPlanetName(trimmed);
      if (formatted !== trimmed) {
        wasModifiedWithA = true;
      }
      trimmed = formatted;
    }

    soundManager.playTone(740, 0.05);

    // Record user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now',
    };

    const nextAnswers = {
      ...answers,
      [currentStep.field]: trimmed,
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
        const ackSuffix = wasModifiedWithA
          ? ` (formatted under the Äkinoya 'Ä' protocol)`
          : '';
        const millNextMsg: ChatMessage = {
          id: `mill-${Date.now()}`,
          sender: 'mill',
          text: `Acknowledged: "${trimmed}"${ackSuffix}.\n\nStep 0${nextStepConfig.step} (${nextStepConfig.title}):\n${nextStepConfig.prompt}`,
          step: nextStepConfig.step,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, millNextMsg]);
      }, 400);
    } else {
      // Completed all 8 steps!
      setIsSynthesizing(true);
      soundManager.playUnlockChime();

      setTimeout(() => {
        const finalMsg: ChatMessage = {
          id: `mill-done-${Date.now()}`,
          sender: 'mill',
          text: `Territory protocol complete! All 8 planetary coordinates have been recorded. Initializing Google Gemini AI live synthesis for your 5-photo visual dossier and registered lore...`,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, finalMsg]);
        setIsSynthesizing(false);

        // Notify parent with full answers
        setTimeout(() => {
          onComplete(nextAnswers);
        }, 1200);
      }, 1800);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLocked) return;
    handleAnswer(inputVal);
  };

  const handleReset = () => {
    if (isLocked) return;
    soundManager.playTone(400, 0.06);
    setCurrentStepIndex(0);
    setAnswers({
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
        text: `Wizard reset. Let us begin anew (~10 mins guided workflow):\n\nStep 01 (${WIZARD_STEPS[0].title}):\n${WIZARD_STEPS[0].prompt}`,
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
                Open-Ended Worldbuilding Protocol (~10 Mins) · 1 Golden Ticket
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
              <span className="font-bold">STEP {Math.min(currentStepIndex + 1, 8)} OF 8:</span>
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
              <span>Mill is synthesizing 4K planetary renders &amp; orbital lore dossier with Gemini AI...</span>
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <footer className="p-3 sm:p-4 bg-[#070b16] border-t border-white/10 shrink-0 box-border">
          {isLocked ? (
            <div className="py-2.5 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2 bg-amber-950/40 rounded-xl border border-amber-500/30">
              <span>⚠️ Account Ticket Used · Inspect Your Active Dossier on Launchpad</span>
            </div>
          ) : currentStepIndex < WIZARD_STEPS.length ? (
            <form onSubmit={handleFormSubmit} className="space-y-2">
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
                    className="flex-1 min-h-[48px] bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 outline-none font-mono"
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
                <span className="text-cyan-400 font-semibold">~10-min guided worldbuilding protocol · Type freely</span>
                <span>Press Enter ↵ to submit</span>
              </div>
            </form>
          ) : (
            <div className="py-2 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Planetary Wizard Completed — Loading Dossier Preview...</span>
            </div>
          )}
        </footer>
      </motion.div>
    </div>
  );
};
