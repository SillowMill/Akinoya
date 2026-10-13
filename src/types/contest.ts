export interface PlanetSubmissionRenders {
  hero: string;
  atmosphere: string;
  ecosystem: string;
  landmark: string;
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
