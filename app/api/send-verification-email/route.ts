import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mailer } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { userId, email, fullName } = await req.json();

  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
  }

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry

    const { error: dbErr } = await supabaseAdmin.from('email_verifications').insert([{
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    }]);
    if (dbErr) throw new Error(dbErr.message);

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const verifyLink = `${baseUrl}/api/verify-email?token=${token}`;

    await mailer.sendMail({
      from: `"Drovo" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Confirm your Drovo account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color:#ea580c;">Welcome to Drovo${fullName ? `, ${fullName}` : ''}!</h2>
          <p style="color:#333; font-size:15px; line-height:1.5;">
            Please confirm your email address to activate your account.
          </p>
          <a href="${verifyLink}"
             style="display:inline-block; margin: 16px 0; padding:12px 28px; background:#ea580c; color:#fff;
                    text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px;">
            Verify Email
          </a>
          <p style="color:#888; font-size:12px; margin-top:24px;">
            This link expires in 24 hours. If you didn't create a Drovo account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to send verification email' }, { status: 500 });
  }
}