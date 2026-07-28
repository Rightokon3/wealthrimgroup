import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mailer } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  try {
    const { data: profileRow, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .maybeSingle();

    if (pErr) throw new Error(pErr.message);

    // Don't reveal whether the email exists — respond success either way.
    if (!profileRow) {
      return NextResponse.json({ sent: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour — shorter than email verification

    const { error: dbErr } = await supabaseAdmin.from('password_resets').insert([{
      user_id: profileRow.id,
      token,
      expires_at: expiresAt.toISOString(),
    }]);
    if (dbErr) throw new Error(dbErr.message);

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://wealthrimgroup.netlify.app').replace(/\/$/, '');
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

    await mailer.sendMail({
      from: `"Drovo" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset your Drovo password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color:#ea580c;">Reset your password</h2>
          <p style="color:#333; font-size:15px; line-height:1.5;">
            ${profileRow.full_name ? `Hi ${profileRow.full_name}, ` : ''}we received a request to reset your Drovo password.
          </p>
          <a href="${resetLink}"
             style="display:inline-block; margin: 16px 0; padding:12px 28px; background:#ea580c; color:#fff;
                    text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px;">
            Reset Password
          </a>
          <p style="color:#888; font-size:12px; margin-top:24px;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to send reset email' }, { status: 500 });
  }
}