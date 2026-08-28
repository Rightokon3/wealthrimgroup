import { supabaseAdmin } from './supabaseAdmin';
import { sendPushToUser } from './web-push-server';

type AdminNotifyOptions = {
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  audience: 'admins_and_super' | 'super_only';
  url?: string;
};

export async function notifyAdmins({ type, title, body, data = {}, audience, url = '/admin' }: AdminNotifyOptions) {
  const roles = audience === 'super_only' ? ['super_admin'] : ['admin', 'super_admin'];

  const { data: recipients } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('role', roles);

  if (!recipients || recipients.length === 0) return;

  await Promise.all(
    recipients.map((r) =>
      Promise.all([
        supabaseAdmin.from('notifications').insert({
          user_id: r.id,
          type,
          title,
          body,
          data,
        }),
        sendPushToUser(r.id, { title, body, url }),
      ])
    )
  );
}