import { sanitizeInput as sanitizePrimitive } from '@/utils/api-helpers';

export type UnknownRecord = Record<string, unknown>;

type SanitizableValue = unknown;

function deepSanitize<T extends SanitizableValue>(value: T): T {
  if (typeof value === 'string') {
    return sanitizePrimitive(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => deepSanitize(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as UnknownRecord).map(
      ([key, entryValue]) => [key, deepSanitize(entryValue)]
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function validateApiInput<T extends SanitizableValue>(payload: T): T {
  return deepSanitize(payload);
}

export function sanitizeHeaders(headers: UnknownRecord): UnknownRecord {
  const sanitized: UnknownRecord = {};
  Object.entries(headers).forEach(([key, value]) => {
    sanitized[key] =
      typeof value === 'string' ? sanitizePrimitive(value) : value;
  });
  return sanitized;
}

export function sanitizePayload<T extends SanitizableValue>(payload: T): T {
  return deepSanitize(payload);
}
