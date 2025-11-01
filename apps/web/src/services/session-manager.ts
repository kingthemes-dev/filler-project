/**
 * HPOS-Compatible Session Management Service
 * Enhanced session handling with automatic cleanup
 */

import { Redis } from 'ioredis';
import { hposCache } from '@/lib/hpos-cache';

interface SessionData {
  sessionId: string;
  userId?: string;
  cartId?: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    currency: string;
    notifications: boolean;
  };
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
  deviceInfo: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
  location?: {
    country: string;
    city: string;
    timezone: string;
  };
  // HPOS-specific fields
  hposEnabled: boolean;
  orderAttempts: number;
  lastOrderAttempt?: Date;
  sessionFlags: {
    isEmpty: boolean;
    needsCleanup: boolean;
    autoCleanupEnabled: boolean;
  };
}


class SessionManager {
  private redis: Redis | null = null;
  private sessionExpiry = 30 * 24 * 60 * 60; // 30 days in seconds
  private cleanupInterval: NodeJS.Timeout | null = null;
  private emptySessionThreshold = 2 * 60 * 60; // 2 hours for empty sessions
  private autoCleanupEnabled = true;

  constructor() {
    this.initializeRedis();
    this.startAutoCleanup();
  }

  private initializeRedis(): void {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
        });
        console.log('✅ Session Manager: Redis connected');
      } else {
        console.warn('⚠️ Session Manager: Redis not configured, using memory storage');
      }
    } catch (error) {
      console.error('❌ Session Manager: Redis connection failed', error);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): SessionData['deviceInfo'] {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'Server',
        platform: 'Server',
        isMobile: false,
      };
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    return {
      userAgent,
      platform,
      isMobile,
    };
  }

  /**
   * Start automatic cleanup of empty sessions
   */
  private startAutoCleanup(): void {
    if (!this.autoCleanupEnabled) return;

    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupEmptySessions();
    }, 60 * 60 * 1000);

    console.log('✅ Session auto-cleanup started');
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Session auto-cleanup stopped');
    }
  }

  /**
   * Clean up empty sessions
   */
  private async cleanupEmptySessions(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      if (this.redis) {
        // Get all session keys
        const sessionKeys = await this.redis.keys('session:*');
        
        for (const key of sessionKeys) {
          try {
            const sessionData = await this.redis.get(key);
            if (sessionData) {
              const session: SessionData = JSON.parse(sessionData);
              
              // Check if session is empty and old enough
              if (this.shouldCleanupSession(session, now)) {
                await this.redis.del(key);
                cleanedCount++;
                
                // Also clean from HPOS cache
                await hposCache.invalidateByTag(`session:${session.sessionId}`);
              }
            }
          } catch (error) {
            console.warn('⚠️ Error processing session for cleanup:', error);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} empty sessions`);
      }
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
    }
  }

  /**
   * Check if session should be cleaned up
   */
  private shouldCleanupSession(session: SessionData, now: number): boolean {
    const timeSinceLastActivity = now - new Date(session.lastActivity).getTime();
    const isEmpty = session.sessionFlags.isEmpty;
    const needsCleanup = session.sessionFlags.needsCleanup;
    
    // Clean up if:
    // 1. Session is marked as empty and old enough
    // 2. Session is marked for cleanup
    // 3. Session has been inactive for too long and is empty
    return (
      (isEmpty && timeSinceLastActivity > this.emptySessionThreshold * 1000) ||
      needsCleanup ||
      (isEmpty && timeSinceLastActivity > this.sessionExpiry * 1000)
    );
  }

  /**
   * Create new session
   */
  async createSession(userId?: string): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionExpiry * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId,
      cartId: `cart_${sessionId}`,
      preferences: {
        theme: 'light',
        language: 'pl',
        currency: 'PLN',
        notifications: true,
      },
      lastActivity: now,
      createdAt: now,
      expiresAt,
      deviceInfo: this.getDeviceInfo(),
      // HPOS-specific fields
      hposEnabled: true,
      orderAttempts: 0,
      sessionFlags: {
        isEmpty: true,
        needsCleanup: false,
        autoCleanupEnabled: this.autoCleanupEnabled,
      },
    };

    // Store session in Redis and HPOS cache
    if (this.redis) {
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionExpiry,
        JSON.stringify(sessionData)
      );
    } else {
      // Fallback to localStorage
      localStorage.setItem(`session:${sessionId}`, JSON.stringify(sessionData));
    }

    // Also store in HPOS cache
    await hposCache.set('sessions', sessionId, sessionData, undefined, [`session:${sessionId}`]);

    console.log(`✅ Session created: ${sessionId}`);
    return sessionData;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      let sessionData: string | null = null;

      if (this.redis) {
        sessionData = await this.redis.get(`session:${sessionId}`);
      } else {
        sessionData = localStorage.getItem(`session:${sessionId}`);
      }

      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as SessionData;
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      await this.updateSession(session);

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionData: SessionData): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(
          `session:${sessionData.sessionId}`,
          this.sessionExpiry,
          JSON.stringify(sessionData)
        );
      } else {
        localStorage.setItem(`session:${sessionData.sessionId}`, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(`session:${sessionId}`);
        await this.redis.del(`cart:${sessionId}`);
      } else {
        localStorage.removeItem(`session:${sessionId}`);
        localStorage.removeItem(`cart:${sessionId}`);
      }
      console.log(`🗑️ Session deleted: ${sessionId}`);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  /**
   * Get or create session
   */
  async getOrCreateSession(sessionId?: string, userId?: string): Promise<SessionData> {
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        return existingSession;
      }
    }

    return await this.createSession(userId);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(sessionId: string, preferences: Partial<SessionData['preferences']>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.preferences = { ...session.preferences, ...preferences };
    await this.updateSession(session);
  }

  /**
   * Link session to user
   */
  async linkToUser(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.userId = userId;
    await this.updateSession(session);
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    if (!this.redis) {
      // Fallback: return empty array
      return [];
    }

    try {
      const keys = await this.redis.keys(`session:*`);
      const sessions: SessionData[] = [];

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`session:*`);
      let cleaned = 0;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          if (new Date() > new Date(session.expiresAt)) {
            await this.redis.del(key);
            await this.redis.del(`cart:${session.sessionId}`);
            cleaned++;
          }
        }
      }

      console.log(`🧹 Cleaned ${cleaned} expired sessions`);
      return cleaned;
    } catch (error) {
      console.error('Failed to clean expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    if (!this.redis) {
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }

    try {
      const keys = await this.redis.keys(`session:*`);
      let totalSessions = keys.length;
      let activeSessions = 0;
      let expiredSessions = 0;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          if (new Date() > new Date(session.expiresAt)) {
            expiredSessions++;
          } else {
            activeSessions++;
          }
        }
      }

      return { totalSessions, activeSessions, expiredSessions };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }
  }
}

const sessionManager = new SessionManager();
export default sessionManager;
