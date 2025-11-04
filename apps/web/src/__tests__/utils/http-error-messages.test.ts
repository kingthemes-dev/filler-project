import { httpErrorMessage } from '@/utils/error-messages';

describe('httpErrorMessage', () => {
  it('maps common statuses to Polish messages', () => {
    expect(httpErrorMessage(401)).toMatch(/Zaloguj się ponownie/);
    expect(httpErrorMessage(403)).toMatch(/Brak uprawnień/);
    expect(httpErrorMessage(404)).toMatch(/Nie znaleziono/);
    expect(httpErrorMessage(429)).toMatch(/Zbyt wiele/);
    expect(httpErrorMessage(500)).toMatch(/błąd/i);
    expect(typeof httpErrorMessage(undefined)).toBe('string');
  });
});
