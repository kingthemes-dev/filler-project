/**
 * HPOS Order Limit Handler
 * Handles order attempt limits and retry logic
 */

import { logger } from '@/utils/logger';
import { hposCache } from '@/lib/hpos-cache';

interface OrderAttempt {
  customerId: number;
  sessionId: string;
  timestamp: number;
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

interface OrderLimitConfig {
  maxAttemptsPerHour: number;
  maxAttemptsPerDay: number;
  blockDurationMinutes: number;
  warningThreshold: number;
}

class OrderLimitHandler {
  private config: OrderLimitConfig;
  private attempts: Map<string, OrderAttempt> = new Map();

  constructor() {
    this.config = {
      maxAttemptsPerHour: 10,
      maxAttemptsPerDay: 50,
      blockDurationMinutes: 30,
      warningThreshold: 5,
    };

    // Clean up old attempts every hour
    setInterval(() => {
      this.cleanupOldAttempts();
    }, 3600000);
  }

  private generateKey(customerId: number, sessionId: string): string {
    return `order_attempt:${customerId}:${sessionId}`;
  }

  private cleanupOldAttempts(): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    for (const [key, attempt] of this.attempts.entries()) {
      if (attempt.timestamp < oneDayAgo) {
        this.attempts.delete(key);
      }
    }

    logger.info('OrderLimitHandler: Cleaned up old attempts', { 
      remainingAttempts: this.attempts.size 
    });
  }

  private getAttemptsInTimeframe(customerId: number, timeframeMs: number): number {
    const now = Date.now();
    const cutoff = now - timeframeMs;

    let count = 0;
    for (const attempt of this.attempts.values()) {
      if (attempt.customerId === customerId && attempt.lastAttempt > cutoff) {
        count += attempt.attempts;
      }
    }

    return count;
  }

  async checkOrderLimit(customerId: number, sessionId: string): Promise<{
    allowed: boolean;
    reason?: string;
    attemptsRemaining?: number;
    blockedUntil?: number;
  }> {
    const key = this.generateKey(customerId, sessionId);
    const now = Date.now();

    // Check if currently blocked
    const attempt = this.attempts.get(key);
    if (attempt?.blockedUntil && now < attempt.blockedUntil) {
      return {
        allowed: false,
        reason: 'Order attempts temporarily blocked due to excessive requests',
        blockedUntil: attempt.blockedUntil,
      };
    }

    // Check hourly limit
    const hourlyAttempts = this.getAttemptsInTimeframe(customerId, 60 * 60 * 1000);
    if (hourlyAttempts >= this.config.maxAttemptsPerHour) {
      // Block for the configured duration
      const blockedUntil = now + (this.config.blockDurationMinutes * 60 * 1000);
      
      if (attempt) {
        attempt.blockedUntil = blockedUntil;
      } else {
        this.attempts.set(key, {
          customerId,
          sessionId,
          timestamp: now,
          attempts: 0,
          lastAttempt: now,
          blockedUntil,
        });
      }

      logger.warn('OrderLimitHandler: Hourly limit exceeded', {
        customerId,
        hourlyAttempts,
        blockedUntil,
      });

      return {
        allowed: false,
        reason: 'Hourly order attempt limit exceeded',
        blockedUntil,
      };
    }

    // Check daily limit
    const dailyAttempts = this.getAttemptsInTimeframe(customerId, 24 * 60 * 60 * 1000);
    if (dailyAttempts >= this.config.maxAttemptsPerDay) {
      logger.warn('OrderLimitHandler: Daily limit exceeded', {
        customerId,
        dailyAttempts,
      });

      return {
        allowed: false,
        reason: 'Daily order attempt limit exceeded',
      };
    }

    // Check warning threshold
    const attemptsRemaining = this.config.maxAttemptsPerHour - hourlyAttempts;
    if (hourlyAttempts >= this.config.warningThreshold) {
      logger.warn('OrderLimitHandler: Approaching hourly limit', {
        customerId,
        hourlyAttempts,
        attemptsRemaining,
      });
    }

    return {
      allowed: true,
      attemptsRemaining,
    };
  }

  async recordOrderAttempt(customerId: number, sessionId: string, success: boolean): Promise<void> {
    const key = this.generateKey(customerId, sessionId);
    const now = Date.now();

    const attempt = this.attempts.get(key) || {
      customerId,
      sessionId,
      timestamp: now,
      attempts: 0,
      lastAttempt: now,
    };

    attempt.attempts++;
    attempt.lastAttempt = now;

    this.attempts.set(key, attempt);

    // Cache the attempt for persistence
    await hposCache.set('sessions', `order_attempt_${key}`, attempt, undefined, ['order_attempts']);

    logger.info('OrderLimitHandler: Recorded order attempt', {
      customerId,
      sessionId,
      success,
      totalAttempts: attempt.attempts,
      hourlyAttempts: this.getAttemptsInTimeframe(customerId, 60 * 60 * 1000),
    });
  }

  async resetCustomerAttempts(customerId: number): Promise<void> {
    let resetCount = 0;

    for (const [key, attempt] of this.attempts.entries()) {
      if (attempt.customerId === customerId) {
        this.attempts.delete(key);
        resetCount++;
      }
    }

    // Also clear from cache
    await hposCache.invalidateByTag('order_attempts');

    logger.info('OrderLimitHandler: Reset customer attempts', {
      customerId,
      resetCount,
    });
  }

  async getCustomerStats(customerId: number): Promise<{
    hourlyAttempts: number;
    dailyAttempts: number;
    isBlocked: boolean;
    blockedUntil?: number;
  }> {
    const hourlyAttempts = this.getAttemptsInTimeframe(customerId, 60 * 60 * 1000);
    const dailyAttempts = this.getAttemptsInTimeframe(customerId, 24 * 60 * 60 * 1000);
    
    let isBlocked = false;
    let blockedUntil: number | undefined;

    for (const attempt of this.attempts.values()) {
      if (attempt.customerId === customerId && attempt.blockedUntil) {
        const now = Date.now();
        if (now < attempt.blockedUntil) {
          isBlocked = true;
          blockedUntil = attempt.blockedUntil;
          break;
        }
      }
    }

    return {
      hourlyAttempts,
      dailyAttempts,
      isBlocked,
      blockedUntil,
    };
  }

  updateConfig(newConfig: Partial<OrderLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('OrderLimitHandler: Configuration updated', { config: this.config });
  }

  getConfig(): OrderLimitConfig {
    return { ...this.config };
  }

  getStats(): {
    totalAttempts: number;
    uniqueCustomers: number;
    blockedCustomers: number;
  } {
    const uniqueCustomers = new Set();
    let blockedCustomers = 0;
    const now = Date.now();

    for (const attempt of this.attempts.values()) {
      uniqueCustomers.add(attempt.customerId);
      if (attempt.blockedUntil && now < attempt.blockedUntil) {
        blockedCustomers++;
      }
    }

    return {
      totalAttempts: this.attempts.size,
      uniqueCustomers: uniqueCustomers.size,
      blockedCustomers,
    };
  }
}

// Export singleton instance
export const orderLimitHandler = new OrderLimitHandler();
export type { OrderLimitConfig, OrderAttempt };
