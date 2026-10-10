import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Works out whether a signed-in user is a rider or a vendor (from the database, never from the browser).
export async function getWalletRole(userId: string): Promise<'rider' | 'vendor' | null> {
  const { data: rider } = await supabaseAdmin.from('riders').select('id').eq('user_id', userId).maybeSingle();
  if (rider) return 'rider';
  const { data: store } = await supabaseAdmin.from('stores').select('id').eq('vendor_id', userId).limit(1).maybeSingle();
  if (store) return 'vendor';
  return null;
}