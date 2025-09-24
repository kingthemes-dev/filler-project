// Email Service - System powiadomień email
// Integracja z WordPress Email System via REST API

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  toName: string;
  template: string;
  variables: Record<string, string | number | boolean>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  messageId: string;
  status: 'sent' | 'delivered' | 'failed';
  message: string;
  sentAt: Date;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  billingAddress: {
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
}

export class EmailService {
  private baseUrl: string;
  private emailTemplates: Map<string, EmailTemplate> = new Map();
  private sentEmails: EmailResponse[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'http://localhost:3001';
    this.initializeTemplates();
  }

  /**
   * Inicjalizuj szablony email
   */
  private initializeTemplates() {
    // Order Confirmation Template
    this.emailTemplates.set('order_confirmation', {
      id: 'order_confirmation',
      name: 'Potwierdzenie zamówienia',
      subject: 'Potwierdzenie zamówienia #{orderNumber} - FILLER',
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potwierdzenie zamówienia</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FILLER</h1>
              <p>Potwierdzenie zamówienia</p>
            </div>
            
            <div class="content">
              <h2>Dziękujemy za zamówienie!</h2>
              <p>Witaj {customerName},</p>
              <p>Twoje zamówienie zostało złożone pomyślnie. Oto szczegóły:</p>
              
              <div class="order-details">
                <h3>Zamówienie #{orderNumber}</h3>
                <p><strong>Data:</strong> {orderDate}</p>
                <p><strong>Metoda płatności:</strong> {paymentMethod}</p>
                
                <h4>Produkty:</h4>
                {items}
                
                <div class="total">
                  <strong>Razem: {total} zł</strong>
                </div>
              </div>
              
              <div class="order-details">
                <h4>Adres rozliczeniowy:</h4>
                <p>{billingAddress}</p>
                
                <h4>Adres dostawy:</h4>
                <p>{shippingAddress}</p>
              </div>
              
              <p>Status zamówienia będziesz mógł śledzić w swoim koncie.</p>
              <p>W razie pytań, skontaktuj się z naszym działem obsługi klienta.</p>
            </div>
            
            <div class="footer">
              <p>FILLER - Profesjonalne produkty do pielęgnacji</p>
              <p>© 2024 FILLER. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Potwierdzenie zamówienia #{orderNumber} - FILLER
        
        Dziękujemy za zamówienie!
        
        Witaj {customerName},
        
        Twoje zamówienie zostało złożone pomyślnie. Oto szczegóły:
        
        Zamówienie #{orderNumber}
        Data: {orderDate}
        Metoda płatności: {paymentMethod}
        
        Produkty:
        {items}
        
        Razem: {total} zł
        
        Adres rozliczeniowy:
        {billingAddress}
        
        Adres dostawy:
        {shippingAddress}
        
        Status zamówienia będziesz mógł śledzić w swoim koncie.
        W razie pytań, skontaktuj się z naszym działem obsługi klienta.
        
        FILLER - Profesjonalne produkty do pielęgnacji
        © 2024 FILLER. Wszystkie prawa zastrzeżone.
      `
    });

    // Order Shipped Template
    this.emailTemplates.set('order_shipped', {
      id: 'order_shipped',
      name: 'Zamówienie wysłane',
      subject: 'Twoje zamówienie #{orderNumber} zostało wysłane - FILLER',
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zamówienie wysłane</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .tracking { background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4caf50; }
            .footer { text-align: center; margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FILLER</h1>
              <p>Zamówienie wysłane</p>
            </div>
            
            <div class="content">
              <h2>Twoje zamówienie zostało wysłane! 🚚</h2>
              <p>Witaj {customerName},</p>
              <p>Mamy przyjemność poinformować, że Twoje zamówienie #{orderNumber} zostało wysłane.</p>
              
              <div class="tracking">
                <h3>Numer śledzenia:</h3>
                <p><strong>{trackingNumber}</strong></p>
                <p>Możesz śledzić status przesyłki na stronie kuriera.</p>
              </div>
              
              <p>Przewidywany czas dostawy: 1-3 dni robocze</p>
              <p>W razie pytań, skontaktuj się z naszym działem obsługi klienta.</p>
            </div>
            
            <div class="footer">
              <p>FILLER - Profesjonalne produkty do pielęgnacji</p>
              <p>© 2024 FILLER. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Twoje zamówienie #{orderNumber} zostało wysłane! 🚚
        
        Witaj {customerName},
        
        Mamy przyjemność poinformować, że Twoje zamówienie #{orderNumber} zostało wysłane.
        
        Numer śledzenia: {trackingNumber}
        Możesz śledzić status przesyłki na stronie kuriera.
        
        Przewidywany czas dostawy: 1-3 dni robocze
        
        W razie pytań, skontaktuj się z naszym działem obsługi klienta.
        
        FILLER - Profesjonalne produkty do pielęgnacji
        © 2024 FILLER. Wszystkie prawa zastrzeżone.
      `
    });

    // Order Delivered Template
    this.emailTemplates.set('order_delivered', {
      id: 'order_delivered',
      name: 'Zamówienie dostarczone',
      subject: 'Twoje zamówienie #{orderNumber} zostało dostarczone - FILLER',
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zamówienie dostarczone</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .success { background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4caf50; }
            .footer { text-align: center; margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FILLER</h1>
              <p>Zamówienie dostarczone</p>
            </div>
            
            <div class="content">
              <h2>Twoje zamówienie zostało dostarczone! 🎉</h2>
              <p>Witaj {customerName},</p>
              <p>Mamy przyjemność poinformować, że Twoje zamówienie #{orderNumber} zostało dostarczone.</p>
              
              <div class="success">
                <h3>Dostawa zakończona pomyślnie!</h3>
                <p>Sprawdź czy wszystkie produkty są w porządku.</p>
                <p>W razie problemów, skontaktuj się z nami w ciągu 14 dni.</p>
              </div>
              
              <p>Dziękujemy za zakupy w FILLER!</p>
              <p>Mamy nadzieję, że produkty spełnią Twoje oczekiwania.</p>
            </div>
            
            <div class="footer">
              <p>FILLER - Profesjonalne produkty do pielęgnacji</p>
              <p>© 2024 FILLER. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Twoje zamówienie #{orderNumber} zostało dostarczone! 🎉
        
        Witaj {customerName},
        
        Mamy przyjemność poinformować, że Twoje zamówienie #{orderNumber} zostało dostarczone.
        
        Dostawa zakończona pomyślnie!
        Sprawdź czy wszystkie produkty są w porządku.
        W razie problemów, skontaktuj się z nami w ciągu 14 dni.
        
        Dziękujemy za zakupy w FILLER!
        Mamy nadzieję, że produkty spełnią Twoje oczekiwania.
        
        FILLER - Profesjonalne produkty do pielęgnacji
        © 2024 FILLER. Wszystkie prawa zastrzeżone.
      `
    });

    // Password Reset Template
    this.emailTemplates.set('password_reset', {
      id: 'password_reset',
      name: 'Reset hasła',
      subject: 'Reset hasła - FILLER',
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset hasła</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .button { display: inline-block; background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FILLER</h1>
              <p>Reset hasła</p>
            </div>
            
            <div class="content">
              <h2>Reset hasła</h2>
              <p>Witaj {customerName},</p>
              <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta.</p>
              <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
              
              <a href="{resetLink}" class="button">Ustaw nowe hasło</a>
              
              <p>Link jest ważny przez 24 godziny.</p>
              <p>Jeśli nie prosiłeś o reset hasła, zignoruj ten email.</p>
            </div>
            
            <div class="footer">
              <p>FILLER - Profesjonalne produkty do pielęgnacji</p>
              <p>© 2024 FILLER. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset hasła - FILLER
        
        Witaj {customerName},
        
        Otrzymaliśmy prośbę o reset hasła do Twojego konta.
        
        Kliknij poniższy link, aby ustawić nowe hasło:
        {resetLink}
        
        Link jest ważny przez 24 godziny.
        
        Jeżeli nie prosiłeś o reset hasła, zignoruj ten email.
        
        FILLER - Profesjonalne produkty do pielęgnacji
        © 2024 FILLER. Wszystkie prawa zastrzeżone.
      `
    });
  }

  /**
   * Wyślij email przez WordPress API
   */
  async sendEmail(emailData: EmailData): Promise<EmailResponse> {
    try {
      const template = this.emailTemplates.get(emailData.template);
      if (!template) {
        throw new Error(`Szablon email '${emailData.template}' nie istnieje`);
      }

      // Adapter: w produkcji możesz logować, ale nie wysyłamy testowego requestu.
      // Maile i tak wyśle WooCommerce po stronie WordPress.
      if (process.env.NODE_ENV === 'production') {
        console.log('[EmailService] Adapter mode: relying on WooCommerce emails');
        return {
          success: true,
          messageId: this.generateMessageId(),
          status: 'sent',
          message: 'Email zostanie wysłany przez WooCommerce (adapter)',
          sentAt: new Date(),
        };
      }

      // W dev zwracamy sukces bez sieci
      if (true) {
        const emailResponse: EmailResponse = {
          success: true,
          messageId: this.generateMessageId(),
          status: 'sent',
          message: 'DEV adapter: pomijam wywołanie WordPress',
          sentAt: new Date()
        };

        // Zapisz wysłany email
        this.sentEmails.push(emailResponse);

        console.log('📧 Email (adapter):', {
          to: emailData.to,
          template: emailData.template,
          messageId: emailResponse.messageId,
          sentAt: emailResponse.sentAt
      });

        return emailResponse;
      }

    } catch (error) {
      console.error('❌ Błąd wysyłania email przez WordPress:', error);
      
      const response: EmailResponse = {
        success: false,
        messageId: this.generateMessageId(),
        status: 'failed',
        message: error instanceof Error ? error.message : 'Nieznany błąd',
        sentAt: new Date()
      };

      return response;
    }
  }

  /**
   * Wyślij potwierdzenie zamówienia
   */
  async sendOrderConfirmation(orderData: OrderEmailData): Promise<EmailResponse> {
    const variables = {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      orderDate: orderData.orderDate,
      total: this.formatPrice(orderData.total),
      items: this.formatOrderItems(orderData.items),
      billingAddress: this.formatAddress(orderData.billingAddress),
      shippingAddress: this.formatAddress(orderData.shippingAddress),
      paymentMethod: orderData.paymentMethod
    };

    return this.sendEmail({
      to: orderData.customerEmail,
      toName: orderData.customerName,
      template: 'order_confirmation',
      variables
    });
  }

  /**
   * Wyślij powiadomienie o wysłaniu
   */
  async sendOrderShipped(orderData: OrderEmailData): Promise<EmailResponse> {
    if (!orderData.trackingNumber) {
      throw new Error('Brak numeru śledzenia dla wysłanego zamówienia');
    }

    const variables = {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      trackingNumber: orderData.trackingNumber
    };

    return this.sendEmail({
      to: orderData.customerEmail,
      toName: orderData.customerName,
      template: 'order_shipped',
      variables
    });
  }

  /**
   * Wyślij powiadomienie o dostarczeniu
   */
  async sendOrderDelivered(orderData: OrderEmailData): Promise<EmailResponse> {
    const variables = {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName
    };

    return this.sendEmail({
      to: orderData.customerEmail,
      toName: orderData.customerName,
      template: 'order_delivered',
      variables
    });
  }

  /**
   * Wyślij reset hasła
   */
  async sendPasswordReset(email: string, name: string, resetLink: string): Promise<EmailResponse> {
    const variables = {
      customerName: name,
      resetLink
    };

    return this.sendEmail({
      to: email,
      toName: name,
      template: 'password_reset',
      variables
    });
  }

  /**
   * Pobierz historię wysłanych emaili
   */
  getSentEmails(): EmailResponse[] {
    return [...this.sentEmails];
  }

  /**
   * Pobierz dostępne szablony
   */
  getTemplates(): EmailTemplate[] {
    return Array.from(this.emailTemplates.values());
  }

  /**
   * Przetwórz szablon z zmiennymi
   */
  private processTemplate(template: string, variables: Record<string, string | number | boolean>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return processed;
  }

  /**
   * Formatuj listę produktów
   */
  private formatOrderItems(items: Array<{ name: string; quantity: number; price: number; total: number }>): string {
    return items.map(item => 
      `<div class="item">
        <strong>${item.name}</strong> x ${item.quantity} = ${this.formatPrice(item.total)}
      </div>`
    ).join('');
  }

  /**
   * Formatuj adres
   */
  private formatAddress(address: { address: string; city: string; postcode: string; country: string }): string {
    return `${address.address}, ${address.city} ${address.postcode}, ${address.country}`;
  }

  /**
   * Formatuj cenę
   */
  private formatPrice(price: number): string {
    return `${(price / 100).toFixed(2)} zł`;
  }

  /**
   * Generuj unikalny ID wiadomości
   */
  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MSG-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Symuluj opóźnienie
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
