import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import KingProductCard from '@/components/king-product-card';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock next/image
jest.mock('next/image', () => {
  return ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  );
});

// Mock useFavoritesStore
jest.mock('@/stores/favorites-store', () => ({
  useFavoritesStore: () => ({
    favorites: [],
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
    isFavorite: jest.fn(() => false),
  }),
}));

// Mock useCart hook
jest.mock('@/stores/cart-store', () => ({
  useCartStore: () => ({
    addItem: jest.fn(),
    items: [],
  }),
}));

const mockProduct = {
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
    },
  ],
  stock_status: 'instock',
  variations: [],
  attributes: {},
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
    render(<KingProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('99,99 zł')).toBeInTheDocument();
    expect(screen.getByText('129,99 zł')).toBeInTheDocument();
    expect(screen.getByAltText('Test Product Image')).toBeInTheDocument();
  });

  it('shows sale badge when product is on sale', () => {
    render(<KingProductCard product={mockProduct} />);
    
    expect(screen.getByText('PROMOCJA')).toBeInTheDocument();
  });

  it('handles add to cart click', () => {
    const { container } = render(<KingProductCard product={mockProduct} />);
    
    const addToCartButton = container.querySelector('button[data-testid="add-to-cart"]');
    expect(addToCartButton).toBeInTheDocument();
    
    if (addToCartButton) {
      fireEvent.click(addToCartButton);
    }
  });

  it('handles favorite button click', () => {
    const { container } = render(<KingProductCard product={mockProduct} />);
    
    const favoriteButton = container.querySelector('button[data-testid="favorite-button"]');
    expect(favoriteButton).toBeInTheDocument();
    
    if (favoriteButton) {
      fireEvent.click(favoriteButton);
    }
  });

  it('shows out of stock when product is out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock_status: 'outofstock' };
    render(<KingProductCard product={outOfStockProduct} />);
    
    expect(screen.getByText('Brak w magazynie')).toBeInTheDocument();
  });

  it('renders product link correctly', () => {
    render(<KingProductCard product={mockProduct} />);
    
    const productLink = screen.getByRole('link');
    expect(productLink).toHaveAttribute('href', '/produkt/test-product');
  });
});

