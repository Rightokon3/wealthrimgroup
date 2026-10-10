import { NextResponse } from 'next/server';

// Vendors and riders no longer withdraw by themselves. Drovo's admin pays them from the admin dashboard.
// This route stays only so old copies of the app get a clear answer instead of moving money.
export async function POST() {
  return NextResponse.json({ error: 'Payments are made by Drovo. You will be paid to your saved bank account.' }, { status: 403 });
}