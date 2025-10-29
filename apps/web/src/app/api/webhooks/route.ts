/**
 * HPOS-Compatible Webhooks API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookHandler } from '@/services/webhook-handler';

export async function POST(req: NextRequest) {
  return await webhookHandler.processWebhook(req);
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'HPOS Webhooks endpoint is active',
    timestamp: new Date().toISOString(),
    hpos_enabled: true,
  });
}