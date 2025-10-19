/**
 * Analytics API endpoint for collecting advanced analytics data
 * Free analytics implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { redisCache } from '@/lib/redis';

// Analytics data interface
interface AnalyticsEvent {
  event_type: string;
  properties: Record<string, any>;
  session_id: string;
  user_id?: string;
  timestamp: string;
}

interface AnalyticsRequest {
  events: AnalyticsEvent[];
  session_id: string;
  user_id?: string;
  timestamp: string;
}

// Analytics processing
export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequest = await request.json();
    
    // Validate request
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    // Process events
    await processAnalyticsEvents(body);

    // Log analytics collection
    logger.info('Analytics events collected', {
      sessionId: body.session_id,
      userId: body.user_id,
      eventsCount: body.events.length,
      eventTypes: body.events.map(e => e.event_type)
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Analytics API error', { error });
    return NextResponse.json(
      { error: 'Failed to process analytics' },
      { status: 500 }
    );
  }
}

// Process analytics events
async function processAnalyticsEvents(data: AnalyticsRequest) {
  const { events, session_id, user_id } = data;

  // Store events in Redis for real-time analytics
  await storeEventsInRedis(events, session_id, user_id);

  // Process real-time metrics
  await processRealTimeMetrics(events, session_id);

  // Store in database for historical analysis (if needed)
  await storeEventsInDatabase(events, session_id, user_id);
}

// Store events in Redis for real-time analytics
async function storeEventsInRedis(
  events: AnalyticsEvent[],
  sessionId: string,
  userId?: string
) {
  try {
    const redisKey = `analytics:session:${sessionId}`;
    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      events: events,
      timestamp: new Date().toISOString()
    };

    // Store session data
    await redisCache.set(redisKey, sessionData, 3600); // 1 hour TTL

    // Store individual events for real-time processing
    for (const event of events) {
      const eventKey = `analytics:event:${event.event_type}:${Date.now()}`;
      await redisCache.set(eventKey, event, 86400); // 24 hours TTL
    }

    // Update session metrics
    await updateSessionMetrics(sessionId, events);

  } catch (error) {
    logger.error('Failed to store events in Redis', { error });
  }
}

// Update session metrics
async function updateSessionMetrics(sessionId: string, events: AnalyticsEvent[]) {
  try {
    const metricsKey = `analytics:metrics:${sessionId}`;
    
    // Get existing metrics
    const existingMetrics = await redisCache.get(metricsKey) as any || {
      page_views: 0,
      events_count: 0,
      unique_events: new Set(),
      start_time: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };

    // Update metrics
    existingMetrics.events_count += events.length;
    existingMetrics.last_activity = new Date().toISOString();
    
    events.forEach(event => {
      if (event.event_type === 'page_view') {
        existingMetrics.page_views++;
      }
      existingMetrics.unique_events.add(event.event_type);
    });

    // Store updated metrics
    await redisCache.set(metricsKey, existingMetrics, 3600);

  } catch (error) {
    logger.error('Failed to update session metrics', { error });
  }
}

// Process real-time metrics
async function processRealTimeMetrics(events: AnalyticsEvent[], sessionId: string) {
  try {
    const metrics = {
      total_events: events.length,
      event_types: events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString()
    };

    // Store real-time metrics
    const realTimeKey = `analytics:realtime:${Date.now()}`;
    await redisCache.set(realTimeKey, metrics, 300); // 5 minutes TTL

    // Update global metrics
    await updateGlobalMetrics(metrics);

  } catch (error) {
    logger.error('Failed to process real-time metrics', { error });
  }
}

// Update global metrics
async function updateGlobalMetrics(metrics: any) {
  try {
    const globalKey = 'analytics:global:metrics';
    const globalMetrics = await redisCache.get(globalKey) as any || {
      total_sessions: 0,
      total_events: 0,
      event_types: {},
      last_updated: new Date().toISOString()
    };

    globalMetrics.total_events += metrics.total_events;
    globalMetrics.last_updated = new Date().toISOString();

    // Update event type counts
    Object.entries(metrics.event_types).forEach(([type, count]) => {
      globalMetrics.event_types[type] = (globalMetrics.event_types[type] || 0) + count;
    });

    await redisCache.set(globalKey, globalMetrics, 86400); // 24 hours TTL

  } catch (error) {
    logger.error('Failed to update global metrics', { error });
  }
}

// Store events in database (mock implementation)
async function storeEventsInDatabase(
  events: AnalyticsEvent[],
  sessionId: string,
  userId?: string
) {
  try {
    // In a real implementation, you would store this in a database
    // For now, we'll just log the events
    logger.info('Events stored in database', {
      sessionId,
      userId,
      eventsCount: events.length
    });

    // Example database storage:
    // await db.analyticsEvents.insertMany(events.map(event => ({
    //   ...event,
    //   session_id: sessionId,
    //   user_id: userId,
    //   created_at: new Date()
    // })));

  } catch (error) {
    logger.error('Failed to store events in database', { error });
  }
}

// Get analytics data endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'summary':
        return await getAnalyticsSummary();
      case 'realtime':
        return await getRealTimeMetrics();
      case 'sessions':
        return await getSessionData();
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Analytics GET error', { error });
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}

// Get analytics summary
async function getAnalyticsSummary() {
  try {
    const globalKey = 'analytics:global:metrics';
    const globalMetrics = await redisCache.get(globalKey) as any || {
      total_sessions: 0,
      total_events: 0,
      event_types: {},
      last_updated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: globalMetrics
    });

  } catch (error) {
    logger.error('Failed to get analytics summary', { error });
    return NextResponse.json(
      { error: 'Failed to get analytics summary' },
      { status: 500 }
    );
  }
}

// Get real-time metrics
async function getRealTimeMetrics() {
  try {
    // Get recent real-time metrics
    const realTimeKeys = await redisCache.get('analytics:realtime:*') as string[] || [];
    const metrics = [];

    for (const key of realTimeKeys) {
      const data = await redisCache.get(key);
      if (data) {
        metrics.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get real-time metrics', { error });
    return NextResponse.json(
      { error: 'Failed to get real-time metrics' },
      { status: 500 }
    );
  }
}

// Get session data
async function getSessionData() {
  try {
    // Get active sessions
    const sessionKeys = await redisCache.get('analytics:session:*') as string[] || [];
    const sessions = [];

    for (const key of sessionKeys) {
      const data = await redisCache.get(key);
      if (data) {
        sessions.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    logger.error('Failed to get session data', { error });
    return NextResponse.json(
      { error: 'Failed to get session data' },
      { status: 500 }
    );
  }
}