export function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('Window not available')); return; }
    if ((window as any).PaystackPop) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack — check your internet connection.'));
    document.body.appendChild(script);
  });
}
// lib/paystack.ts — add alongside your existing loadPaystackScript export

const PAYSTACK_BASE = 'https://api.paystack.co';

function paystackHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a Paystack customer if one doesn't exist yet for this user,
 * then creates (or returns the existing) Dedicated Virtual Account for them.
 * Call this from a server route only — never from the client.
 */
export async function getOrCreateDedicatedAccount(params: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  existingPaystackCustomerCode?: string | null;
}) {
  let customerCode = params.existingPaystackCustomerCode ?? null;

  // 1. Create the Paystack customer if we don't have one on file yet.
  if (!customerCode) {
    const custRes = await fetch(`${PAYSTACK_BASE}/customer`, {
      method: 'POST',
      headers: paystackHeaders(),
      body: JSON.stringify({
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
      }),
    });
    const custData = await custRes.json();
    if (!custRes.ok || !custData.status) {
      throw new Error(custData.message ?? 'Failed to create Paystack customer');
    }
    customerCode = custData.data.customer_code;
  }

  // 2. Check if this customer already has a DVA (avoids creating duplicates
  //    on repeat checkouts).
  const existingRes = await fetch(
    `${PAYSTACK_BASE}/dedicated_account?customer=${customerCode}`,
    { headers: paystackHeaders() }
  );
  const existingData = await existingRes.json();
  if (existingRes.ok && existingData.status && existingData.data?.length > 0) {
    const acct = existingData.data[0];
    return {
      customerCode,
      accountNumber: acct.account_number as string,
      accountName: acct.account_name as string,
      bankName: acct.bank.name as string,
    };
  }

  // 3. No DVA yet — create one. preferred_bank depends on what's enabled
  //    on your Paystack account (commonly 'wema-bank' or 'titan-paystack').
  const dvaRes = await fetch(`${PAYSTACK_BASE}/dedicated_account`, {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: process.env.PAYSTACK_DVA_PROVIDER ?? 'wema-bank',
    }),
  });
  const dvaData = await dvaRes.json();
  if (!dvaRes.ok || !dvaData.status) {
    throw new Error(dvaData.message ?? 'Failed to create dedicated account');
  }

  return {
    customerCode,
    accountNumber: dvaData.data.account_number as string,
    accountName: dvaData.data.account_name as string,
    bankName: dvaData.data.bank.name as string,
  };
}