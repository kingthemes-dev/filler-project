/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import KingProductCard from '@/components/king-product-card';
import type { WooProduct } from '@/types/woocommerce';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  (MockLink as any).displayName = 'MockNextLink';
  return MockLink;
});

// Mock next/image
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, priority: _priority, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  );
  (MockImage as any).displayName = 'MockNextImage';
  return MockImage;
});

// Mock useFavoritesStore
jest.mock('@/stores/favorites-store', () => ({
  useFavoritesStore: () => ({
    favorites: [],
    toggleFavorite: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
    isFavorite: jest.fn(() => false),
  }),
}));

// Mock useCart hook
jest.mock('@/stores/cart-store', () => ({
  useCartStore: () => ({
    addItem: jest.fn(),
    openCart: jest.fn(),
    items: [],
  }),
}));

const mockProduct: Partial<WooProduct> = {
  id: 1,
  name: 'Test Product',
  slug: 'test-product',
  price: '99.99',
  regular_price: '129.99',
  sale_price: '99.99',
  on_sale: true,
  images: [
    {
      id: 1,
      src: 'https://example.com/image.jpg',
      alt: 'Test Product Image',
    } as any,
  ] as any,
  stock_status: 'instock' as any,
  variations: [] as any,
  attributes: [] as any,
  rating_count: 5,
  average_rating: '4.5',
  short_description: 'Test product description',
  categories: [
    {
      id: 1,
      name: 'Test Category',
      slug: 'test-category',
    },
  ],
};

describe('KingProductCard', () => {
  it('renders product information correctly', () => {
    render(<KingProductCard product={mockProduct as WooProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('99,99 zł')).toBeInTheDocument();
    expect(screen.getByText('129,99 zł')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows sale badge when product is on sale', () => {
    render(<KingProductCard product={mockProduct as WooProduct} />);
    
    expect(screen.getByText('PROMOCJA')).toBeInTheDocument();
  });

  it('handles add to cart click', () => {
    const { container } = render(<KingProductCard product={mockProduct as WooProduct} />);
    
    const addToCartButton = container.querySelector('button[data-testid="add-to-cart"]');
    expect(addToCartButton).toBeInTheDocument();
    
    if (addToCartButton) {
      fireEvent.click(addToCartButton);
    }
  });

  it('handles favorite button click', () => {
    const { container } = render(<KingProductCard product={mockProduct as WooProduct} />);
    
    const favoriteButton = container.querySelector('button[data-testid="favorite-button"]');
    expect(favoriteButton).toBeInTheDocument();
    
    if (favoriteButton) {
      fireEvent.click(favoriteButton);
    }
  });

  it('shows out of stock when product is out of stock', () => {
    const outOfStockProduct = { ...(mockProduct as WooProduct), stock_status: 'outofstock' } as WooProduct;
    render(<KingProductCard product={outOfStockProduct} />);
    
    expect(screen.getByText('Brak w magazynie')).toBeInTheDocument();
  });

  it('renders product link correctly', () => {
    render(<KingProductCard product={mockProduct as WooProduct} />);
    
    const productLink = screen.getByRole('link');
    expect(productLink).toHaveAttribute('href', '/produkt/test-product');
  });
});

