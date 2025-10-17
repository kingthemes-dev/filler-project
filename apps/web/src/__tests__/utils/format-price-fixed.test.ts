import { formatPrice, calculatePriceWithVAT, formatPriceWithDiscount } from '@/utils/format-price';

describe('formatPrice', () => {
  it('formats price with zł suffix', () => {
    expect(formatPrice('99.99')).toBe('99,99 zł');
    expect(formatPrice('129.50')).toBe('129,50 zł');
    expect(formatPrice('0')).toBe('0,00 zł');
  });

  it('handles decimal places correctly', () => {
    expect(formatPrice('99.9')).toBe('99,90 zł');
    expect(formatPrice('99')).toBe('99,00 zł');
    expect(formatPrice('99.999')).toBe('100,00 zł');
  });

  it('handles string input', () => {
    expect(formatPrice('99.99')).toBe('99,99 zł');
    expect(formatPrice('0')).toBe('0,00 zł');
  });

  it('handles number input', () => {
    expect(formatPrice(99.99)).toBe('99,99 zł');
    expect(formatPrice(0)).toBe('0,00 zł');
  });

  it('handles edge cases', () => {
    expect(formatPrice('')).toBe('0,00 zł');
    expect(formatPrice(null as any)).toBe('0,00 zł');
    expect(formatPrice(undefined as any)).toBe('0,00 zł');
    expect(formatPrice('invalid')).toBe('0,00 zł');
  });

  it('handles negative numbers', () => {
    expect(formatPrice(-99.99)).toBe('-99,99 zł');
  });

  it('handles large numbers', () => {
    expect(formatPrice(9999.99)).toBe('9 999,99 zł');
  });
});

describe('calculatePriceWithVAT', () => {
  it('calculates VAT correctly', () => {
    expect(calculatePriceWithVAT(100)).toBe(123);
    expect(calculatePriceWithVAT(50)).toBe(61.5);
    expect(calculatePriceWithVAT(0)).toBe(0);
  });

  it('handles decimal input', () => {
    expect(calculatePriceWithVAT(99.99)).toBeCloseTo(122.9877, 2);
  });
});

describe('formatPriceWithDiscount', () => {
  it('formats discount correctly', () => {
    const result = formatPriceWithDiscount(100, 80);
    expect(result.regular).toBe('100,00 zł');
    expect(result.sale).toBe('80,00 zł');
    expect(result.discount).toBe(20);
  });

  it('handles zero discount', () => {
    const result = formatPriceWithDiscount(100, 100);
    expect(result.discount).toBe(0);
  });

  it('handles large discount', () => {
    const result = formatPriceWithDiscount(200, 50);
    expect(result.discount).toBe(75);
  });
});
