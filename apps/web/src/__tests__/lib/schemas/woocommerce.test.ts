/**
 * Tests for WooCommerce API Zod schemas
 */

import {
  woocommerceQuerySchema,
  orderSchema,
  orderLineItemSchema,
  billingAddressSchema,
  shippingAddressSchema,
  passwordResetSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@/lib/schemas/woocommerce';

const createMinimalBilling = () => ({
  first_name: 'Jan',
  last_name: 'Kowalski',
  address_1: 'ul. Testowa 1',
  city: 'Warszawa',
  postcode: '00-001',
  country: 'PL',
});

const createMinimalLineItem = () => ({
  product_id: 123,
  quantity: 1,
});

const buildBaseOrder = (overrides = {}) => ({
  billing: createMinimalBilling(),
  line_items: [createMinimalLineItem()],
  payment_method: 'bacs',
  ...overrides,
});

describe('WooCommerce Zod Schemas', () => {
  describe('woocommerceQuerySchema', () => {
    test('validates valid query parameters', () => {
      const valid = {
        endpoint: 'products',
        page: '1',
        per_page: '24',
        customer: '123',
        status: 'completed',
        search: 'test',
        category: '5',
        orderby: 'date',
        order: 'desc' as const,
        cache: 'on' as const,
        slug: 'test-product',
        include: '1,2,3',
        after: '2024-01-01',
        before: '2024-12-31',
      };

      const result = woocommerceQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endpoint).toBe('products');
        expect(result.data.page).toBe(1);
        expect(result.data.per_page).toBe(24);
        expect(result.data.customer).toBe(123);
        expect(result.data.category).toBe(5);
      }
    });

    test('requires endpoint', () => {
      const invalid = {
        page: '1',
      };

      const result = woocommerceQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('transforms string numbers to integers', () => {
      const input = {
        endpoint: 'products',
        page: '2',
        per_page: '48',
        customer: '456',
        category: '10',
      };

      const result = woocommerceQuerySchema.parse(input);
      expect(typeof result.page).toBe('number');
      expect(typeof result.per_page).toBe('number');
      expect(typeof result.customer).toBe('number');
      expect(typeof result.category).toBe('number');
    });
  });

  describe('orderLineItemSchema', () => {
    test('validates valid line item', () => {
      const valid = {
        product_id: 123,
        quantity: 2,
        variation_id: 456,
        meta_data: [{ key: 'test', value: 'test' }],
      };

      const result = orderLineItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires product_id and quantity', () => {
      const invalid = {
        product_id: 123,
      };

      const result = orderLineItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('rejects negative product_id', () => {
      const invalid = {
        product_id: -1,
        quantity: 1,
      };

      const result = orderLineItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('rejects zero quantity', () => {
      const invalid = {
        product_id: 123,
        quantity: 0,
      };

      const result = orderLineItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('billingAddressSchema', () => {
    test('validates valid billing address', () => {
      const valid = {
        first_name: 'Jan',
        last_name: 'Kowalski',
        company: 'Test Company',
        address_1: 'ul. Testowa 1',
        address_2: 'apt 5',
        city: 'Warszawa',
        state: 'Mazowieckie',
        postcode: '00-001',
        country: 'PL',
        email: 'test@example.com',
        phone: '+48123456789',
        customer_id: 123,
      };

      const result = billingAddressSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires required fields', () => {
      const invalid = {
        first_name: 'Jan',
        // missing last_name, address_1, city, postcode, country
      };

      const result = billingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('validates country code length', () => {
      const invalid = {
        first_name: 'Jan',
        last_name: 'Kowalski',
        address_1: 'ul. Testowa 1',
        city: 'Warszawa',
        postcode: '00-001',
        country: 'POL', // should be 2 characters
      };

      const result = billingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('validates email format', () => {
      const invalid = {
        first_name: 'Jan',
        last_name: 'Kowalski',
        address_1: 'ul. Testowa 1',
        city: 'Warszawa',
        postcode: '00-001',
        country: 'PL',
        email: 'invalid-email',
      };

      const result = billingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('shippingAddressSchema', () => {
    test('validates valid shipping address', () => {
      const valid = {
        first_name: 'Jan',
        last_name: 'Kowalski',
        company: 'Test Company',
        address_1: 'ul. Testowa 1',
        address_2: 'apt 5',
        city: 'Warszawa',
        state: 'Mazowieckie',
        postcode: '00-001',
        country: 'PL',
      };

      const result = shippingAddressSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires required fields', () => {
      const invalid = {
        first_name: 'Jan',
        // missing last_name, address_1, city, postcode, country
      };

      const result = shippingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('orderSchema', () => {
    test('validates valid order', () => {
      const valid = buildBaseOrder({
        customer_id: 123,
        shipping: {
          first_name: 'Jan',
          last_name: 'Kowalski',
          address_1: 'ul. Testowa 1',
          city: 'Warszawa',
          postcode: '00-001',
          country: 'PL',
        },
        payment_method_title: 'Przelew bankowy',
        set_paid: false,
        meta_data: [{ key: 'test', value: 'test' }],
        coupon_lines: [{ code: 'TEST10' }],
        shipping_lines: [
          {
            method_id: 'free_shipping',
            method_title: 'Darmowa dostawa',
            total: '0',
          },
        ],
      });

      const result = orderSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires at least one line item', () => {
      const invalid = buildBaseOrder({ line_items: [] });

      const result = orderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'At least one line item is required'
        );
      }
    });

    test('accepts minimal order', () => {
      const minimal = buildBaseOrder();

      const result = orderSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('passwordResetSchema', () => {
    test('validates valid email', () => {
      const valid = {
        email: 'test@example.com',
      };

      const result = passwordResetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('rejects invalid email', () => {
      const invalid = {
        email: 'invalid-email',
      };

      const result = passwordResetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('requires email', () => {
      const invalid = {};

      const result = passwordResetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    test('validates valid reset password data', () => {
      const valid = {
        key: 'abcdefghij1234567890',
        login: 'testuser',
        password: 'NewPassword123!',
      };

      const result = resetPasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires all fields', () => {
      const invalid = {
        key: 'abcdefghij',
        // missing login and password
      };

      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('validates key minimum length', () => {
      const invalid = {
        key: 'short',
        login: 'testuser',
        password: 'NewPassword123!',
      };

      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Nieprawidłowy klucz'
        );
      }
    });

    test('validates password minimum length', () => {
      const invalid = {
        key: 'abcdefghij1234567890',
        login: 'testuser',
        password: 'short',
      };

      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'co najmniej 8 znaków'
        );
      }
    });
  });

  describe('updateProfileSchema', () => {
    test('validates valid profile update', () => {
      const valid = {
        customer_id: 123,
        profile_data: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          billing: {
            company: 'Test Company',
            nip: '1234567890',
            invoiceRequest: true,
            address: 'ul. Testowa 1',
            city: 'Warszawa',
            postcode: '00-001',
            country: 'PL',
            phone: '+48123456789',
          },
          shipping: {
            company: 'Test Company',
            address: 'ul. Testowa 1',
            city: 'Warszawa',
            postcode: '00-001',
            country: 'PL',
          },
        },
      };

      const result = updateProfileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires customer_id', () => {
      const invalid = {
        profile_data: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          billing: {
            address: 'ul. Testowa 1',
            city: 'Warszawa',
            postcode: '00-001',
            country: 'PL',
            phone: '+48123456789',
          },
          shipping: {
            address: 'ul. Testowa 1',
            city: 'Warszawa',
            postcode: '00-001',
            country: 'PL',
          },
        },
      };

      const result = updateProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('requires all required profile fields', () => {
      const invalid = {
        customer_id: 123,
        profile_data: {
          firstName: 'Jan',
          // missing lastName, billing, shipping
        },
      };

      const result = updateProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    test('validates valid password change', () => {
      const valid = {
        customer_id: 123,
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      };

      const result = changePasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('requires all fields', () => {
      const invalid = {
        customer_id: 123,
        current_password: 'OldPassword123!',
        // missing new_password
      };

      const result = changePasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('validates password minimum length', () => {
      const invalid = {
        customer_id: 123,
        current_password: 'OldPassword123!',
        new_password: 'short',
      };

      const result = changePasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
