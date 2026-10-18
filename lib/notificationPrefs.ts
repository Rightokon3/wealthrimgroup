import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server only. What has this customer chosen to receive? Defaults: order emails + push on, promos off.
export async function getPrefs(userId: string) {
  const { data } = await supabaseAdmin
    .from('notification_preferences')
    .select('order_emails, order_push, promo_emails')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    orderEmails: data?.order_emails ?? true,
    orderPush:   data?.order_push   ?? true,
    promoEmails: data?.promo_emails ?? false,
  };
}