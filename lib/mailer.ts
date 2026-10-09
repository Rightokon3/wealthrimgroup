import nodemailer from 'nodemailer';

// Server-only — uses the Gmail app password from your environment variables.
// Never import this into a 'use client' component.
//
// The app password must be set in EVERY place the app runs:
//   1. .env.local / .env          (your computer)
//   2. your hosting provider      (Vercel / Netlify / etc. -> Environment Variables, then redeploy)
//   3. Supabase -> Authentication -> Emails -> SMTP Settings (customer signup emails)

type Role = 'rider' | 'vendor' | 'customer';

const GMAIL_USER = process.env.GMAIL_USER;
// Google shows app passwords in 4 groups with spaces; spaces are removed to be safe
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s+/g, '');

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// ── helpers ────────────────────────────────────────────────────────────────
const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function send(opts: { to: string; subject: string; html: string }) {
  if (!GMAIL_USER || !GMAIL_PASS) {
    const msg = 'Email is not configured: GMAIL_USER or GMAIL_APP_PASSWORD is missing on this server.';
    console.error('[mailer]', msg);
    throw new Error(msg);
  }

  try {
    await mailer.sendMail({ from: `"Drovo" <${GMAIL_USER}>`, ...opts });
  } catch (err: any) {
    // This line shows up in your server logs (terminal locally, "Logs" on your host)
    console.error('[mailer] send failed:', err?.code, err?.responseCode, err?.response ?? err?.message);

    if (err?.code === 'EAUTH' || err?.responseCode === 535) {
      throw new Error('Gmail rejected the login. The Gmail app password is wrong, revoked, or the 2-Step Verification was turned off.');
    }
    throw err;
  }
}

/** Quick health check used by /api/test-email */
export async function verifyMailer() {
  await mailer.verify();
}

const wrapper = (inner: string) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color:#111;">
    ${inner}
  </div>`;

const button = (href: string, label: string) => `
  <p style="margin: 24px 0;">
    <a href="${esc(href)}"
       style="background: linear-gradient(to right, #f97316, #dc2626); color: #fff;
              padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; display:inline-block;">
      ${esc(label)}
    </a>
  </p>`;

const roleCopy: Record<Role, { subject: string; intro: string }> = {
  rider:    { subject: 'Verify your email to start riding on Drovo', intro: 'Thanks for signing up as a rider. Verify your email to activate your account.' },
  vendor:   { subject: 'Verify your email to start selling on Drovo', intro: 'Thanks for signing up as a vendor. Verify your email to activate your store account.' },
  customer: { subject: 'Verify your email for Drovo',                 intro: 'Thanks for signing up. Verify your email to start ordering.' },
};

// ── emails ─────────────────────────────────────────────────────────────────
// `role` is optional so existing calls (rider signup) keep working unchanged.
export async function sendVerificationEmail(to: string, name: string, link: string, role: Role = 'rider') {
  const c = roleCopy[role];
  await send({
    to,
    subject: c.subject,
    html: wrapper(`
      <h2 style="margin-bottom:4px;">Hi ${esc(name)},</h2>
      <p>${c.intro}</p>
      ${button(link, 'Verify Email')}
      <p style="color:#666; font-size:13px;">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
      <p style="color:#999; font-size:12px; word-break:break-all;">Or paste this into your browser: ${esc(link)}</p>
    `),
  });
}

export async function sendVendorNotificationEmail(to: string, title: string, message: string) {
  await send({
    to,
    subject: title,
    html: wrapper(`
      <h2 style="margin-bottom:8px;">${esc(title)}</h2>
      <p>${esc(message)}</p>
      <p style="color:#999; font-size:12px; margin-top:24px;">
        You're receiving this because you have a vendor account on Drovo.
      </p>
    `),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, link: string, role: Role = 'rider') {
  await send({
    to,
    subject: 'Reset your Drovo password',
    html: wrapper(`
      <h2 style="margin-bottom:4px;">Hi ${esc(name)},</h2>
      <p>We received a request to reset your ${role} account password. Click the button below to choose a new one.</p>
      ${button(link, 'Reset Password')}
      <p style="color:#666; font-size:13px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
      <p style="color:#999; font-size:12px; word-break:break-all;">Or paste this into your browser: ${esc(link)}</p>
    `),
  });
}


// ── Order confirmation (sent to the customer right after they order) ──────
export interface OrderEmailData {
  orderNumber: string;
  storeName: string;
  items: { name: string; quantity: number; subtotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  deliveryType: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
}

const naira = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;

export async function sendOrderConfirmationEmail(to: string, name: string, o: OrderEmailData, ordersUrl: string) {
  const isViewing = o.deliveryType === 'viewing';
  const rows = o.items.map(i => `
    <tr>
      <td style="padding:6px 0;">${esc(String(i.quantity))}× ${esc(i.name)}</td>
      <td style="padding:6px 0; text-align:right; font-weight:700;">${naira(i.subtotal)}</td>
    </tr>`).join('');

  await send({
    to,
    subject: `${isViewing ? 'Viewing request' : 'Order'} ${o.orderNumber} confirmed — ${o.storeName}`,
    html: wrapper(`
      <h2 style="margin-bottom:4px;">Thank you, ${esc(name)}! 🎉</h2>
      <p>${isViewing ? 'Your viewing request has been sent to' : 'Your order has been sent to'} <strong>${esc(o.storeName)}</strong>.</p>
      <p style="font-size:13px; color:#666; margin:0;">Order number</p>
      <p style="font-family:monospace; font-weight:700; margin:2px 0 16px;">${esc(o.orderNumber)}</p>

      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        ${rows}
        <tr><td colspan="2" style="border-top:1px solid #eee; padding-top:8px;"></td></tr>
        <tr><td style="color:#666;">Subtotal</td><td style="text-align:right;">${naira(o.subtotal)}</td></tr>
        ${isViewing ? '' : `<tr><td style="color:#666;">Delivery</td><td style="text-align:right;">${naira(o.deliveryFee)}</td></tr>`}
        <tr><td style="font-weight:800; padding-top:6px;">Total</td><td style="text-align:right; font-weight:800; padding-top:6px;">${naira(o.total)}</td></tr>
      </table>

      <p style="font-size:14px; margin-top:16px;"><strong>Payment:</strong> ${esc(o.paymentMethod.replace(/_/g, ' '))}</p>
      ${o.deliveryAddress ? `<p style="font-size:14px; margin:4px 0;"><strong>${isViewing ? 'Your address' : 'Delivering to'}:</strong> ${esc(o.deliveryAddress)}${o.deliveryCity ? ', ' + esc(o.deliveryCity) : ''}</p>` : ''}

      ${button(ordersUrl, 'View my order')}
      <p style="color:#999; font-size:12px;">We'll notify you as your order progresses.</p>
    `),
  });
}


// ── Order status updates (sent to the customer every time the status changes) ──
const STATUS_EMAIL: Record<string, { emoji: string; subject: string; headline: string; text: string }> = {
  confirmed:  { emoji: '✅', subject: 'Your order has been confirmed',       headline: 'Order confirmed',       text: 'Good news! The vendor has confirmed your order and will start getting it ready.' },
  preparing:  { emoji: '👩‍🍳', subject: 'Your order is being prepared',       headline: 'Being prepared',        text: 'The vendor is now preparing your order.' },
  ready:      { emoji: '📦', subject: 'Your order is ready',                 headline: 'Ready for pickup',      text: 'Your order is ready. A rider will collect it shortly.' },
  picked_up:  { emoji: '🛵', subject: 'A rider has picked up your order',    headline: 'Picked up by rider',    text: 'Your rider has collected your order from the vendor.' },
  on_the_way: { emoji: '🚴', subject: 'Your order is on the way!',           headline: 'On the way',            text: 'Your order has been sent out for delivery. You can follow your rider live on the map.' },
  delivered:  { emoji: '🎉', subject: 'Your order has been delivered',       headline: 'Delivered',             text: 'Your order has arrived. Enjoy! We would love to hear what you think, so please leave a review.' },
  cancelled:  { emoji: '❌', subject: 'Your order has been cancelled',       headline: 'Order cancelled',       text: 'Your order has been cancelled. If you did not expect this, please contact the vendor or our support team.' },
  refunded:   { emoji: '💸', subject: 'Your order has been refunded',        headline: 'Order refunded',        text: 'Your order has been refunded. It can take a little while for the money to show in your account.' },
};

export function hasStatusEmail(status: string) {
  return status in STATUS_EMAIL;
}

export async function sendOrderStatusEmail(
  to: string,
  name: string,
  o: { orderNumber: string; storeName: string; status: string },
  link: string,
  linkLabel: string,
) {
  const c = STATUS_EMAIL[o.status];
  if (!c) return; // not a status customers are emailed about

  await send({
    to,
    subject: `${c.subject} — ${o.orderNumber}`,
    html: wrapper(`
      <div style="font-size:40px; line-height:1; margin-bottom:8px;">${c.emoji}</div>
      <h2 style="margin:0 0 4px;">${esc(c.headline)}</h2>
      <p style="margin:0 0 12px; color:#666; font-size:14px;">Hi ${esc(name)}, here is an update on your order from <strong>${esc(o.storeName)}</strong>.</p>
      <p style="font-size:15px;">${esc(c.text)}</p>
      <p style="font-size:13px; color:#666; margin:16px 0 0;">Order number</p>
      <p style="font-family:monospace; font-weight:700; margin:2px 0 0;">${esc(o.orderNumber)}</p>
      ${button(link, linkLabel)}
      <p style="color:#999; font-size:12px;">You are receiving this because you placed an order on Drovo.</p>
    `),
  });
}


// ── Order cancelled (+ refund) ────────────────────────────────────────────
export async function sendOrderCancelledEmail(
  to: string,
  name: string,
  o: {
    orderNumber: string;
    storeName: string;
    reason?: string | null;
    refundAmount: number | null;      // null = nothing was paid, so nothing to refund
    refundStatus: string | null;
    cancelledBy: string;
  },
  ordersUrl: string,
) {
  const who = o.cancelledBy === 'customer' ? 'You cancelled this order.' : 'We are sorry, this order was cancelled.';
  const refundOk = ['pending', 'processing', 'processed'].includes(o.refundStatus ?? '');

  const refundBlock = o.refundAmount == null
    ? `<p style="font-size:14px;">You were not charged for this order.</p>`
    : refundOk
      ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px 16px; margin:16px 0;">
           <p style="margin:0; font-weight:700; color:#166534;">Refund started: ${naira(o.refundAmount)}</p>
           <p style="margin:6px 0 0; font-size:13px; color:#166534;">The full amount, including delivery, is going back to the same card or bank account you paid with. It can take a few working days to show.</p>
         </div>`
      : `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:14px 16px; margin:16px 0;">
           <p style="margin:0; font-weight:700; color:#92400e;">Your refund of ${naira(o.refundAmount)} is being arranged</p>
           <p style="margin:6px 0 0; font-size:13px; color:#92400e;">Our team will process it shortly. You do not need to do anything.</p>
         </div>`;

  await send({
    to,
    subject: `Order ${o.orderNumber} cancelled${o.refundAmount != null ? ' and refund started' : ''}`,
    html: wrapper(`
      <h2 style="margin-bottom:4px;">Order cancelled</h2>
      <p style="color:#666; font-size:14px; margin:0 0 12px;">Hi ${esc(name)}, ${esc(who)}</p>
      <p style="font-size:14px; margin:0;">Order <strong style="font-family:monospace;">${esc(o.orderNumber)}</strong> from <strong>${esc(o.storeName)}</strong>.</p>
      ${o.reason ? `<p style="font-size:14px; margin:8px 0 0;"><strong>Reason:</strong> ${esc(o.reason)}</p>` : ''}
      ${refundBlock}
      ${button(ordersUrl, 'View my orders')}
    `),
  });
}

export async function sendRefundProcessedEmail(
  to: string,
  name: string,
  o: { orderNumber: string; amount: number },
  ordersUrl: string,
) {
  await send({
    to,
    subject: `Your refund for order ${o.orderNumber} has been processed`,
    html: wrapper(`
      <h2 style="margin-bottom:4px;">Refund processed</h2>
      <p style="color:#666; font-size:14px;">Hi ${esc(name)}, your refund of <strong>${naira(o.amount)}</strong> for order
        <strong style="font-family:monospace;">${esc(o.orderNumber)}</strong> has been processed and sent back to the card or bank account you paid with.
        Depending on your bank, it may take a few working days to appear.</p>
      ${button(ordersUrl, 'View my orders')}
    `),
  });
}