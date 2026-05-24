import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── PATCH /api/inquiries/[id] ────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;
    const body = await req.json();

    const validStatuses = ['pending', 'responded', 'closed'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('inquiries')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/inquiries/[id]]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ data, message: `Inquiry marked as ${body.status}` });
  } catch (err: any) {
    console.error('[PATCH /api/inquiries/[id]] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/inquiries/[id] ───────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;

    const { error } = await supabase.from('inquiries').delete().eq('id', id);

    if (error) {
      console.error('[DELETE /api/inquiries/[id]]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Inquiry deleted' });
  } catch (err: any) {
    console.error('[DELETE /api/inquiries/[id]] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
