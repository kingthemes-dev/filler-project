/**
 * HPOS-Compatible Webhooks API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { webhookHandler } from '@/services/webhook-handler';

export async function POST(req: NextRequest) {
  return await webhookHandler.processWebhook(req);
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'HPOS Webhooks endpoint is active',
    timestamp: new Date().toISOString(),
    hpos_enabled: true,
  });
}