/**
 * HPOS-Compatible Webhooks API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { webhookHandler } from '@/services/webhook-handler';
import { addSecurityHeaders } from '@/utils/api-security';

export async function POST(req: NextRequest) {
  return await webhookHandler.processWebhook(req);
}

export async function GET(): Promise<NextResponse> {
  const response = NextResponse.json({
    message: 'HPOS Webhooks endpoint is active',
    timestamp: new Date().toISOString(),
    hpos_enabled: true,
  });
  return addSecurityHeaders(response);
}
