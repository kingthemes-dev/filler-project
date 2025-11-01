import { formatPrice, calculatePriceWithVAT, formatPriceWithDiscount } from '@/utils/format-price';

describe('formatPrice', () => {
  it('formats price with zł suffix', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice('99.99'))).toBe('99,99 zł');
    expect(norm(formatPrice('129.50'))).toBe('129,50 zł');
    expect(norm(formatPrice('0'))).toBe('0,00 zł');
  });

  it('handles decimal places correctly', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice('99.9'))).toBe('99,90 zł');
    expect(norm(formatPrice('99'))).toBe('99,00 zł');
    expect(norm(formatPrice('99.999'))).toBe('100,00 zł');
  });

  it('handles string input', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice('99.99'))).toBe('99,99 zł');
    expect(norm(formatPrice('0'))).toBe('0,00 zł');
  });

  it('handles number input', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice(99.99))).toBe('99,99 zł');
    expect(norm(formatPrice(0))).toBe('0,00 zł');
  });

  it('handles edge cases', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice(''))).toBe('0,00 zł');
    expect(norm(formatPrice(null as any))).toBe('0,00 zł');
    expect(norm(formatPrice(undefined as any))).toBe('0,00 zł');
    expect(norm(formatPrice('invalid'))).toBe('0,00 zł');
  });

  it('handles negative numbers', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    expect(norm(formatPrice(-99.99))).toBe('-99,99 zł');
  });

  it('handles large numbers', () => {
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    // current implementation does not add thousands separator
    expect(norm(formatPrice(9999.99))).toBe('9999,99 zł');
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
    const norm = (s: string) => s.replace(/\u00A0/g, ' ');
    const result = formatPriceWithDiscount(100, 80);
    expect(norm(result.regular)).toBe('100,00 zł');
    expect(norm(result.sale)).toBe('80,00 zł');
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
