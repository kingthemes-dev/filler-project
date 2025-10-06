/**
 * Formatuje cenę w formacie PLN (wejście w złotówkach)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Oblicza cenę z VAT (23% VAT w Polsce)
 */
export function calculatePriceWithVAT(priceWithoutVAT: number): number {
  return priceWithoutVAT * 1.23;
}

/**
 * Formatuje cenę z VAT
 */
export function formatPriceWithVAT(priceWithoutVAT: number): string {
  return formatPrice(calculatePriceWithVAT(priceWithoutVAT)) + ' (z VAT)';
}

/**
 * Formatuje cenę bez VAT
 */
export function formatPriceWithoutVAT(priceWithoutVAT: number): string {
  return formatPrice(priceWithoutVAT) + ' (netto)';
}

/**
 * Zwraca cenę jako string z dwoma miejscami po przecinku, bez symbolu waluty (wejście w złotówkach)
 */
export function formatPriceWithoutCurrency(price: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formatuje cenę z promocją (wejście w złotówkach)
 */
export function formatPriceWithDiscount(regularPrice: number, salePrice: number) {
  return {
    regular: formatPrice(regularPrice),
    sale: formatPrice(salePrice),
    discount: Math.round(((regularPrice - salePrice) / regularPrice) * 100),
  };
}
