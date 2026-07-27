import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mailer } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://https://wealthrimgroup.netlify.app/0').replace(/\/$/, '');

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/auth/verify-result?status=invalid`);
  }

  const { data: record } = await supabaseAdmin
    .from('email_verifications')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!record) {
    return NextResponse.redirect(`${baseUrl}/auth/verify-result?status=invalid`);
  }
  if (record.verified_at) {
    return NextResponse.redirect(`${baseUrl}/auth/verify-result?status=already`);
  }
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.redirect(`${baseUrl}/auth/verify-result?status=expired`);
  }

  await supabaseAdmin
    .from('email_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('token', token);

  await supabaseAdmin
    .from('profiles')
    .update({ email_verified: true })
    .eq('id', record.user_id);

  // Fire the welcome email — best-effort, don't block the redirect on it.
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(record.user_id);
    const email = authUser?.user?.email;

    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', record.user_id)
      .maybeSingle();

    if (email) {
      await mailer.sendMail({
        from: `"Drovo" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Drovo! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color:#ea580c;">You're verified${profileRow?.full_name ? `, ${profileRow.full_name}` : ''}!</h2>
            <p style="color:#333; font-size:15px; line-height:1.5;">
              Welcome to Drovo — your account is now active. Start exploring food, fashion, and real estate listings near you.
            </p>
            <a href="${baseUrl}"
               style="display:inline-block; margin: 16px 0; padding:12px 28px; background:#ea580c; color:#fff;
                      text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px;">
              Go to Drovo
            </a>
          </div>
        `,
      });
    }
  } catch (err) {
    console.warn('Welcome email failed:', err);
  }

  return NextResponse.redirect(`${baseUrl}/auth/verify-result?status=success`);
}