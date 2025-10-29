/**
 * HPOS-Optimized Cache Strategy
 * Enhanced caching for High-Performance Order Storage
 */

import { logger } from '@/utils/logger';

interface HPOSCacheConfig {
  orders: {
    ttl: number;
    maxSize: number;
    enableCompression: boolean;
  };
  products: {
    ttl: number;
    maxSize: number;
    enableCompression: boolean;
  };
  customers: {
    ttl: number;
    maxSize: number;
    enableCompression: boolean;
  };
  sessions: {
    ttl: number;
    maxSize: number;
    enableCompression: boolean;
  };
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  compressed?: boolean;
}

class HPOSCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: HPOSCacheConfig;
  private compressionEnabled: boolean = false;

  constructor() {
    this.config = {
      orders: {
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        enableCompression: true,
      },
      products: {
        ttl: 600000, // 10 minutes
        maxSize: 2000,
        enableCompression: true,
      },
      customers: {
        ttl: 180000, // 3 minutes
        maxSize: 500,
        enableCompression: false,
      },
      sessions: {
        ttl: 900000, // 15 minutes
        maxSize: 200,
        enableCompression: false,
      },
    };

    // Initialize compression if available
    this.initializeCompression();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  private initializeCompression(): void {
    try {
      // Check if compression is available
      if (typeof CompressionStream !== 'undefined') {
        this.compressionEnabled = true;
        logger.info('HPOS Cache: Compression enabled');
      } else {
        logger.info('HPOS Cache: Compression not available, using uncompressed cache');
      }
    } catch (error) {
      logger.warn('HPOS Cache: Failed to initialize compression', { error });
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('HPOS Cache: Cleaned up expired entries', { count: cleanedCount });
    }
  }

  private generateKey(type: keyof HPOSCacheConfig, identifier: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `hpos:${type}:${identifier}:${paramString}`;
  }

  private async compressData(data: any): Promise<string> {
    if (!this.compressionEnabled) {
      return JSON.stringify(data);
    }

    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(encoder.encode(jsonString));
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return btoa(String.fromCharCode(...compressed));
    } catch (error) {
      logger.warn('HPOS Cache: Compression failed, using uncompressed data', { error });
      return JSON.stringify(data);
    }
  }

  private async decompressData(compressedData: string): Promise<any> {
    if (!this.compressionEnabled) {
      return JSON.parse(compressedData);
    }

    try {
      const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressed);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decompressed));
    } catch (error) {
      logger.warn('HPOS Cache: Decompression failed, trying uncompressed data', { error });
      return JSON.parse(compressedData);
    }
  }

  async get<T>(type: keyof HPOSCacheConfig, identifier: string, params?: Record<string, any>): Promise<T | null> {
    const key = this.generateKey(type, identifier, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    try {
      let data = entry.data;
      
      if (entry.compressed) {
        data = await this.decompressData(entry.data);
      }

      logger.debug('HPOS Cache: Cache hit', { type, identifier, age: now - entry.timestamp });
      return data;
    } catch (error) {
      logger.warn('HPOS Cache: Failed to retrieve cached data', { key, error });
      this.cache.delete(key);
      return null;
    }
  }

  async set<T>(type: keyof HPOSCacheConfig, identifier: string, data: T, params?: Record<string, any>, tags: string[] = []): Promise<void> {
    const config = this.config[type];
    const key = this.generateKey(type, identifier, params);

    // Check size limit
    if (this.cache.size >= config.maxSize) {
      this.evictOldest();
    }

    try {
      let processedData: any = data;
      let compressed = false;

      if (config.enableCompression && this.compressionEnabled) {
        processedData = await this.compressData(data);
        compressed = true;
      }

      const entry: CacheEntry = {
        data: processedData,
        timestamp: Date.now(),
        ttl: config.ttl,
        tags,
        compressed,
      };

      this.cache.set(key, entry);
      logger.debug('HPOS Cache: Data cached', { type, identifier, compressed });
    } catch (error) {
      logger.warn('HPOS Cache: Failed to cache data', { type, identifier, error });
    }
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('HPOS Cache: Evicted oldest entry', { key: oldestKey });
    }
  }

  invalidateByTag(tag: string): void {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      logger.info('HPOS Cache: Invalidated entries by tag', { tag, count: invalidatedCount });
    }
  }

  invalidateByType(type: keyof HPOSCacheConfig): void {
    let invalidatedCount = 0;

    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`hpos:${type}:`)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      logger.info('HPOS Cache: Invalidated entries by type', { type, count: invalidatedCount });
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('HPOS Cache: Cache cleared', { previousSize: size });
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    compressionEnabled: boolean;
    types: Record<string, { count: number; maxSize: number }>;
  } {
    const types: Record<string, { count: number; maxSize: number }> = {};
    let totalMaxSize = 0;

    for (const [type, config] of Object.entries(this.config)) {
      const count = Array.from(this.cache.keys()).filter(key => key.startsWith(`hpos:${type}:`)).length;
      types[type] = { count, maxSize: config.maxSize };
      totalMaxSize += config.maxSize;
    }

    return {
      size: this.cache.size,
      maxSize: totalMaxSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      compressionEnabled: this.compressionEnabled,
      types,
    };
  }
}

// Export singleton instance
export const hposCache = new HPOSCacheManager();
export type { HPOSCacheConfig };
