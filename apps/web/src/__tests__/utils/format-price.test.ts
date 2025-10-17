import { formatPrice } from '@/utils/format-price';

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
  });
});

