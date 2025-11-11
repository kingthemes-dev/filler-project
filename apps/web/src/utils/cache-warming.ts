/**
 * Cache warming utility for pre-populating cache
 */

import { redisCache, cacheKeys, cacheTTL } from '@/lib/redis';
import { logger } from '@/utils/logger';

interface CacheWarmingConfig {
  products: boolean;
  categories: boolean;
  homeFeed: boolean;
  search: boolean;
}

class CacheWarmer {
  private isRunning = false;
  private lastRun: Date | null = null;

  /**
   * Warm cache with essential data
   */
  async warmCache(config: CacheWarmingConfig = {
    products: true,
    categories: true,
    homeFeed: true,
    search: false,
  }): Promise<void> {
    if (this.isRunning) {
      logger.warn('Cache warming already in progress');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      logger.info('Starting cache warming...');

      const promises: Promise<void>[] = [];

      if (config.categories) {
        promises.push(this.warmCategories());
      }

      if (config.products) {
        promises.push(this.warmProducts());
      }

      if (config.homeFeed) {
        promises.push(this.warmHomeFeed());
      }

      if (config.search) {
        promises.push(this.warmSearchQueries());
      }

      await Promise.allSettled(promises);

      logger.info('Cache warming completed successfully');
    } catch (error) {
      logger.error('Cache warming failed:', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Warm categories cache
   */
  private async warmCategories(): Promise<void> {
    try {
      const categoriesUrl = '/api/woocommerce?endpoint=products/categories';
      const response = await fetch(`${process.env.WP_BASE_URL}${categoriesUrl}`);
      
      if (response.ok) {
        const categories = await response.json();
        await redisCache.set(
          cacheKeys.categories(),
          categories,
          cacheTTL.categories
        );
        logger.info(`Warmed categories cache: ${categories.length} categories`);
      }
    } catch (error) {
      logger.error('Failed to warm categories cache:', { error });
    }
  }

  /**
   * Warm products cache
   */
  private async warmProducts(): Promise<void> {
    try {
      // Warm first few pages of products
      const pages = [1, 2, 3];
      const perPage = 20;

      for (const page of pages) {
        const productsUrl = `/api/woocommerce?endpoint=shop&per_page=${perPage}&page=${page}`;
        const response = await fetch(`${process.env.WP_BASE_URL}${productsUrl}`);
        
        if (response.ok) {
          const products = await response.json();
          await redisCache.set(
            cacheKeys.products(page, perPage),
            products,
            cacheTTL.products
          );
          logger.info(`Warmed products cache: page ${page}, ${products.products?.length || 0} products`);
        }
      }
    } catch (error) {
      logger.error('Failed to warm products cache:', { error });
    }
  }

  /**
   * Warm home feed cache
   */
  private async warmHomeFeed(): Promise<void> {
    try {
      const homeFeedUrl = '/api/home-feed';
      const response = await fetch(`${process.env.WP_BASE_URL}${homeFeedUrl}`);
      
      if (response.ok) {
        const homeFeed = await response.json();
        await redisCache.set(
          cacheKeys.homeFeed(),
          homeFeed,
          cacheTTL.homeFeed
        );
        logger.info('Warmed home feed cache');
      }
    } catch (error) {
      logger.error('Failed to warm home feed cache:', { error });
    }
  }

  /**
   * Warm search queries cache
   */
  private async warmSearchQueries(): Promise<void> {
    try {
      const popularQueries = [
        'krem',
        'serum',
        'tonik',
        'maseczka',
        'oczyszczanie',
        'nawilżanie',
        'anty-aging',
        'witamina c',
      ];

      for (const query of popularQueries) {
        const searchUrl = `/api/woocommerce?endpoint=shop&search=${encodeURIComponent(query)}`;
        const response = await fetch(`${process.env.WP_BASE_URL}${searchUrl}`);
        
        if (response.ok) {
          const results = await response.json();
          await redisCache.set(
            cacheKeys.search(query),
            results,
            cacheTTL.search
          );
          logger.info(`Warmed search cache: "${query}"`);
        }
      }
    } catch (error) {
      logger.error('Failed to warm search cache:', { error });
    }
  }

  /**
   * Get cache warming status
   */
  getStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
  } {
    const nextRun = this.lastRun 
      ? new Date(this.lastRun.getTime() + 15 * 60 * 1000) // 15 minutes
      : null;

    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun,
    };
  }

  /**
   * Schedule automatic cache warming
   */
  scheduleWarming(intervalMinutes: number = 15): void {
    setInterval(() => {
      this.warmCache();
    }, intervalMinutes * 60 * 1000);

    logger.info(`Scheduled cache warming every ${intervalMinutes} minutes`);
  }
}

// Singleton instance
export const cacheWarmer = new CacheWarmer();

// Utility function to warm cache
export async function warmCache(config?: CacheWarmingConfig): Promise<void> {
  return cacheWarmer.warmCache(config);
}

// Utility function to get cache warming status
export function getCacheWarmingStatus() {
  return cacheWarmer.getStatus();
}

// Utility function to schedule cache warming
export function scheduleCacheWarming(intervalMinutes?: number): void {
  return cacheWarmer.scheduleWarming(intervalMinutes);
}

export default cacheWarmer;

