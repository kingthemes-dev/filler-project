/**
 * Cart Persistence Service
 * Cross-device cart synchronization with database storage
 */

import { Redis } from 'ioredis';
import storeApiService from './store-api';
import sessionManager from './session-manager';

interface CartItem {
  id: string;
  productId: number;
  quantity: number;
  variation?: Record<string, any>;
  price: number;
  total: number;
  image?: string;
  name: string;
  sku?: string;
}

interface CartData {
  sessionId: string;
  userId?: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
  lastUpdated: Date;
  createdAt: Date;
  expiresAt: Date;
}

class CartPersistenceService {
  private redis: Redis | null = null;
  private cartExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
        });
        console.log('✅ Cart Persistence: Redis connected');
      } else {
        console.warn('⚠️ Cart Persistence: Redis not configured, using localStorage');
      }
    } catch (error) {
      console.error('❌ Cart Persistence: Redis connection failed', error);
    }
  }

  /**
   * Save cart to persistent storage
   */
  async saveCart(cartData: CartData): Promise<void> {
    try {
      const key = `cart:${cartData.sessionId}`;
      const data = JSON.stringify(cartData);

      if (this.redis) {
        await this.redis.setex(key, this.cartExpiry, data);
      } else {
        localStorage.setItem(key, data);
      }

      console.log(`💾 Cart saved: ${cartData.sessionId} (${cartData.items.length} items)`);
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }

  /**
   * Load cart from persistent storage
   */
  async loadCart(sessionId: string): Promise<CartData | null> {
    try {
      const key = `cart:${sessionId}`;
      let cartData: string | null = null;

      if (this.redis) {
        cartData = await this.redis.get(key);
      } else {
        cartData = localStorage.getItem(key);
      }

      if (!cartData) {
        return null;
      }

      const cart = JSON.parse(cartData) as CartData;
      
      // Check if cart is expired
      if (new Date() > new Date(cart.expiresAt)) {
        await this.deleteCart(sessionId);
        return null;
      }

      return cart;
    } catch (error) {
      console.error('Failed to load cart:', error);
      return null;
    }
  }

  /**
   * Delete cart from storage
   */
  async deleteCart(sessionId: string): Promise<void> {
    try {
      const key = `cart:${sessionId}`;

      if (this.redis) {
        await this.redis.del(key);
      } else {
        localStorage.removeItem(key);
      }

      console.log(`🗑️ Cart deleted: ${sessionId}`);
    } catch (error) {
      console.error('Failed to delete cart:', error);
    }
  }

  /**
   * Sync cart with WooCommerce Store API
   */
  async syncWithStoreApi(sessionId: string): Promise<CartData | null> {
    try {
      // Get current cart from Store API
      const storeCart = await storeApiService.getCart();
      
      // Convert Store API format to our format
      const cartData: CartData = {
        sessionId,
        items: storeCart.items.map((item: any) => ({
          id: item.key,
          productId: item.id,
          quantity: item.quantity,
          variation: item.variation || {},
          price: parseFloat(item.prices.price),
          total: parseFloat(item.prices.total),
          image: item.image?.src || '',
          name: item.name,
          sku: item.sku || '',
        })),
        totals: {
          subtotal: parseFloat(storeCart.totals.total_items),
          tax: parseFloat(storeCart.totals.total_tax),
          shipping: parseFloat(storeCart.totals.total_shipping),
          total: parseFloat(storeCart.totals.total_price),
          currency: storeCart.totals.currency_code,
        },
        lastUpdated: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.cartExpiry * 1000),
      };

      // Save to persistent storage
      await this.saveCart(cartData);

      return cartData;
    } catch (error) {
      console.error('Failed to sync cart with Store API:', error);
      return null;
    }
  }

  /**
   * Restore cart from storage to Store API
   */
  async restoreToStoreApi(sessionId: string): Promise<boolean> {
    try {
      const cartData = await this.loadCart(sessionId);
      if (!cartData) {
        return false;
      }

      // Clear current cart
      await storeApiService.clearCart();

      // Add items to Store API cart
      for (const item of cartData.items) {
        await storeApiService.addToCart(
          item.productId,
          item.quantity,
          item.variation
        );
      }

      console.log(`🔄 Cart restored: ${sessionId} (${cartData.items.length} items)`);
      return true;
    } catch (error) {
      console.error('Failed to restore cart to Store API:', error);
      return false;
    }
  }

  /**
   * Merge carts from different sessions
   */
  async mergeCarts(primarySessionId: string, secondarySessionId: string): Promise<CartData | null> {
    try {
      const primaryCart = await this.loadCart(primarySessionId);
      const secondaryCart = await this.loadCart(secondarySessionId);

      if (!primaryCart && !secondaryCart) {
        return null;
      }

      if (!primaryCart) {
        return secondaryCart;
      }

      if (!secondaryCart) {
        return primaryCart;
      }

      // Merge items
      const mergedItems = [...primaryCart.items];
      
      for (const item of secondaryCart.items) {
        const existingItem = mergedItems.find(i => 
          i.productId === item.productId && 
          JSON.stringify(i.variation) === JSON.stringify(item.variation)
        );

        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.total = existingItem.price * existingItem.quantity;
        } else {
          mergedItems.push(item);
        }
      }

      // Calculate new totals
      const subtotal = mergedItems.reduce((sum, item) => sum + item.total, 0);
      
      const mergedCart: CartData = {
        sessionId: primarySessionId,
        userId: primaryCart.userId,
        items: mergedItems,
        totals: {
          ...primaryCart.totals,
          subtotal,
          total: subtotal + primaryCart.totals.tax + primaryCart.totals.shipping,
        },
        lastUpdated: new Date(),
        createdAt: primaryCart.createdAt,
        expiresAt: new Date(Date.now() + this.cartExpiry * 1000),
      };

      // Save merged cart
      await this.saveCart(mergedCart);

      // Delete secondary cart
      await this.deleteCart(secondarySessionId);

      console.log(`🔀 Carts merged: ${primarySessionId} + ${secondarySessionId}`);
      return mergedCart;
    } catch (error) {
      console.error('Failed to merge carts:', error);
      return null;
    }
  }

  /**
   * Get user's carts across all sessions
   */
  async getUserCarts(userId: string): Promise<CartData[]> {
    if (!this.redis) {
      return [];
    }

    try {
      const keys = await this.redis.keys(`cart:*`);
      const carts: CartData[] = [];

      for (const key of keys) {
        const cartData = await this.redis.get(key);
        if (cartData) {
          const cart = JSON.parse(cartData) as CartData;
          if (cart.userId === userId) {
            carts.push(cart);
          }
        }
      }

      return carts;
    } catch (error) {
      console.error('Failed to get user carts:', error);
      return [];
    }
  }

  /**
   * Clean expired carts
   */
  async cleanExpiredCarts(): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`cart:*`);
      let cleaned = 0;

      for (const key of keys) {
        const cartData = await this.redis.get(key);
        if (cartData) {
          const cart = JSON.parse(cartData) as CartData;
          if (new Date() > new Date(cart.expiresAt)) {
            await this.redis.del(key);
            cleaned++;
          }
        }
      }

      console.log(`🧹 Cleaned ${cleaned} expired carts`);
      return cleaned;
    } catch (error) {
      console.error('Failed to clean expired carts:', error);
      return 0;
    }
  }

  /**
   * Get cart statistics
   */
  async getCartStats(): Promise<{
    totalCarts: number;
    activeCarts: number;
    expiredCarts: number;
    totalItems: number;
  }> {
    if (!this.redis) {
      return { totalCarts: 0, activeCarts: 0, expiredCarts: 0, totalItems: 0 };
    }

    try {
      const keys = await this.redis.keys(`cart:*`);
      let totalCarts = keys.length;
      let activeCarts = 0;
      let expiredCarts = 0;
      let totalItems = 0;

      for (const key of keys) {
        const cartData = await this.redis.get(key);
        if (cartData) {
          const cart = JSON.parse(cartData) as CartData;
          totalItems += cart.items.length;
          
          if (new Date() > new Date(cart.expiresAt)) {
            expiredCarts++;
          } else {
            activeCarts++;
          }
        }
      }

      return { totalCarts, activeCarts, expiredCarts, totalItems };
    } catch (error) {
      console.error('Failed to get cart stats:', error);
      return { totalCarts: 0, activeCarts: 0, expiredCarts: 0, totalItems: 0 };
    }
  }
}

export default new CartPersistenceService();
