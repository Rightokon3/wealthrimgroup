import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface OrderEmailData {
  vendorEmail:   string;
  vendorName:    string;
  storeName:     string;
  orderNumber:   string;
  orderId:       string;
  customerName:  string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity:  string;
  deliveryNote:  string | null;
  items: {
    name:     string;
    quantity: number;
    price:    number;
    subtotal: number;
  }[];
  subtotal:     number;
  deliveryFee:  number;
  platformFee:  number;
  vendorPayout: number;
  total:        number;
  paymentMethod: string;
  deliveryType: string;
}

export async function sendOrderNotificationEmail(data: OrderEmailData) {
  const isRealEstate = data.deliveryType === 'viewing';

  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
        ${item.quantity}× ${item.name}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:700;text-align:right;">
        ₦${item.subtotal.toLocaleString()}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#dc2626);border-radius:20px 20px 0 0;padding:32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">${isRealEstate ? '🏠' : '🛍️'}</div>
      <h1 style="color:white;font-size:24px;font-weight:900;margin:0 0 6px;">
        New ${isRealEstate ? 'Viewing Request' : 'Order'} Received!
      </h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">
        ${data.storeName} · ${data.orderNumber}
      </p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:32px;border-radius:0 0 20px 20px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <!-- Alert banner -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">🔔</span>
        <div>
          <p style="margin:0;font-weight:700;color:#9a3412;font-size:14px;">Action Required</p>
          <p style="margin:4px 0 0;color:#c2410c;font-size:13px;">
            Please confirm this ${isRealEstate ? 'viewing request' : 'order'} as soon as possible.
          </p>
        </div>
      </div>

      <!-- Customer details -->
      <h2 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 12px;">Customer Details</h2>
      <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">Name</td>
            <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Phone</td>
            <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.customerPhone}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">${isRealEstate ? 'Location' : 'Delivery Address'}</td>
            <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.deliveryAddress}, ${data.deliveryCity}</td>
          </tr>
          ${data.deliveryNote ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Note</td>
            <td style="padding:6px 0;font-size:13px;color:#f97316;font-weight:600;">${data.deliveryNote}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Payment</td>
            <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;text-transform:capitalize;">${data.paymentMethod.replace(/_/g, ' ')}</td>
          </tr>
        </table>
      </div>

      <!-- Order items -->
      <h2 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 12px;">
        ${isRealEstate ? 'Property Requested' : 'Items Ordered'}
      </h2>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;font-size:12px;font-weight:700;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
            <th style="padding:10px 12px;font-size:12px;font-weight:700;color:#6b7280;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <!-- Payout breakdown -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:900;color:#14532d;margin:0 0 12px;">💰 Your Earnings</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#15803d;">Order Subtotal</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">₦${data.subtotal.toLocaleString()}</td>
          </tr>
          ${!isRealEstate ? `
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#15803d;">Delivery Fee</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">₦${data.deliveryFee.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#dc2626;">Drovo Fee (10%)</td>
            <td style="padding:5px 0;font-size:13px;color:#dc2626;font-weight:600;text-align:right;">−₦${data.platformFee.toLocaleString()}</td>
          </tr>
          <tr style="border-top:2px solid #86efac;">
            <td style="padding:10px 0 0;font-size:16px;font-weight:900;color:#14532d;">You Receive</td>
            <td style="padding:10px 0 0;font-size:18px;font-weight:900;color:#16a34a;text-align:right;">₦${data.vendorPayout.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor/dashboard"
          style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#f97316,#dc2626);color:white;font-weight:900;font-size:15px;border-radius:14px;text-decoration:none;">
          View Order in Dashboard →
        </a>
      </div>

      <!-- Footer note -->
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0;">
        This email was sent to ${data.vendorEmail} because you have a store on Drovo.<br/>
        © ${new Date().getFullYear()} Drovo. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from:    `"Drovo Marketplace" <${process.env.GMAIL_USER}>`,
    to:      data.vendorEmail,
    subject: `🛍️ New ${isRealEstate ? 'Viewing Request' : 'Order'} — ${data.orderNumber} · ${data.storeName}`,
    html,
  });
}