import type { PlanTier, UserRole } from './config';

export type ScenarioType = 'preset' | 'custom';
export type PressureLevel = 'low' | 'medium' | 'high';
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  planTier: PlanTier;
  trialScenario: string;
  remainingSessions: number;
  cycleStartedAt: string;
  cycleRenewsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptTurn {
  turnIndex: number;
  speaker: 'user' | 'ai';
  text: string;
  timestampMs: number;
}

export interface CoachingSession {
  id: string;
  userId: string;
  scenarioType: ScenarioType;
  scenarioKey: string | null;
  counterpartRole: string;
  situationGoal: string;
  pressureLevel: PressureLevel;
  voicePersona: string;
  status: SessionStatus;
  transcript: TranscriptTurn[];
  durationSeconds: number;
  createdAt: string;
  completedAt: string | null;
}

export interface SessionEvaluation {
  id: string;
  sessionId: string;
  userId: string;
  clarity: number;
  relevance: number;
  persuasion: number;
  toneComposure: number;
  overallScore: number;
  strongestPoint: string;
  priorityImprovement: string;
  betterPhrasingExample: string;
  recurringWeaknessTag: string | null;
  createdAt: string;
}
