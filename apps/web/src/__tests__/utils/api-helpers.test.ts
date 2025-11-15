import {
  buildApiUrl,
  sanitizeInput,
  validateEmail,
  formatError,
} from '@/utils/api-helpers';

describe('buildApiUrl', () => {
  it('builds correct API URL', () => {
    const baseUrl = 'https://api.example.com';
    const endpoint = 'products';
    const params = { page: 1, limit: 10 };

    const result = buildApiUrl(baseUrl, endpoint, params);
    expect(result).toBe('https://api.example.com/products?page=1&limit=10');
  });

  it('handles empty params', () => {
    const baseUrl = 'https://api.example.com';
    const endpoint = 'products';

    const result = buildApiUrl(baseUrl, endpoint);
    expect(result).toBe('https://api.example.com/products');
  });

  it('handles special characters in params', () => {
    const baseUrl = 'https://api.example.com';
    const endpoint = 'search';
    const params = { q: 'test & query', category: 'beauty/cosmetics' };

    const result = buildApiUrl(baseUrl, endpoint, params);
    // Accept '+' or '%20' for spaces depending on encoder
    expect(result).toMatch(/q=test(%20|\+)%26(%20|\+)query/);
    expect(result).toContain('category=beauty%2Fcosmetics');
  });
});

describe('sanitizeInput', () => {
  it('removes HTML tags', () => {
    expect(sanitizeInput('<script>alert("test")</script>')).toBe(
      'alert("test")'
    );
    expect(sanitizeInput('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
    expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
  });

  it('handles empty input', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
  });

  it('handles special characters', () => {
    expect(sanitizeInput('test@#$%^&*()')).toBe('test@#$%^&*()');
  });
});

describe('validateEmail', () => {
  it('validates correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    expect(validateEmail('test+tag@example.org')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});

describe('formatError', () => {
  it('formats error objects', () => {
    const error = new Error('Test error');
    const result = formatError(error);

    expect(result.message).toBe('Test error');
    expect(result.timestamp).toBeDefined();
    expect(result.type).toBe('Error');
  });

  it('handles string errors', () => {
    const result = formatError('String error');

    expect(result.message).toBe('String error');
    expect(result.type).toBe('string');
  });

  it('handles unknown errors', () => {
    const result = formatError(null);

    expect(result.message).toBe('Unknown error');
    expect(result.type).toBe('unknown');
  });

  it('includes stack trace for Error objects', () => {
    const error = new Error('Test error');
    const result = formatError(error);

    expect(result.stack).toBeDefined();
  });
});
