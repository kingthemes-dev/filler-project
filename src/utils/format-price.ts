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
