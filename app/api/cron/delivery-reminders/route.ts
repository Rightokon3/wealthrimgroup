import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToUser } from '@/lib/web-push-server';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { sendCustomerNoticeEmail } from '@/lib/mailer';

// Run this every 15-60 minutes (see the note in the chat). It does two things:
//  1) Reminds customers to confirm orders marked "delivered" (so the rider can be paid)
//  2) Releases earnings automatically once the waiting time (24h by default) has passed
//
// Protect it: set CRON_SECRET in your environment. The caller must send
//   Authorization: Bearer <CRON_SECRET>      (Vercel Cron does this automatically)

const MAX_REMINDERS = 6;
const FIRST_AFTER_MIN = 30;
const EVERY_HOURS = 4;

const MESSAGES = [
  'Your order was marked delivered. Did you get it? Tap "I received it" so your rider gets paid.',
  'Quick reminder: please confirm your order ____ if you received it. Your rider is waiting to be paid.',
  'Still waiting on you! If order ____ reached you, please confirm it. It takes one tap.',
  'Did order ____ arrive? Confirm it now, or tell us if there was a problem.',
  'Reminder: confirm order ____ so your rider and the vendor can be paid.',
  'Last reminder: order ____ will be completed automatically soon. If something is wrong, report it now.',
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const baseUrl = getBaseUrl(req);
  const out = { reminded: 0, autoReleased: 0 };

  // 1) Automatic release
  const { data: released } = await supabaseAdmin.rpc('auto_release_due');
  const releasedIds: string[] = (released ?? []) as string[];
  for (const id of releasedIds) {
    const { data: o } = await supabaseAdmin.from('orders').select('customer_id, order_number').eq('id', id).single();
    if (!o) continue;
    const body = `Order ${o.order_number} was completed automatically. If something was wrong, contact support.`;
    await Promise.allSettled([
      supabaseAdmin.from('notifications').insert({ user_id: o.customer_id, type: 'delivery_auto_confirmed', title: 'Order completed', body }),
      sendPushToUser(o.customer_id, { title: 'Order completed', body, url: '/orders' }),
    ]);
    out.autoReleased++;
  }

  // 2) Reminders
  const { data: waiting } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_id, delivered_at, delivery_reminder_count, last_delivery_reminder_at')
    .eq('status', 'delivered')
    .is('delivery_release_by', null)
    .is('dispute_reported_at', null)
    .not('delivered_at', 'is', null)
    .lt('delivery_reminder_count', MAX_REMINDERS);

  const now = Date.now();
  for (const o of waiting ?? []) {
    const count = o.delivery_reminder_count ?? 0;
    const since = count === 0
      ? now - new Date(o.delivered_at!).getTime()
      : now - new Date(o.last_delivery_reminder_at ?? o.delivered_at!).getTime();
    const due = count === 0 ? since >= FIRST_AFTER_MIN * 60_000 : since >= EVERY_HOURS * 3_600_000;
    if (!due) continue;

    // Claim it so two overlapping runs never send the same reminder twice
    const { data: claimed } = await supabaseAdmin
      .from('orders')
      .update({ delivery_reminder_count: count + 1, last_delivery_reminder_at: new Date().toISOString() })
      .eq('id', o.id).eq('delivery_reminder_count', count)
      .select('id').maybeSingle();
    if (!claimed) continue;

    const body = MESSAGES[count].replace('____', o.order_number);
    const title = count >= 4 ? 'Please confirm your delivery' : 'Did you get your order?';
    await Promise.allSettled([
      supabaseAdmin.from('notifications').insert({ user_id: o.customer_id, type: 'confirm_delivery', title, body }),
      sendPushToUser(o.customer_id, { title, body, url: '/orders' }),
      (count === 0 || count === 3) ? (async () => {
        const { data: cu } = await supabaseAdmin.auth.admin.getUserById(o.customer_id);
        const email = cu?.user?.email;
        if (email) await sendCustomerNoticeEmail(email, title, body, `${baseUrl}/orders`, 'Confirm my order');
      })() : Promise.resolve(),
    ]);
    out.reminded++;
  }

  return NextResponse.json({ success: true, ...out });
}