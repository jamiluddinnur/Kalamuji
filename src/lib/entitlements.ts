import 'server-only';
import { cookies } from 'next/headers';
import { sql } from './db';
import { PLAN_CONFIG, type PlanTier, type UserRole } from './config';

export const PRESET_SCENARIOS = {
  job_interview: {
    key: 'job_interview',
    label: 'Wawancara Kerja',
    defaultCounterpartRole: 'Hiring Manager / User Interviewer',
    defaultSituationGoal: 'Menjawab pertanyaan kompetensi dan pengalaman kerja secara terstruktur.',
  },
  handling_objection: {
    key: 'handling_objection',
    label: 'Menangani Keberatan Klien',
    defaultCounterpartRole: 'Klien Korporat yang Kritis',
    defaultSituationGoal: 'Meredam keberatan harga atau timeline tanpa bersikap defensif.',
  },
  pitch_presentation: {
    key: 'pitch_presentation',
    label: 'Presentasi & Pitching',
    defaultCounterpartRole: 'Direktur / Decision Maker',
    defaultSituationGoal: 'Menyampaikan nilai bisnis dan rekomendasi secara ringkas dan meyakinkan.',
  },
} as const;

export type PresetScenarioKey = keyof typeof PRESET_SCENARIOS;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  planTier: PlanTier;
  trialScenario: string;
  remainingSessions: number;
  monthlyQuota: number;
  cycleRenewsAt: string | null;
}

export class EntitlementError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'QUOTA_EXHAUSTED'
      | 'TRIAL_SCENARIO_LOCKED'
      | 'PRO_REQUIRED_CUSTOM_SCENARIO'
      | 'SUBSCRIPTION_EXPIRED',
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'EntitlementError';
  }
}

export async function requireAuthenticatedUser(req?: Request): Promise<AuthenticatedUser> {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('kalamuji_uid')?.value ??
    req?.headers.get('x-kalamuji-user-id') ??
    null;

  if (!userId) {
    throw new EntitlementError('UNAUTHORIZED', 401, 'Silakan masuk terlebih dahulu.');
  }

  const rows = await sql`
    SELECT
      id,
      email,
      role,
      plan_tier,
      trial_scenario,
      remaining_sessions,
      monthly_quota,
      cycle_renews_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new EntitlementError('UNAUTHORIZED', 401, 'Sesi pengguna tidak valid.');
  }

  const row = rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as UserRole,
    planTier: row.plan_tier as PlanTier,
    trialScenario: row.trial_scenario as string,
    remainingSessions: Number(row.remaining_sessions),
    monthlyQuota: Number(row.monthly_quota),
    cycleRenewsAt: row.cycle_renews_at ? String(row.cycle_renews_at) : null,
  };
}

export interface ScenarioAccessInput {
  scenarioType: 'preset' | 'custom';
  scenarioKey?: PresetScenarioKey | null;
}

export function assertSessionEntitlement(
  user: AuthenticatedUser,
  input: ScenarioAccessInput
): void {
  if (user.planTier === 'pro' && user.cycleRenewsAt) {
    const renewsAtMs = new Date(user.cycleRenewsAt).getTime();
    if (Number.isFinite(renewsAtMs) && Date.now() > renewsAtMs) {
      throw new EntitlementError(
        'SUBSCRIPTION_EXPIRED',
        403,
        'Siklus langganan Pro Anda telah berakhir. Silakan perpanjang untuk melanjutkan.'
      );
    }
  }

  if (user.remainingSessions <= 0) {
    const msg =
      user.planTier === 'free_trial'
        ? `Kuota ${PLAN_CONFIG.free_trial.sessionQuota} sesi uji coba gratis Anda telah habis. Upgrade ke Kalamuji Pro (Rp79.000/bulan) untuk 15 sesi/bulan.`
        : `Kuota ${PLAN_CONFIG.pro.sessionQuota} sesi bulan ini telah habis. Kuota akan diperbarui pada siklus berikutnya.`;
    throw new EntitlementError('QUOTA_EXHAUSTED', 403, msg);
  }

  if (user.planTier === 'free_trial') {
    if (input.scenarioType === 'custom') {
      throw new EntitlementError(
        'PRO_REQUIRED_CUSTOM_SCENARIO',
        403,
        'Skenario kustom hanya tersedia untuk pelanggan Kalamuji Pro.'
      );
    }

    if (input.scenarioKey !== user.trialScenario) {
      throw new EntitlementError(
        'TRIAL_SCENARIO_LOCKED',
        403,
        `Akun uji coba gratis hanya dapat mengakses skenario "${user.trialScenario}". Upgrade ke Pro untuk membuka semua skenario.`
      );
    }
  }
}
