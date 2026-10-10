import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { getWalletRole } from '@/lib/walletRole';
import { resolveAccount, createRecipient, listBanks } from '@/lib/paystackPayouts';

const recent = new Map<string, { name: string; at: number }>();

// POST { action: 'resolve' | 'save', bank_code, account_number }
//  resolve -> returns the account holder's name so the user can check it
//  save    -> re-checks the account and saves it for future withdrawals
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const role = await getWalletRole(user.id);
  if (!role) return NextResponse.json({ error: 'Only vendors and riders can add a payout account.' }, { status: 403 });

  const { action, bank_code, account_number } = await req.json();
  if (!/^\d{10}$/.test(String(account_number ?? ''))) {
    return NextResponse.json({ error: 'Enter a 10-digit account number.' }, { status: 400 });
  }
  if (!bank_code) return NextResponse.json({ error: 'Choose a bank.' }, { status: 400 });

  // Reuse a recent lookup so "check" and "save" cost ONE Paystack call (Paystack rate-limits this endpoint).
  const key = `${user.id}:${bank_code}:${account_number}`;
  const hit = recent.get(key);
  let name = hit && Date.now() - hit.at < 10 * 60_000 ? hit.name : undefined;

  if (!name) {
    const r = await resolveAccount(account_number, bank_code);
    if (!r.name) {
      if (r.rateLimited) {
        return NextResponse.json({ error: 'Too many account checks in a short time. Please wait a minute and try again.' }, { status: 429 });
      }
      return NextResponse.json({
        error: `We could not verify that account${r.message ? ` (${r.message})` : ''}. Check the bank and number and try again.`,
      }, { status: 422 });
    }
    name = r.name;
    recent.set(key, { name, at: Date.now() });
  }

  if (action === 'resolve') return NextResponse.json({ account_name: name });

  try {
    const banks = await listBanks();
    const bankName = banks.find(b => b.code === bank_code)?.name ?? 'Bank';
    const recipient = await createRecipient(name, account_number, bank_code);

    const { error } = await supabaseAdmin.from('payout_accounts').upsert({
      user_id: user.id, role, bank_code, bank_name: bankName,
      account_number, account_name: name, recipient_code: recipient,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, account_name: name, bank_name: bankName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Could not save the account' }, { status: 502 });
  }
}