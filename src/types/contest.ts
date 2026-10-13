export interface PlanetSubmissionRenders {
  hero: string; // 1. Main Orbital Planet Render (akinoya_hero_bg.jpg style)
  flora: string; // 2. Botanical Flora System (Mood.png panel style)
  fauna: string; // 3. Exotic Fauna & Wildlife System
  atmosphere: string; // 4. Cockpit / Ship Landing Atmosphere Detail
  landmark: string; // 5. Iconic Landmark / Secret Location Detail
  ecosystem?: string; // backwards compatibility alias
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
  generatedLore: string;
  renders: PlanetSubmissionRenders;
  votesCount: number;
  hasVoted?: boolean;
  status: 'SUBMITTED' | 'PUBLISHED' | 'FINALIST';
  createdAt: string;
  votingDeadline: string; // 'June 30, 2027'
}

export interface WizardAnswers {
  planetName: string;
  atmosphere: string;
  flora: string;
  fauna: string;
  sonicVibe: string;
  visualAesthetic: string;
  landmark: string;
  additionalNotes: string;
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
