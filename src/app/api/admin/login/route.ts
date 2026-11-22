import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_COOKIE_NAME,
  createSignedAdminToken,
  createSignedUserToken,
  USER_COOKIE_NAME,
  verifyEnvAdminCredentials,
} from '@/lib/admin-auth';
import { sql } from '@/lib/db';

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Email dan kata sandi admin wajib diisi.' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    if (!verifyEnvAdminCredentials(email, password)) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Email atau kata sandi admin tidak sesuai.' },
        { status: 401 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const rows = await sql`
      INSERT INTO users (email, full_name, role, plan_tier, remaining_sessions, monthly_quota)
      VALUES (${normalizedEmail}, 'Admin Kalamuji', 'admin', 'pro', 15, 15)
      ON CONFLICT (email) DO UPDATE SET role = 'admin', updated_at = NOW()
      RETURNING id, email, role
    `;

    const adminId = String(rows[0].id);
    const adminToken = createSignedAdminToken(adminId);
    const userToken = createSignedUserToken(adminId);
    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ ok: true, email: normalizedEmail });
    res.cookies.set(ADMIN_COOKIE_NAME, adminToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    res.cookies.set(USER_COOKIE_NAME, userToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error('[admin/login] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal memproses login admin.' },
      { status: 500 }
    );
  }
}
