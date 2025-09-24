// Validation utilities

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// NIP validation (Polish Tax Identification Number)
export function validateNIP(nip: string): ValidationResult {
  if (!nip) {
    return { isValid: true }; // NIP is optional
  }

  // Remove spaces and dashes
  const cleanNip = nip.replace(/[\s-]/g, '');
  
  // Check if it's 10 digits
  if (!/^\d{10}$/.test(cleanNip)) {
    return {
      isValid: false,
      message: 'NIP musi składać się z 10 cyfr'
    };
  }

  // NIP checksum validation
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i]) * weights[i];
  }
  
  const checksum = sum % 11;
  const lastDigit = parseInt(cleanNip[9]);
  
  if (checksum !== lastDigit) {
    return {
      isValid: false,
      message: 'Nieprawidłowy NIP - błąd w sumie kontrolnej'
    };
  }

  return { isValid: true };
}

// Phone validation (Polish format)
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }

  // Remove spaces, dashes, parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Polish phone number patterns
  const patterns = [
    /^\+48\d{9}$/,           // +48123456789
    /^48\d{9}$/,             // 48123456789
    /^0\d{9}$/,              // 0123456789
    /^\d{9}$/                // 123456789
  ];

  const isValid = patterns.some(pattern => pattern.test(cleanPhone));
  
  if (!isValid) {
    return {
      isValid: false,
      message: 'Nieprawidłowy numer telefonu (format: +48 123 456 789 lub 123 456 789)'
    };
  }

  return { isValid: true };
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return {
      isValid: false,
      message: 'Email jest wymagany'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Nieprawidłowy format adresu email'
    };
  }

  return { isValid: true };
}

// Name validation
export function validateName(name: string, fieldName: string): ValidationResult {
  if (!name || name.trim().length < 2) {
    return {
      isValid: false,
      message: `${fieldName} musi mieć co najmniej 2 znaki`
    };
  }

  if (name.trim().length > 50) {
    return {
      isValid: false,
      message: `${fieldName} może mieć maksymalnie 50 znaków`
    };
  }

  return { isValid: true };
}

// Company name validation
export function validateCompanyName(company: string): ValidationResult {
  if (!company) {
    return { isValid: true }; // Company is optional
  }

  if (company.trim().length < 2) {
    return {
      isValid: false,
      message: 'Nazwa firmy musi mieć co najmniej 2 znaki'
    };
  }

  if (company.trim().length > 100) {
    return {
      isValid: false,
      message: 'Nazwa firmy może mieć maksymalnie 100 znaków'
    };
  }

  return { isValid: true };
}

// Address validation
export function validateAddress(address: string, fieldName: string): ValidationResult {
  if (!address) {
    return { isValid: true }; // Address is optional
  }

  if (address.trim().length < 5) {
    return {
      isValid: false,
      message: `${fieldName} musi mieć co najmniej 5 znaków`
    };
  }

  if (address.trim().length > 200) {
    return {
      isValid: false,
      message: `${fieldName} może mieć maksymalnie 200 znaków`
    };
  }

  return { isValid: true };
}

// Postal code validation (Polish format)
export function validatePostalCode(postcode: string): ValidationResult {
  if (!postcode) {
    return { isValid: true }; // Postal code is optional
  }

  const cleanPostcode = postcode.replace(/\s/g, '');
  const polishPostcodeRegex = /^\d{2}-\d{3}$/;
  
  if (!polishPostcodeRegex.test(cleanPostcode)) {
    return {
      isValid: false,
      message: 'Nieprawidłowy kod pocztowy (format: 12-345)'
    };
  }

  return { isValid: true };
}

// Format NIP for display
export function formatNIP(nip: string): string {
  if (!nip) return '';
  
  const cleanNip = nip.replace(/[\s-]/g, '');
  if (cleanNip.length === 10) {
    return `${cleanNip.slice(0, 3)}-${cleanNip.slice(3, 6)}-${cleanNip.slice(6, 8)}-${cleanNip.slice(8)}`;
  }
  
  return nip;
}

// Format phone for display
export function formatPhone(phone: string): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleanPhone.startsWith('+48') && cleanPhone.length === 12) {
    return `+48 ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6, 9)} ${cleanPhone.slice(9)}`;
  }
  
  if (cleanPhone.startsWith('48') && cleanPhone.length === 11) {
    return `+48 ${cleanPhone.slice(2, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
  }
  
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  
  return phone;
}
