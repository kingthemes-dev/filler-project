export function httpErrorMessage(status?: number): string {
  switch (status) {
    case 401:
      return 'Sesja wygasła. Zaloguj się ponownie.';
    case 403:
      return 'Brak uprawnień do wykonania tej operacji.';
    case 404:
      return 'Nie znaleziono zasobu.';
    case 429:
      return 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.';
    case 500:
      return 'Błąd serwera. Spróbuj ponownie później.';
    default:
      return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
  }
}
