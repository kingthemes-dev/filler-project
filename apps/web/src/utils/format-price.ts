/**
 * Formatuje cenę w formacie PLN (wejście w złotówkach)
 * Bez separatorów tysięcy (np. 1999,00 zł zamiast 1 999,00 zł)
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (
    price === null ||
    price === undefined ||
    (typeof price === 'string' && price.trim() === '')
  ) {
    return '0,00 zł';
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return '0,00 zł';
  }

  // Format bez separatorów tysięcy, tylko z dwoma miejscami po przecinku
  const formatted = numPrice.toFixed(2).replace('.', ',');
  return `${formatted} zł`;
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
 * Bez separatorów tysięcy (np. 1999,00 zamiast 1 999,00)
 */
export function formatPriceWithoutCurrency(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

/**
 * Formatuje cenę z promocją (wejście w złotówkach)
 */
export function formatPriceWithDiscount(
  regularPrice: number,
  salePrice: number
) {
  return {
    regular: formatPrice(regularPrice),
    sale: formatPrice(salePrice),
    discount: Math.round(((regularPrice - salePrice) / regularPrice) * 100),
  };
}
