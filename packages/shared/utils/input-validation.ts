/**
 * Comprehensive input validation utilities
 */

import { CustomError, ERROR_CODES } from './error-handler';
import { ValidationResult, validateEmail, validateNIP, validatePassword, validatePhone, validatePostalCode } from './validation';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// ValidationResult is now imported from validation.ts to avoid duplication

// Common validation patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PL: /^(\+48|48|0)?\d{9}$/,
  NIP: /^\d{10}$/,
  POSTAL_CODE_PL: /^\d{2}-\d{3}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  NO_HTML: /^[^<>]*$/
} as const;

// Sanitization functions
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

// Validation functions
// validateEmail is now imported from validation.ts to avoid duplication

// validatePhone is now imported from validation.ts to avoid duplication

// validateNIP is now imported from validation.ts to avoid duplication

// validatePostalCode is now imported from validation.ts to avoid duplication

// validatePassword is now imported from validation.ts to avoid duplication

export function validateNoHTML(input: string): boolean {
  return PATTERNS.NO_HTML.test(input);
}

// Main validation function
export function validateInput(data: any, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitizedData: any = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `Pole ${field} jest wymagane`;
      continue;
    }

    // Skip validation if value is empty and not required
    if (!value && !rules.required) {
      sanitizedData[field] = value;
      continue;
    }

    let sanitizedValue = value;

    // Sanitization
    if (rules.sanitize !== false) {
      if (typeof value === 'string') {
        sanitizedValue = sanitizeString(value);
      }
    }

    // Length validation
    if (typeof sanitizedValue === 'string') {
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors[field] = `Pole ${field} musi mieć co najmniej ${rules.minLength} znaków`;
        continue;
      }
      
      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors[field] = `Pole ${field} może mieć maksymalnie ${rules.maxLength} znaków`;
        continue;
      }
    }

    // Pattern validation
    if (rules.pattern && typeof sanitizedValue === 'string') {
      if (!rules.pattern.test(sanitizedValue)) {
        errors[field] = `Pole ${field} ma nieprawidłowy format`;
        continue;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(sanitizedValue);
      if (customResult !== true) {
        errors[field] = typeof customResult === 'string' ? customResult : `Pole ${field} jest nieprawidłowe`;
        continue;
      }
    }

    sanitizedData[field] = sanitizedValue;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS = {
  REGISTRATION: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true
    },
    email: {
      required: true,
      custom: (value: string) => validateEmail(value) || 'Nieprawidłowy format email',
      sanitize: true
    },
    phone: {
      required: false,
      custom: (value: string) => !value || validatePhone(value) || 'Nieprawidłowy format telefonu',
      sanitize: true
    },
    password: {
      required: true,
      minLength: 8,
      custom: (value: string) => validatePassword(value) || 'Hasło musi zawierać co najmniej 8 znaków, w tym wielką literę, małą literę i cyfrę'
    }
  },

  PROFILE_UPDATE: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/,
      sanitize: true
    },
    company: {
      required: false,
      minLength: 2,
      maxLength: 100,
      sanitize: true
    },
    nip: {
      required: false,
      custom: (value: string) => !value || validateNIP(value) || 'Nieprawidłowy NIP',
      sanitize: true
    },
    phone: {
      required: false,
      custom: (value: string) => !value || validatePhone(value) || 'Nieprawidłowy format telefonu',
      sanitize: true
    },
    billingAddress: {
      required: false,
      minLength: 5,
      maxLength: 200,
      sanitize: true
    },
    billingCity: {
      required: false,
      minLength: 2,
      maxLength: 50,
      sanitize: true
    },
    billingPostcode: {
      required: false,
      custom: (value: string) => !value || validatePostalCode(value) || 'Nieprawidłowy kod pocztowy (format: 12-345)',
      sanitize: true
    }
  },

  NEWSLETTER: {
    email: {
      required: true,
      custom: (value: string) => validateEmail(value) || 'Nieprawidłowy format email',
      sanitize: true
    },
    consent: {
      required: true,
      custom: (value: boolean) => value === true || 'Wymagana zgoda na przetwarzanie danych'
    }
  }
} as const;

// API validation middleware
export function createValidationMiddleware(schema: ValidationSchema) {
  return (data: any) => {
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
