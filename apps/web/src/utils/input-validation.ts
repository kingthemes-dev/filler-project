import { sanitizeInput as sanitizePrimitive } from './api-helpers';
import { CustomError, ERROR_CODES } from './error-handler';

/**
 * Comprehensive input validation utilities
 */

type CustomValidator = (value: unknown) => boolean | string;

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: CustomValidator;
  sanitize?: boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, unknown>;
}

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PL: /^(\+48|48|0)?\d{9}$/,
  NIP: /^\d{10}$/,
  POSTAL_CODE_PL: /^\d{2}-\d{3}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  NO_HTML: /^[^<>]*$/,
} as const;

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(input: string): string {
  return sanitizeString(input).toLowerCase();
}

export function sanitizePhone(input: string): string {
  return sanitizeString(input).replace(/[\s\-\(\)]/g, '');
}

export function sanitizeNIP(input: string): string {
  return sanitizeString(input).replace(/[\s-]/g, '');
}

export function validateEmail(email: string): boolean {
  return PATTERNS.EMAIL.test(email);
}

export function validatePhone(phone: string): boolean {
  const clean = sanitizePhone(phone);
  return PATTERNS.PHONE_PL.test(clean);
}

export function validateNIP(nip: string): boolean {
  const clean = sanitizeNIP(nip);
  if (!PATTERNS.NIP.test(clean)) return false;

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce(
    (acc, weight, index) => acc + weight * parseInt(clean[index], 10),
    0
  );
  const checksum = sum % 11;
  const lastDigit = parseInt(clean[9], 10);

  return checksum === lastDigit;
}

export function validatePostalCode(postcode: string): boolean {
  return PATTERNS.POSTAL_CODE_PL.test(sanitizeString(postcode));
}

export function validatePassword(password: string): boolean {
  return PATTERNS.PASSWORD.test(password);
}

export function validateNoHTML(input: string): boolean {
  return PATTERNS.NO_HTML.test(input);
}

export function validateInput(
  data: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, unknown> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (
      rules.required &&
      (!value || (typeof value === 'string' && !value.trim()))
    ) {
      errors[field] = `Pole ${field} jest wymagane`;
      continue;
    }

    if (
      (value === undefined || value === null || value === '') &&
      !rules.required
    ) {
      sanitizedData[field] = value;
      continue;
    }

    let sanitizedValue: unknown = value;

    if (rules.sanitize !== false) {
      if (typeof value === 'string') {
        sanitizedValue = sanitizeString(value);
      } else {
        sanitizedValue = sanitizePrimitive(
          value as string | number | boolean | null | undefined
        );
      }
    }

    if (typeof sanitizedValue === 'string') {
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors[field] =
          `Pole ${field} musi mieć co najmniej ${rules.minLength} znaków`;
        continue;
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors[field] =
          `Pole ${field} może mieć maksymalnie ${rules.maxLength} znaków`;
        continue;
      }

      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        errors[field] = `Pole ${field} ma nieprawidłowy format`;
        continue;
      }
    }

    if (rules.custom) {
      const customResult = rules.custom(sanitizedValue);
      if (customResult !== true) {
        errors[field] =
          typeof customResult === 'string'
            ? customResult
            : `Pole ${field} nie przeszło walidacji`;
        continue;
      }
    }

    sanitizedData[field] = sanitizedValue;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
}

export const VALIDATION_SCHEMAS = {
  REGISTRATION: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true,
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true,
    },
    email: {
      required: true,
      custom: (value: unknown) =>
        (typeof value === 'string' && validateEmail(value)) ||
        'Nieprawidłowy format email',
      sanitize: true,
    },
    phone: {
      required: false,
      custom: (value: unknown) =>
        typeof value !== 'string' ||
        value.length === 0 ||
        validatePhone(value) ||
        'Nieprawidłowy format telefonu',
      sanitize: true,
    },
    password: {
      required: true,
      minLength: 8,
      custom: (value: unknown) =>
        (typeof value === 'string' && validatePassword(value)) ||
        'Hasło musi zawierać co najmniej 8 znaków, w tym wielką literę, małą literę i cyfrę',
    },
  },

  PROFILE_UPDATE: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true,
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true,
    },
    company: {
      required: false,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    nip: {
      required: false,
      custom: (value: unknown) =>
        typeof value !== 'string' ||
        value.length === 0 ||
        validateNIP(value) ||
        'Nieprawidłowy NIP',
      sanitize: true,
    },
    phone: {
      required: false,
      custom: (value: unknown) =>
        typeof value !== 'string' ||
        value.length === 0 ||
        validatePhone(value) ||
        'Nieprawidłowy format telefonu',
      sanitize: true,
    },
    billingAddress: {
      required: false,
      minLength: 5,
      maxLength: 200,
      sanitize: true,
    },
    billingCity: {
      required: false,
      minLength: 2,
      maxLength: 50,
      sanitize: true,
    },
    billingPostcode: {
      required: false,
      custom: (value: unknown) =>
        typeof value !== 'string' ||
        value.length === 0 ||
        validatePostalCode(value) ||
        'Nieprawidłowy kod pocztowy (format: 12-345)',
      sanitize: true,
    },
  },

  NEWSLETTER: {
    email: {
      required: true,
      custom: (value: unknown) =>
        (typeof value === 'string' && validateEmail(value)) ||
        'Nieprawidłowy format email',
      sanitize: true,
    },
    consent: {
      required: true,
      custom: (value: unknown) =>
        value === true || 'Wymagana zgoda na przetwarzanie danych',
    },
  },
} as const;

export function createValidationMiddleware(schema: ValidationSchema) {
  return (data: Record<string, unknown>) => {
    const result = validateInput(data, schema);

    if (!result.isValid) {
      throw new CustomError(
        'Błędy walidacji',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        result.errors
      );
    }

    return result.sanitizedData;
  };
}

export default validateInput;
