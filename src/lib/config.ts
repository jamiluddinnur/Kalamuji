import 'server-only';

export type PlanTier = 'free_trial' | 'pro';
export type UserRole = 'user' | 'admin';

export const PLAN_CONFIG = {
  free_trial: {
    label: 'Free Trial',
    monthlyPriceIdr: 0,
    sessionQuota: 5,
    allowAllPresets: false,
    allowCustomScenarios: false,
    allowCrossSessionMemory: false,
    defaultTrialScenario: 'job_interview',
  },
  pro: {
    label: 'Kalamuji Pro',
    monthlyPriceIdr: 79_000,
    sessionQuota: 15,
    allowAllPresets: true,
    allowCustomScenarios: true,
    allowCrossSessionMemory: true,
    defaultTrialScenario: 'job_interview',
  },
} as const;

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.trim() === '') {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value.trim();
}

export const serverConfig = {
  database: {
    get url(): string {
      return requireEnv('DATABASE_URL');
    },
  },
  gemini: {
    get apiKey(): string {
      return requireEnv('GEMINI_API_KEY');
    },
    get voiceModel(): string {
      return requireEnv('GEMINI_VOICE_MODEL', 'gemini-2.5-flash');
    },
    get evaluatorModel(): string {
      return requireEnv('GEMINI_EVALUATOR_MODEL', 'gemini-2.5-flash');
    },
  },
} as const;
