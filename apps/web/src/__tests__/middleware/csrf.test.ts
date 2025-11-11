import { shouldEnforceCsrf } from '@/middleware/csrf';

const ORIGINAL_ENV = process.env;

describe('shouldEnforceCsrf', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CSRF_FORCE_ENABLE;
    delete process.env.CSRF_FORCE_DISABLE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns true by default in production', () => {
    process.env.NODE_ENV = 'production';
    expect(shouldEnforceCsrf()).toBe(true);
  });

  it('returns false by default in development', () => {
    process.env.NODE_ENV = 'development';
    expect(shouldEnforceCsrf()).toBe(false);
  });

  it('force enables CSRF when CSRF_FORCE_ENABLE is true', () => {
    process.env.NODE_ENV = 'development';
    process.env.CSRF_FORCE_ENABLE = 'true';
    expect(shouldEnforceCsrf()).toBe(true);
  });

  it('force disables CSRF even in production when CSRF_FORCE_DISABLE is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.CSRF_FORCE_DISABLE = 'true';
    expect(shouldEnforceCsrf()).toBe(false);
  });
});

