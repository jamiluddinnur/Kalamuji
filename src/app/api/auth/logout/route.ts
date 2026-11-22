import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, USER_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(ADMIN_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('kalamuji_uid', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
