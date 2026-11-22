import { NextResponse } from 'next/server';
import { getAdminDashboardMetrics } from '@/lib/admin';
import { EntitlementError } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const metrics = await getAdminDashboardMetrics(req);
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error('[admin/metrics] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal memuat metrik admin.' },
      { status: 500 }
    );
  }
}
