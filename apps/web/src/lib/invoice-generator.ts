import puppeteer from 'puppeteer';

export interface InvoiceData {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    billing: {
      address: string;
      city: string;
      postcode: string;
      country: string;
      nip?: string;
    };
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
  paymentMethod: string;
  invoiceNumber: string;
  invoiceDate: string;
}

export class InvoiceGenerator {
  private static instance: InvoiceGenerator;
  private invoiceCounter: number = 0;

  private constructor() {
    this.loadInvoiceCounter();
  }

  public static getInstance(): InvoiceGenerator {
    if (!InvoiceGenerator.instance) {
      InvoiceGenerator.instance = new InvoiceGenerator();
    }
    return InvoiceGenerator.instance;
  }

  private async loadInvoiceCounter(): Promise<void> {
    try {
      // In production, this would be stored in a database
      // For now, we'll use a simple file-based approach
      const fs = await import('fs/promises');
      try {
        const data = await fs.readFile('invoice-counter.json', 'utf-8');
        const parsed = JSON.parse(data);
        this.invoiceCounter = parsed.counter || 0;
      } catch {
        // File doesn't exist, start from 0
        this.invoiceCounter = 0;
      }
    } catch (error) {
      console.warn('Could not load invoice counter:', error);
      this.invoiceCounter = 0;
    }
  }

  private async saveInvoiceCounter(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile('invoice-counter.json', JSON.stringify({ counter: this.invoiceCounter }));
    } catch (error) {
      console.warn('Could not save invoice counter:', error);
    }
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    this.invoiceCounter++;
    const sequentialNumber = String(this.invoiceCounter).padStart(4, '0');
    
    // Save counter for next time
    this.saveInvoiceCounter();
    
    return `FV/${year}/${month}/${sequentialNumber}`;
  }

  public async generateInvoicePdf(orderData: any): Promise<Buffer> {
    const invoiceData = this.prepareInvoiceData(orderData);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      const html = this.generateInvoiceHtml(invoiceData);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      return pdf;
    } finally {
      await browser.close();
    }
  }

  private prepareInvoiceData(orderData: any): InvoiceData {
    const invoiceNumber = this.generateInvoiceNumber();
    const invoiceDate = new Date().toLocaleDateString('pl-PL');
    const orderDate = new Date(orderData.date_created).toLocaleDateString('pl-PL');
    
    // Calculate totals
    const subtotal = parseFloat(orderData.total) - parseFloat(orderData.total_tax || 0);
    const shipping = parseFloat(orderData.shipping_total || 0);
    const tax = parseFloat(orderData.total_tax || 0);
    const total = parseFloat(orderData.total);
    
    // Prepare items
    const items = orderData.line_items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
      totalPrice: parseFloat(item.total),
      taxRate: 23 // Default VAT rate for Poland
    }));
    
    return {
      orderId: orderData.id.toString(),
      orderNumber: orderData.number,
      orderDate,
      customer: {
        name: `${orderData.billing.first_name} ${orderData.billing.last_name}`,
        email: orderData.billing.email,
        phone: orderData.billing.phone,
        billing: {
          address: orderData.billing.address_1,
          city: orderData.billing.city,
          postcode: orderData.billing.postcode,
          country: orderData.billing.country,
          nip: orderData.billing.nip || undefined
        }
      },
      items,
      totals: {
        subtotal,
        shipping,
        tax,
        total
      },
      paymentMethod: orderData.payment_method_title || orderData.payment_method,
      invoiceNumber,
      invoiceDate
    };
  }

  private generateInvoiceHtml(data: InvoiceData): string {
    return `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Faktura ${data.invoiceNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
          }
          
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c3e50;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .company-details {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
          }
          
          .invoice-info {
            text-align: right;
            flex: 1;
          }
          
          .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .invoice-number {
            font-size: 18px;
            color: #e74c3c;
            font-weight: bold;
            margin-bottom: 20px;
          }
          
          .invoice-details {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
          }
          
          .invoice-details strong {
            color: #2c3e50;
          }
          
          .customer-section {
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
          }
          
          .customer-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .customer-details {
            font-size: 14px;
            line-height: 1.6;
          }
          
          .customer-details strong {
            color: #2c3e50;
            display: block;
            margin-bottom: 5px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .items-table th {
            background: #34495e;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
          }
          
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 14px;
          }
          
          .items-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .items-table tr:hover {
            background: #e8f4f8;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
          }
          
          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }
          
          .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 14px;
          }
          
          .totals-table .total-label {
            text-align: right;
            font-weight: bold;
            color: #2c3e50;
          }
          
          .totals-table .total-value {
            text-align: right;
            color: #2c3e50;
          }
          
          .grand-total {
            background: #2c3e50;
            color: white;
            font-weight: bold;
            font-size: 16px;
          }
          
          .grand-total .total-label,
          .grand-total .total-value {
            color: white;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          .payment-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #27ae60;
          }
          
          .payment-info strong {
            color: #27ae60;
          }
          
          @media print {
            body { margin: 0; }
            .invoice-container { max-width: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <div class="company-name">KingBrand Sp. z o.o.</div>
              <div class="company-details">
                ul. Przykładowa 123<br>
                00-001 Warszawa<br>
                NIP: 1234567890<br>
                Tel: +48 123 456 789<br>
                Email: info@kingbrand.pl
              </div>
            </div>
            
            <div class="invoice-info">
              <div class="invoice-title">FAKTURA VAT</div>
              <div class="invoice-number">${data.invoiceNumber}</div>
              <div class="invoice-details">
                <strong>Data wystawienia:</strong> ${data.invoiceDate}<br>
                <strong>Data sprzedaży:</strong> ${data.orderDate}<br>
                <strong>Numer zamówienia:</strong> ${data.orderNumber}
              </div>
            </div>
          </div>
          
          <!-- Customer Section -->
          <div class="customer-section">
            <div class="section-title">Dane nabywcy</div>
            <div class="customer-info">
              <div class="customer-details">
                <strong>Imię i nazwisko:</strong>
                ${data.customer.name}
                
                <strong>Email:</strong>
                ${data.customer.email}
                
                <strong>Telefon:</strong>
                ${data.customer.phone}
              </div>
              
              <div class="customer-details">
                <strong>Adres:</strong>
                ${data.customer.billing.address}<br>
                ${data.customer.billing.postcode} ${data.customer.billing.city}<br>
                ${data.customer.billing.country}
                ${data.customer.billing.nip ? `<br><strong>NIP:</strong> ${data.customer.billing.nip}` : ''}
              </div>
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Nazwa produktu</th>
                <th class="text-center" style="width: 15%;">Ilość</th>
                <th class="text-right" style="width: 15%;">Cena jednostkowa</th>
                <th class="text-right" style="width: 20%;">Wartość</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${item.unitPrice.toFixed(2)} zł</td>
                  <td class="text-right">${item.totalPrice.toFixed(2)} zł</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td class="total-label">Wartość netto:</td>
                <td class="total-value">${data.totals.subtotal.toFixed(2)} zł</td>
              </tr>
              <tr>
                <td class="total-label">Dostawa:</td>
                <td class="total-value">${data.totals.shipping.toFixed(2)} zł</td>
              </tr>
              <tr>
                <td class="total-label">VAT (23%):</td>
                <td class="total-value">${data.totals.tax.toFixed(2)} zł</td>
              </tr>
              <tr class="grand-total">
                <td class="total-label">RAZEM:</td>
                <td class="total-value">${data.totals.total.toFixed(2)} zł</td>
              </tr>
            </table>
          </div>
          
          <!-- Payment Info -->
          <div class="payment-info">
            <strong>Metoda płatności:</strong> ${data.paymentMethod}
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>Dziękujemy za zakupy w KingBrand!</p>
            <p>Faktura została wygenerowana automatycznie dnia ${data.invoiceDate}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
