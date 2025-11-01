import { formatPrice } from '@/utils/format-price';

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
  });
});

