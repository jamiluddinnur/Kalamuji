import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import {
  assertSessionEntitlement,
  EntitlementError,
  PRESET_SCENARIOS,
  requireAuthenticatedUser,
  type PresetScenarioKey,
} from '@/lib/entitlements';

const startSessionSchema = z.discriminatedUnion('scenarioType', [
  z.object({
    scenarioType: z.literal('preset'),
    scenarioKey: z.enum(['job_interview', 'handling_objection', 'pitch_presentation']),
    pressureLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    voicePersona: z.string().min(2).max(60).default('professional_calm'),
  }),
  z.object({
    scenarioType: z.literal('custom'),
    counterpartRole: z.string().min(3).max(120),
    situationGoal: z.string().min(5).max(300),
    pressureLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    voicePersona: z.string().min(2).max(60).default('professional_calm'),
  }),
]);

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const scenarioKey: PresetScenarioKey | null =
      data.scenarioType === 'preset' ? data.scenarioKey : null;

    assertSessionEntitlement(user, {
      scenarioType: data.scenarioType,
      scenarioKey,
    });

    const counterpartRole =
      data.scenarioType === 'preset'
        ? PRESET_SCENARIOS[data.scenarioKey].defaultCounterpartRole
        : data.counterpartRole.trim();

    const situationGoal =
      data.scenarioType === 'preset'
        ? PRESET_SCENARIOS[data.scenarioKey].defaultSituationGoal
        : data.situationGoal.trim();

    const inserted = await sql`
      INSERT INTO sessions (
        user_id,
        scenario_type,
        scenario_key,
        counterpart_role,
        situation_goal,
        pressure_level,
        voice_persona,
        status
      )
      VALUES (
        ${user.id},
        ${data.scenarioType},
        ${scenarioKey},
        ${counterpartRole},
        ${situationGoal},
        ${data.pressureLevel},
        ${data.voicePersona},
        'active'
      )
      RETURNING id, scenario_type, scenario_key, counterpart_role, situation_goal, pressure_level, voice_persona, created_at
    `;

    return NextResponse.json(
      {
        session: inserted[0],
        remainingSessions: user.remainingSessions,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error('[sessions/start] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal memulai sesi latihan.' },
      { status: 500 }
    );
  }
}
