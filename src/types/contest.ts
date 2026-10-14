export interface PlanetSubmissionRenders {
  hero: string; // 1. Main Orbital Planet Render (Äkinoya.jpg style)
  flora: string; // 2. Botanical Flora System (Mood.png panel style)
  fauna: string; // 3. Exotic Fauna & Wildlife System
  atmosphere: string; // 4. Cockpit / Ship Landing Atmosphere Detail
  landmark: string; // 5. Lore Dossier Cover / Iconic Landmark Detail
  ecosystem?: string; // backwards compatibility alias
}

export interface WizardAnswers {
  // 8 Human-Centric Questions
  relaxation?: string; // 1. Free time / relaxation activities
  creativeExpression?: string; // 2. Preferred art, music, or creative expressions
  naturalEnvironment?: string; // 3. Comforting natural environments / landscapes
  lifePhilosophy?: string; // 4. Personal life philosophy or guiding dream
  admiredCreature?: string; // 5. Admired animal or creature
  colorPalette?: string; // 6. Natural color preference
  resilienceStory?: string; // 7. Overcome challenge / resilience story
  futurePromise?: string; // 8. Future promise / message for the new world

  // Planetary attributes (derived or user-specified)
  planetName: string;
  atmosphere: string;
  flora: string;
  fauna: string;
  sonicVibe: string;
  visualAesthetic: string;
  landmark: string;
  additionalNotes: string;
}

export interface PlanetSubmission {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorEmail?: string;
  authorAvatarGradient?: string;
  planetName: string;
  atmosphere: string;
  flora: string;
  fauna: string;
  sonicVibe: string;
  visualAesthetic: string;
  landmark: string;
  additionalNotes: string;
  humanAnswers?: WizardAnswers;
  futurePromise?: string;
  generatedLore: string;
  renders: PlanetSubmissionRenders;
  votesCount: number;
  hasVoted?: boolean;
  status: 'SUBMITTED' | 'PUBLISHED' | 'FINALIST';
  createdAt: string;
  votingDeadline: string; // 'June 30, 2027'
}

export interface ChatMessage {
  id: string;
  sender: 'mill' | 'user';
  text: string;
  step?: number;
  timestamp: string;
  isStreaming?: boolean;
  options?: string[];
}
