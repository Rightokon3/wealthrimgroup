import nodemailer from 'nodemailer';

// Server-only — uses the Gmail app password from .env.local.
// Never import this into a 'use client' component.
export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(to: string, name: string, link: string) {
  await mailer.sendMail({
    from: `"Rider App" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Verify your email to start riding',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color:#111;">
        <h2 style="margin-bottom:4px;">Hi ${name},</h2>
        <p>Thanks for signing up as a rider. Verify your email to activate your account.</p>
        <p style="margin: 24px 0;">
          <a href="${link}"
             style="background: linear-gradient(to right, #22c55e, #059669); color: #fff;
                    padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; display:inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color:#666; font-size:13px;">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        <p style="color:#999; font-size:12px; word-break:break-all;">Or paste this into your browser: ${link}</p>
      </div>
    `,
  });
}

export async function sendVendorNotificationEmail(to: string, title: string, message: string) {
  await mailer.sendMail({
    from: `"Drovo" <${process.env.GMAIL_USER}>`,
    to,
    subject: title,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color:#111;">
        <h2 style="margin-bottom:8px;">${title}</h2>
        <p>${message}</p>
        <p style="color:#999; font-size:12px; margin-top:24px;">
          You're receiving this because you have a vendor account on Drovo.
        </p>
      </div>
    `,
  });
}