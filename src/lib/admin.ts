import 'server-only';
import { getVerifiedAdminUserId } from './admin-auth';
import { sql } from './db';
import {
  EntitlementError,
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from './entitlements';

/**
 * Strict server-side admin guard.
 * Validates signed HttpOnly admin cookie OR authenticated session AND role === 'admin' against Neon
 * before querying or returning any developer/admin data.
 */
export async function requireAdminUser(req?: Request): Promise<AuthenticatedUser> {
  const signedAdminId = await getVerifiedAdminUserId();
  if (signedAdminId) {
    const rows = await sql`
      SELECT
        id,
        email,
        full_name,
        role,
        plan_tier,
        trial_scenario,
        remaining_sessions,
        monthly_quota,
        cycle_renews_at
      FROM users
      WHERE id = ${signedAdminId}
        AND role = 'admin'
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0];
      return {
        id: String(row.id),
        email: String(row.email),
        fullName: row.full_name ? String(row.full_name) : null,
        role: 'admin',
        planTier: row.plan_tier as AuthenticatedUser['planTier'],
        trialScenario: String(row.trial_scenario),
        remainingSessions: Number(row.remaining_sessions),
        monthlyQuota: Number(row.monthly_quota),
        cycleRenewsAt: row.cycle_renews_at ? String(row.cycle_renews_at) : null,
      };
    }
  }

  const user = await requireAuthenticatedUser(req);
  if (user.role !== 'admin') {
    throw new EntitlementError(
      'FORBIDDEN',
      403,
      'Akses ditolak. Halaman ini khusus untuk administrator Kalamuji.'
    );
  }
  return user;
}

export interface AdminDashboardMetrics {
  users: {
    total: number;
    freeTrial: number;
    pro: number;
  };
  quotaUsage: {
    trialAllocatedTotal: number;
    trialUsedTotal: number;
    trialRemainingTotal: number;
    proAllocatedTotal: number;
    proUsedTotal: number;
    proRemainingTotal: number;
  };
  scenarios: {
    totalSessions: number;
    completedSessions: number;
    presetCount: number;
    customCount: number;
    byPresetKey: Array<{ scenarioKey: string; count: number }>;
  };
  averageScores: {
    evaluationsCount: number;
    clarity: number;
    relevance: number;
    persuasion: number;
    toneComposure: number;
    overallScore: number;
  };
  feedback: {
    summary: {
      total: number;
      positive: number;
      neutral: number;
      negative: number;
    };
    recent: Array<{
      id: string;
      userEmail: string;
      sessionId: string | null;
      sentiment: 'positive' | 'neutral' | 'negative';
      quickTag: string | null;
      note: string | null;
      createdAt: string;
    }>;
  };
}

export async function getAdminDashboardMetrics(req?: Request): Promise<AdminDashboardMetrics> {
  await requireAdminUser(req);

  const [
    userStatsRows,
    scenarioStatsRows,
    presetBreakdownRows,
    scoreAvgRows,
    feedbackSummaryRows,
    recentFeedbackRows,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE plan_tier = 'free_trial')::int AS free_trial_users,
        COUNT(*) FILTER (WHERE plan_tier = 'pro')::int AS pro_users,
        COALESCE(SUM(5) FILTER (WHERE plan_tier = 'free_trial'), 0)::int AS trial_allocated,
        COALESCE(SUM(GREATEST(0, 5 - remaining_sessions)) FILTER (WHERE plan_tier = 'free_trial'), 0)::int AS trial_used,
        COALESCE(SUM(remaining_sessions) FILTER (WHERE plan_tier = 'free_trial'), 0)::int AS trial_remaining,
        COALESCE(SUM(monthly_quota) FILTER (WHERE plan_tier = 'pro'), 0)::int AS pro_allocated,
        COALESCE(SUM(GREATEST(0, monthly_quota - remaining_sessions)) FILTER (WHERE plan_tier = 'pro'), 0)::int AS pro_used,
        COALESCE(SUM(remaining_sessions) FILTER (WHERE plan_tier = 'pro'), 0)::int AS pro_remaining
      FROM users
    `,
    sql`
      SELECT
        COUNT(*)::int AS total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_sessions,
        COUNT(*) FILTER (WHERE scenario_type = 'preset')::int AS preset_count,
        COUNT(*) FILTER (WHERE scenario_type = 'custom')::int AS custom_count
      FROM sessions
    `,
    sql`
      SELECT
        COALESCE(scenario_key, 'unknown') AS scenario_key,
        COUNT(*)::int AS count
      FROM sessions
      WHERE scenario_type = 'preset'
      GROUP BY scenario_key
      ORDER BY count DESC
    `,
    sql`
      SELECT
        COUNT(*)::int AS evaluations_count,
        COALESCE(ROUND(AVG(clarity), 1), 0)::float AS avg_clarity,
        COALESCE(ROUND(AVG(relevance), 1), 0)::float AS avg_relevance,
        COALESCE(ROUND(AVG(persuasion), 1), 0)::float AS avg_persuasion,
        COALESCE(ROUND(AVG(tone_composure), 1), 0)::float AS avg_tone_composure,
        COALESCE(ROUND(AVG(overall_score), 1), 0)::float AS avg_overall_score
      FROM evaluations
    `,
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sentiment = 'positive')::int AS positive,
        COUNT(*) FILTER (WHERE sentiment = 'neutral')::int AS neutral,
        COUNT(*) FILTER (WHERE sentiment = 'negative')::int AS negative
      FROM user_feedback
    `,
    sql`
      SELECT
        f.id,
        u.email AS user_email,
        f.session_id,
        f.sentiment,
        f.quick_tag,
        f.note,
        f.created_at
      FROM user_feedback f
      INNER JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 25
    `,
  ]);

  const u = userStatsRows[0];
  const s = scenarioStatsRows[0];
  const a = scoreAvgRows[0];
  const fs = feedbackSummaryRows[0];

  return {
    users: {
      total: Number(u?.total_users ?? 0),
      freeTrial: Number(u?.free_trial_users ?? 0),
      pro: Number(u?.pro_users ?? 0),
    },
    quotaUsage: {
      trialAllocatedTotal: Number(u?.trial_allocated ?? 0),
      trialUsedTotal: Number(u?.trial_used ?? 0),
      trialRemainingTotal: Number(u?.trial_remaining ?? 0),
      proAllocatedTotal: Number(u?.pro_allocated ?? 0),
      proUsedTotal: Number(u?.pro_used ?? 0),
      proRemainingTotal: Number(u?.pro_remaining ?? 0),
    },
    scenarios: {
      totalSessions: Number(s?.total_sessions ?? 0),
      completedSessions: Number(s?.completed_sessions ?? 0),
      presetCount: Number(s?.preset_count ?? 0),
      customCount: Number(s?.custom_count ?? 0),
      byPresetKey: presetBreakdownRows.map((row) => ({
        scenarioKey: String(row.scenario_key),
        count: Number(row.count),
      })),
    },
    averageScores: {
      evaluationsCount: Number(a?.evaluations_count ?? 0),
      clarity: Number(a?.avg_clarity ?? 0),
      relevance: Number(a?.avg_relevance ?? 0),
      persuasion: Number(a?.avg_persuasion ?? 0),
      toneComposure: Number(a?.avg_tone_composure ?? 0),
      overallScore: Number(a?.avg_overall_score ?? 0),
    },
    feedback: {
      summary: {
        total: Number(fs?.total ?? 0),
        positive: Number(fs?.positive ?? 0),
        neutral: Number(fs?.neutral ?? 0),
        negative: Number(fs?.negative ?? 0),
      },
      recent: recentFeedbackRows.map((row) => ({
        id: String(row.id),
        userEmail: String(row.user_email),
        sessionId: row.session_id ? String(row.session_id) : null,
        sentiment: row.sentiment as 'positive' | 'neutral' | 'negative',
        quickTag: row.quick_tag ? String(row.quick_tag) : null,
        note: row.note ? String(row.note) : null,
        createdAt: String(row.created_at),
      })),
    },
  };
}
