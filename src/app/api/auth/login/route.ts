import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSignedUserToken, USER_COOKIE_NAME } from '@/lib/admin-auth';
import { PLAN_CONFIG } from '@/lib/config';
import { sql } from '@/lib/db';

const userLoginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  fullName: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = userLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Masukkan alamat email yang valid.' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const fullName = parsed.data.fullName?.trim() || null;

    // Upsert user: new users automatically get 5 free trial sessions on 1 initial scenario
    const rows = await sql`
      INSERT INTO users (
        email,
        full_name,
        role,
        plan_tier,
        trial_scenario,
        remaining_sessions,
        monthly_quota
      )
      VALUES (
        ${email},
        ${fullName},
        'user',
        'free_trial',
        ${PLAN_CONFIG.free_trial.defaultTrialScenario},
        ${PLAN_CONFIG.free_trial.sessionQuota},
        ${PLAN_CONFIG.free_trial.sessionQuota}
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        updated_at = NOW()
      RETURNING id, email, full_name, role, plan_tier, remaining_sessions
    `;

    const user = rows[0];
    const userId = String(user.id);
    const token = createSignedUserToken(userId);
    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email: String(user.email),
        fullName: user.full_name ? String(user.full_name) : null,
        planTier: String(user.plan_tier),
        remainingSessions: Number(user.remaining_sessions),
      },
    });

    res.cookies.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error('[auth/login] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal masuk. Periksa koneksi lalu coba lagi.' },
      { status: 500 }
    );
  }
}
