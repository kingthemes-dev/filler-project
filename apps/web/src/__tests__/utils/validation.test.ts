import {
  validateNIP,
  validatePhone,
  validateEmail,
  validateName,
  validateAddress,
  validatePostalCode,
  validatePassword,
  validateConfirmPassword as validateConfirm,
  formatNIP,
  formatPhone,
} from '@/utils/validation';

describe('validation utils', () => {
  test('validateNIP accepts valid and rejects invalid', () => {
    // Valid NIP with checksum 7 as last digit (constructed example)
    expect(validateNIP('0000000017').isValid).toBe(true);
    expect(validateNIP('1234567890').isValid).toBe(false);
    expect(validateNIP('').isValid).toBe(true);
  });

  test('validatePhone supports common Polish formats', () => {
    expect(validatePhone('+48123456789').isValid).toBe(true);
    expect(validatePhone('48123456789').isValid).toBe(true);
    expect(validatePhone('0123456789').isValid).toBe(true);
    expect(validatePhone('123456789').isValid).toBe(true);
    expect(validatePhone('abc').isValid).toBe(false);
  });

  test('validateEmail basics', () => {
    expect(validateEmail('test@example.com').isValid).toBe(true);
    expect(validateEmail('bad@domain').isValid).toBe(false);
    expect(validateEmail('').isValid).toBe(false);
  });

  test('validateName, address, postcode, password, confirm', () => {
    expect(validateName('Jan', 'Imię').isValid).toBe(true);
    expect(validateName('J', 'Imię').isValid).toBe(false);

    expect(validateAddress('ul. Testowa 1', 'Adres').isValid).toBe(true);
    expect(validateAddress('  ', 'Adres').isValid).toBe(false);

    expect(validatePostalCode('01-234').isValid).toBe(true);
    expect(validatePostalCode('01234').isValid).toBe(false);

    expect(validatePassword('Aa!23456').isValid).toBe(true);
    expect(validatePassword('short').isValid).toBe(false);

    expect(validateConfirm('Secret123!', 'Secret123!').isValid).toBe(true);
    expect(validateConfirm('a', 'b').isValid).toBe(false);
  });

  test('format helpers', () => {
    expect(formatNIP('000-000-00-17'.replace(/-/g, ''))).toBe('000-000-00-17');
    expect(formatPhone('+48123456789')).toBe('+48 123 456 789');
  });
});
