// Server-only Paystack helpers for payouts. Never import into a 'use client' file.
const API = 'https://api.paystack.co';

async function call(path: string, method: 'GET' | 'POST', body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok && json.status === true, json, message: json.message as string | undefined };
}

export async function listBanks(): Promise<{ name: string; code: string }[]> {
  const r = await call('/bank?country=nigeria&perPage=200&use_cursor=false', 'GET');
  if (!r.ok) throw new Error(r.message ?? 'Could not load banks');
  const seen = new Set<string>();
  return (r.json.data as any[])
    .filter(b => b.active !== false && b.code && !seen.has(b.code) && seen.add(b.code))
    .map(b => ({ name: b.name as string, code: b.code as string }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Looks up the account holder's name.
 * Returns { name } on success, or { message, rateLimited } with Paystack's real reason on failure.
 */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ name?: string; message?: string; rateLimited?: boolean }> {
  const res = await fetch(
    `${API}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: 'no-store' },
  );
  const json: any = await res.json().catch(() => ({}));
  if (res.ok && json.status === true && json.data?.account_name) return { name: json.data.account_name as string };
  console.error('[paystack resolve]', res.status, json?.message);
  return { message: json?.message as string | undefined, rateLimited: res.status === 429 || /limit|too many/i.test(json?.message ?? '') };
}

export async function createRecipient(name: string, accountNumber: string, bankCode: string) {
  const r = await call('/transferrecipient', 'POST', {
    type: 'nuban', name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN',
  });
  if (!r.ok) throw new Error(r.message ?? 'Could not save this bank account');
  return r.json.data.recipient_code as string;
}

/** status: 'success' | 'pending' | 'otp' | 'failed' ... (otp = Paystack wants a confirmation code) */
export async function sendTransfer(opts: { amountNaira: number; recipient: string; reference: string; reason: string }) {
  const r = await call('/transfer', 'POST', {
    source: 'balance',
    amount: Math.round(opts.amountNaira * 100),
    recipient: opts.recipient,
    reference: opts.reference,
    reason: opts.reason,
  });
  return { ok: r.ok, status: (r.json?.data?.status as string | undefined), message: r.message };
}

/** Creates a Paystack payment page the rider can pay with a bank transfer or card. */
export async function initializePayment(opts: {
  email: string; amountNaira: number; reference: string; callbackUrl: string; metadata: Record<string, any>;
}) {
  const r = await call('/transaction/initialize', 'POST', {
    email: opts.email,
    amount: Math.round(opts.amountNaira * 100),
    reference: opts.reference,
    callback_url: opts.callbackUrl,
    channels: ['bank_transfer', 'card'],
    metadata: opts.metadata,
  });
  if (!r.ok) throw new Error(r.message ?? 'Could not start the payment');
  return r.json.data.authorization_url as string;
}