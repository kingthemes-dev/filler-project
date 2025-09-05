<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Potwierdzenie zamówienia</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: #000000;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 20px;
        }
        .greeting {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 20px;
        }
        .order-details {
            background: #f9f9f9;
            padding: 25px;
            margin: 25px 0;
            border-radius: 8px;
            border-left: 4px solid #000;
        }
        .order-details h3 {
            margin: 0 0 20px 0;
            color: #000;
            font-size: 20px;
        }
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .order-info:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .order-info .label {
            font-weight: bold;
            color: #666;
        }
        .order-info .value {
            color: #000;
        }
        .items-section {
            margin: 25px 0;
        }
        .items-section h4 {
            margin: 0 0 15px 0;
            color: #000;
            font-size: 18px;
        }
        .item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-name {
            flex: 1;
            font-weight: 500;
        }
        .item-details {
            text-align: right;
            color: #666;
        }
        .total-section {
            text-align: right;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #000;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #000;
        }
        .addresses {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 25px 0;
        }
        .address {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
        }
        .address h4 {
            margin: 0 0 15px 0;
            color: #000;
            font-size: 16px;
        }
        .address p {
            margin: 0;
            line-height: 1.5;
            color: #666;
        }
        .footer {
            background: #f9f9f9;
            padding: 30px 20px;
            text-align: center;
            border-top: 1px solid #eee;
        }
        .footer p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: #000;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cta-button:hover {
            background: #333;
        }
        @media (max-width: 600px) {
            .addresses {
                grid-template-columns: 1fr;
            }
            .order-info {
                flex-direction: column;
            }
            .order-info .value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FILLER</h1>
            <p>Potwierdzenie zamówienia</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Dziękujemy za zamówienie!
            </div>
            
            <p>Witaj <?php echo htmlspecialchars($data['customer_name']); ?>,</p>
            
            <p>Twoje zamówienie zostało złożone pomyślnie. Oto szczegóły:</p>
            
            <div class="order-details">
                <h3>Zamówienie #<?php echo htmlspecialchars($data['order_number']); ?></h3>
                
                <div class="order-info">
                    <span class="label">Data zamówienia:</span>
                    <span class="value"><?php echo htmlspecialchars($data['order_date']); ?></span>
                </div>
                
                <div class="order-info">
                    <span class="label">Metoda płatności:</span>
                    <span class="value"><?php echo htmlspecialchars($data['payment_method']); ?></span>
                </div>
                
                <div class="order-info">
                    <span class="label">Status:</span>
                    <span class="value">Przyjęte do realizacji</span>
                </div>
            </div>
            
            <div class="items-section">
                <h4>Produkty:</h4>
                <?php foreach ($data['items'] as $item): ?>
                <div class="item">
                    <div class="item-name"><?php echo htmlspecialchars($item['name']); ?></div>
                    <div class="item-details">
                        <?php echo htmlspecialchars($item['quantity']); ?> x <?php echo htmlspecialchars($item['price']); ?>
                    </div>
                </div>
                <?php endforeach; ?>
                
                <div class="total-section">
                    <div class="total-amount">
                        Razem: <?php echo htmlspecialchars($data['total']); ?>
                    </div>
                </div>
            </div>
            
            <div class="addresses">
                <div class="address">
                    <h4>Adres rozliczeniowy:</h4>
                    <p><?php echo htmlspecialchars($data['billing_address']); ?></p>
                </div>
                
                <div class="address">
                    <h4>Adres dostawy:</h4>
                    <p><?php echo htmlspecialchars($data['shipping_address']); ?></p>
                </div>
            </div>
            
            <p>Status zamówienia będziesz mógł śledzić w swoim koncie.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="<?php echo get_site_url(); ?>/moje-zamowienia" class="cta-button">
                    Sprawdź status zamówienia
                </a>
            </div>
            
            <p>W razie pytań, skontaktuj się z naszym działem obsługi klienta:</p>
            <ul>
                <li>Email: kontakt@<?php echo parse_url(get_site_url(), PHP_URL_HOST); ?></li>
                <li>Telefon: +48 XXX XXX XXX</li>
                <li>Godziny pracy: Pon-Pt 9:00-17:00</li>
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>FILLER - Profesjonalne produkty do pielęgnacji</strong></p>
            <p>Dziękujemy za zaufanie i wybór naszych produktów!</p>
            <p>© <?php echo date('Y'); ?> FILLER. Wszystkie prawa zastrzeżone.</p>
        </div>
    </div>
</body>
</html>
