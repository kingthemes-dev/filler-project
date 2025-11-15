/**
 * Helper to fetch customer data from WooCommerce for GDPR export
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import type {
  WooCustomer,
  WooOrder,
  WooBilling,
  WooShipping,
} from '@/types/woocommerce';
import type { UserDataExport } from '@/types/gdpr';

interface WooCommerceReview {
  id: number;
  product_id: number;
  product_name?: string;
  rating: number;
  review: string;
  reviewer: string;
  date_created: string;
  date_created_gmt: string;
}

interface WooCommerceFavorite {
  product_id: number;
  product_name?: string;
  added_at: string;
}

/**
 * Fetch customer data from WooCommerce
 */
export async function fetchCustomerData(
  customerId: number,
  authToken?: string
): Promise<WooCustomer | null> {
  try {
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/customers/${customerId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to fetch customer data', {
        customerId,
        status: response.status,
      });
      return null;
    }

    const customer = (await response.json()) as WooCustomer;
    return customer;
  } catch (error) {
    logger.error('Error fetching customer data', {
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fetch customer orders from WooCommerce
 */
export async function fetchCustomerOrders(
  customerId: number,
  authToken?: string
): Promise<WooOrder[]> {
  try {
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/orders?customer=${customerId}&per_page=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to fetch customer orders', {
        customerId,
        status: response.status,
      });
      return [];
    }

    const orders = (await response.json()) as WooOrder[];
    return orders;
  } catch (error) {
    logger.error('Error fetching customer orders', {
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch customer reviews from WooCommerce
 */
export async function fetchCustomerReviews(
  customerEmail: string,
  authToken?: string
): Promise<WooCommerceReview[]> {
  try {
    // WooCommerce doesn't have a direct endpoint for customer reviews by email
    // We need to fetch all reviews with pagination and filter by email
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    let allReviews: Array<{
      id: number;
      product_id: number;
      product_name?: string;
      rating: number;
      review: string;
      reviewer: string;
      reviewer_email: string;
      date_created: string;
      date_created_gmt: string;
    }> = [];

    let page = 1;
    let hasMore = true;
    const perPage = 100;
    const maxPages = 10; // Limit to 10 pages (1000 reviews) to avoid infinite loops

    // Fetch reviews with pagination
    while (hasMore && page <= maxPages) {
      const response = await fetch(
        `${env.NEXT_PUBLIC_WC_URL}/products/reviews?per_page=${perPage}&page=${page}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        logger.error('Failed to fetch customer reviews', {
          customerEmail,
          status: response.status,
          page,
        });
        break;
      }

      const reviews = (await response.json()) as Array<{
        id: number;
        product_id: number;
        product_name?: string;
        rating: number;
        review: string;
        reviewer: string;
        reviewer_email: string;
        date_created: string;
        date_created_gmt: string;
      }>;

      if (reviews.length === 0) {
        hasMore = false;
      } else {
        allReviews = allReviews.concat(reviews);
        // If we got less than perPage reviews, we've reached the end
        if (reviews.length < perPage) {
          hasMore = false;
        }
        page++;
      }
    }

    // Filter reviews by customer email (case-insensitive)
    const customerReviews = allReviews
      .filter(
        review =>
          review.reviewer_email?.toLowerCase() === customerEmail.toLowerCase()
      )
      .map(review => ({
        id: review.id,
        product_id: review.product_id,
        product_name: review.product_name,
        rating: review.rating,
        review: review.review,
        reviewer: review.reviewer,
        date_created: review.date_created,
        date_created_gmt: review.date_created_gmt,
      }));

    logger.info('Customer reviews fetched', {
      customerEmail,
      totalReviews: allReviews.length,
      customerReviews: customerReviews.length,
    });

    return customerReviews;
  } catch (error) {
    logger.error('Error fetching customer reviews', {
      customerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch customer favorites from API
 * Note: This uses server-side fetch, so we need to use full URL
 */
export async function fetchCustomerFavorites(
  customerId: number,
  authToken?: string
): Promise<number[]> {
  try {
    // Get base URL for API calls
    const baseUrl = env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Fetch favorites from favorites API endpoint
    const response = await fetch(
      `${baseUrl}/api/favorites?userId=${customerId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to fetch customer favorites', {
        customerId,
        status: response.status,
      });
      return [];
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: Array<{ id: number }>;
      count?: number;
    };

    if (!data.success || !data.data) {
      return [];
    }

    // Extract product IDs from favorites
    const favoriteIds = data.data.map(fav => fav.id);
    return favoriteIds;
  } catch (error) {
    logger.error('Error fetching customer favorites', {
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch customer newsletter subscriptions
 */
export async function fetchCustomerNewsletterSubscriptions(
  customerEmail: string
): Promise<Array<{ email: string; subscribed_at: string; status: string }>> {
  try {
    // Check if email is subscribed to newsletter via Brevo API
    // This is a placeholder - implement based on your newsletter service
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('Error fetching newsletter subscriptions', {
      customerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Export all customer data for GDPR request
 */
export async function exportCustomerData(
  customerId: number,
  customerEmail: string,
  authToken?: string
): Promise<UserDataExport> {
  try {
    // Fetch all customer data in parallel
    const [customer, orders, reviews, favorites, newsletterSubscriptions] =
      await Promise.all([
        fetchCustomerData(customerId, authToken),
        fetchCustomerOrders(customerId, authToken),
        fetchCustomerReviews(customerEmail, authToken),
        fetchCustomerFavorites(customerId, authToken),
        fetchCustomerNewsletterSubscriptions(customerEmail),
      ]);

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Fetch cookie consents from localStorage (this should be done on client side)
    // For server-side export, we'll return empty array
    const cookieConsents: Array<{
      preferences: {
        necessary: boolean;
        analytics: boolean;
        marketing: boolean;
        preferences: boolean;
      };
      created_at: string;
      updated_at: string;
      version: string;
    }> = [];

    // Format orders for export
    const formattedOrders = orders.map(order => ({
      id: order.id,
      number: order.number,
      status: order.status,
      date_created: order.date_created,
      total: order.total,
      currency: order.currency,
      payment_method: order.payment_method,
      billing: {
        first_name: order.billing.first_name,
        last_name: order.billing.last_name,
        company: order.billing.company,
        address_1: order.billing.address_1,
        address_2: order.billing.address_2,
        city: order.billing.city,
        state: order.billing.state,
        postcode: order.billing.postcode,
        country: order.billing.country,
        email: order.billing.email,
        phone: order.billing.phone,
      },
      shipping: {
        first_name: order.shipping.first_name,
        last_name: order.shipping.last_name,
        company: order.shipping.company,
        address_1: order.shipping.address_1,
        address_2: order.shipping.address_2,
        city: order.shipping.city,
        state: order.shipping.state,
        postcode: order.shipping.postcode,
        country: order.shipping.country,
      },
      line_items: order.line_items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: String(item.price),
        total: item.total,
      })),
    }));

    // Format reviews for export
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      product_id: review.product_id,
      product_name: review.product_name || '',
      rating: review.rating,
      comment: review.review,
      date_created: review.date_created,
    }));

    // Build export data
    const exportData: UserDataExport = {
      account: {
        id: customer.id,
        email: customer.email,
        username: customer.username,
        first_name: customer.first_name,
        last_name: customer.last_name,
        role: customer.role,
        date_created: customer.date_created,
        date_modified: customer.date_modified,
      },
      billing: {
        first_name: customer.billing.first_name,
        last_name: customer.billing.last_name,
        company: customer.billing.company,
        address_1: customer.billing.address_1,
        address_2: customer.billing.address_2,
        city: customer.billing.city,
        state: customer.billing.state,
        postcode: customer.billing.postcode,
        country: customer.billing.country,
        email: customer.billing.email,
        phone: customer.billing.phone,
        nip: (customer.billing as { nip?: string }).nip,
      },
      shipping: {
        first_name: customer.shipping.first_name,
        last_name: customer.shipping.last_name,
        company: customer.shipping.company,
        address_1: customer.shipping.address_1,
        address_2: customer.shipping.address_2,
        city: customer.shipping.city,
        state: customer.shipping.state,
        postcode: customer.shipping.postcode,
        country: customer.shipping.country,
      },
      orders: formattedOrders,
      reviews: formattedReviews,
      favorites,
      cookie_consents: cookieConsents,
      newsletter_subscriptions: newsletterSubscriptions,
      export_date: new Date().toISOString(),
      export_version: '1.0.0',
    };

    return exportData;
  } catch (error) {
    logger.error('Error exporting customer data', {
      customerId,
      customerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Anonymize customer data in WooCommerce
 */
export async function anonymizeCustomerData(
  customerId: number,
  authToken?: string
): Promise<boolean> {
  try {
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    // Anonymize customer data
    const anonymizedData = {
      first_name: 'Anonimowy',
      last_name: 'Użytkownik',
      email: `deleted_${customerId}_${Date.now()}@deleted.local`,
      username: `deleted_user_${customerId}_${Date.now()}`,
      billing: {
        first_name: 'Anonimowy',
        last_name: 'Użytkownik',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
        email: `deleted_${customerId}_${Date.now()}@deleted.local`,
        phone: '',
      },
      shipping: {
        first_name: 'Anonimowy',
        last_name: 'Użytkownik',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      },
      meta_data: [
        {
          key: '_gdpr_anonymized',
          value: new Date().toISOString(),
        },
        {
          key: '_gdpr_anonymized_at',
          value: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/customers/${customerId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(anonymizedData),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to anonymize customer data', {
        customerId,
        status: response.status,
      });
      return false;
    }

    logger.info('Customer data anonymized', { customerId });
    return true;
  } catch (error) {
    logger.error('Error anonymizing customer data', {
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

