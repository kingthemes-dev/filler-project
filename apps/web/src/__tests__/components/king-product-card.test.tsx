/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import KingProductCard from '@/components/king-product-card';
import type { WooProduct } from '@/types/woocommerce';

// Mock next/link
jest.mock('next/link', () => {
  type MockNextLinkProps = { children: React.ReactNode; href: string };
  type MockNextLinkComponent = React.FC<MockNextLinkProps> & {
    displayName?: string;
  };

  const MockLink: MockNextLinkComponent = ({ children, href }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockNextLink';
  return MockLink;
});

// Mock next/image
jest.mock('next/image', () => {
  type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
  };
  type MockImageComponent = React.FC<MockImageProps> & { displayName?: string };

  const MockImage: MockImageComponent = ({
    src,
    alt,
    priority: _priority,
    ...props
  }) => <img src={src ?? ''} alt={alt ?? ''} {...props} />;
  MockImage.displayName = 'MockNextImage';
  return MockImage;
});

// Mock favorites store selectors
const mockToggleFavorite = jest.fn();
jest.mock('@/stores/favorites-store', () => ({
  useFavoritesItems: () => [],
  useFavoritesActions: () => ({
    toggleFavorite: mockToggleFavorite,
  }),
}));

// Mock cart store selectors
const mockAddItem = jest.fn();
const mockOpenCart = jest.fn();
jest.mock('@/stores/cart-store', () => ({
  useCartActions: () => ({
    addItem: mockAddItem,
    openCart: mockOpenCart,
  }),
}));

// Mock quickview store selectors
jest.mock('@/stores/quickview-store', () => ({
  useQuickViewIsOpen: () => false,
  useQuickViewProduct: () => null,
  useQuickViewActions: () => ({
    openQuickView: jest.fn(),
    closeQuickView: jest.fn(),
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
      date_created: '',
      date_created_gmt: '',
      date_modified: '',
      date_modified_gmt: '',
      src: 'https://example.com/image.jpg',
      name: 'Test Product Image',
      alt: 'Test Product Image',
    },
  ],
  stock_status: 'instock',
  variations: [],
  attributes: [],
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
    const { container } = render(
      <KingProductCard product={mockProduct as WooProduct} />
    );

    const addToCartButton = container.querySelector(
      'button[data-testid="add-to-cart"]'
    );
    expect(addToCartButton).toBeInTheDocument();

    if (addToCartButton) {
      fireEvent.click(addToCartButton);
    }
  });

  it('handles favorite button click', () => {
    const { container } = render(
      <KingProductCard product={mockProduct as WooProduct} />
    );

    const favoriteButton = container.querySelector(
      'button[data-testid="favorite-button"]'
    );
    expect(favoriteButton).toBeInTheDocument();

    if (favoriteButton) {
      fireEvent.click(favoriteButton);
    }
  });

  it('shows out of stock when product is out of stock', () => {
    const outOfStockProduct = {
      ...(mockProduct as WooProduct),
      stock_status: 'outofstock',
    } as WooProduct;
    render(<KingProductCard product={outOfStockProduct} />);

    expect(screen.getByText('Brak w magazynie')).toBeInTheDocument();
  });

  it('renders product link correctly', () => {
    render(<KingProductCard product={mockProduct as WooProduct} />);

    const productLink = screen.getByRole('link');
    expect(productLink).toHaveAttribute('href', '/produkt/test-product');
  });
});
