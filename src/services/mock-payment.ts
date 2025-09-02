// Mock Payment Service - Symulacja płatności do testowania
// TODO: Zastąpić prawdziwymi płatnościami gdy będą dostępne w WooCommerce

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  processingTime: number; // w milisekundach
  successRate: number; // 0-1 (100%)
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  method: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  processingTime: number;
  redirectUrl?: string;
}

export class MockPaymentService {
  private paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Karta kredytowa/debetowa',
      description: 'Visa, Mastercard, American Express',
      icon: '💳',
      processingTime: 3000,
      successRate: 0.95
    },
    {
      id: 'transfer',
      name: 'Przelew bankowy',
      description: 'Przelew online lub tradycyjny',
      icon: '🏦',
      processingTime: 5000,
      successRate: 0.98
    },
    {
      id: 'cash',
      name: 'Płatność przy odbiorze',
      description: 'Gotówka lub karta przy dostawie',
      icon: '💵',
      processingTime: 1000,
      successRate: 1.0
    }
  ];

  /**
   * Pobierz dostępne metody płatności
   */
  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods;
  }

  /**
   * Symuluj proces płatności
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const method = this.paymentMethods.find(m => m.id === request.method);
    
    if (!method) {
      throw new Error('Nieznana metoda płatności');
    }

    // Symuluj czas przetwarzania
    await this.delay(method.processingTime);

    // Symuluj sukces/błąd na podstawie success rate
    const isSuccess = Math.random() < method.successRate;

    if (isSuccess) {
      return {
        success: true,
        transactionId: this.generateTransactionId(),
        status: 'completed',
        message: 'Płatność zrealizowana pomyślnie',
        processingTime: method.processingTime
      };
    } else {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        status: 'failed',
        message: 'Płatność nie została zrealizowana. Spróbuj ponownie.',
        processingTime: method.processingTime
      };
    }
  }

  /**
   * Symuluj walidację karty kredytowej
   */
  async validateCard(cardNumber: string, expiryMonth: string, expiryYear: string, cvv: string): Promise<boolean> {
    // Symuluj walidację
    await this.delay(1000);

    // Proste sprawdzenie formatu
    const isValidFormat = 
      cardNumber.length >= 13 && 
      cardNumber.length <= 19 &&
      parseInt(expiryMonth) >= 1 && 
      parseInt(expiryMonth) <= 12 &&
      parseInt(expiryYear) >= new Date().getFullYear() &&
      cvv.length >= 3 && 
      cvv.length <= 4;

    if (!isValidFormat) {
      return false;
    }

    // Symuluj błąd walidacji (10% szans)
    return Math.random() > 0.1;
  }

  /**
   * Symuluj sprawdzenie salda karty
   */
  async checkCardBalance(cardNumber: string, amount: number): Promise<boolean> {
    await this.delay(800);
    
    // Symuluj sprawdzenie salda (90% szans na wystarczające saldo)
    return Math.random() > 0.1;
  }

  /**
   * Symuluj autoryzację płatności
   */
  async authorizePayment(amount: number, method: string): Promise<boolean> {
    await this.delay(1200);
    
    // Symuluj autoryzację (95% szans na sukces)
    return Math.random() > 0.05;
  }

  /**
   * Symuluj potwierdzenie płatności
   */
  async confirmPayment(transactionId: string): Promise<boolean> {
    await this.delay(500);
    
    // Symuluj potwierdzenie (99% szans na sukces)
    return Math.random() > 0.01;
  }

  /**
   * Symuluj zwrot pieniędzy
   */
  async refundPayment(transactionId: string, amount: number): Promise<PaymentResponse> {
    await this.delay(2000);
    
    return {
      success: true,
      transactionId: this.generateTransactionId(),
      status: 'completed',
      message: 'Zwrot został przetworzony pomyślnie',
      processingTime: 2000
    };
  }

  /**
   * Pobierz status płatności
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    await this.delay(500);
    
    // Symuluj różne statusy
    const statuses: Array<'pending' | 'processing' | 'completed' | 'failed'> = 
      ['pending', 'processing', 'completed', 'failed'];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: randomStatus === 'completed',
      transactionId,
      status: randomStatus,
      message: this.getStatusMessage(randomStatus),
      processingTime: 500
    };
  }

  /**
   * Generuj unikalny ID transakcji
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Symuluj opóźnienie
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Pobierz wiadomość dla statusu
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'pending':
        return 'Płatność oczekuje na przetworzenie';
      case 'processing':
        return 'Płatność jest przetwarzana';
      case 'completed':
        return 'Płatność została zrealizowana';
      case 'failed':
        return 'Płatność nie powiodła się';
      default:
        return 'Nieznany status płatności';
    }
  }

  /**
   * Symuluj błędy płatności
   */
  async simulatePaymentError(errorType: string): Promise<PaymentResponse> {
    await this.delay(1000);
    
    const errorMessages = {
      'insufficient_funds': 'Niewystarczające saldo na karcie',
      'card_expired': 'Karta wygasła',
      'invalid_cvv': 'Nieprawidłowy kod CVV',
      'card_declined': 'Karta została odrzucona',
      'network_error': 'Błąd sieci. Spróbuj ponownie.',
      'timeout': 'Przekroczono limit czasu. Spróbuj ponownie.'
    };

    return {
      success: false,
      transactionId: this.generateTransactionId(),
      status: 'failed',
      message: errorMessages[errorType as keyof typeof errorMessages] || 'Nieznany błąd płatności',
      processingTime: 1000
    };
  }
}

// Export singleton instance
export const mockPaymentService = new MockPaymentService();
export default mockPaymentService;
