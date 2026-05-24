import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/inquiries ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getClient();
    const { searchParams } = new URL(req.url);

    const business_id = searchParams.get('business_id');
    const status      = searchParams.get('status');
    const type        = searchParams.get('type');
    const limit       = parseInt(searchParams.get('limit') || '20');
    const page        = parseInt(searchParams.get('page')  || '1');
    const offset      = (page - 1) * limit;

    if (!business_id) {
      return NextResponse.json({ error: 'business_id query param is required' }, { status: 400 });
    }

    let query = supabase
      .from('inquiries')
      .select('*', { count: 'exact' })
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (type)   query = query.eq('inquiry_type', type);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/inquiries]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: statusCounts } = await supabase
      .from('inquiries')
      .select('status')
      .eq('business_id', business_id);

    const summary = { pending: 0, responded: 0, closed: 0, total: count ?? 0 };
    statusCounts?.forEach(row => {
      if (row.status in summary) (summary as any)[row.status]++;
    });

    return NextResponse.json({
      data,
      meta: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) },
      summary,
    });
  } catch (err: any) {
    console.error('[GET /api/inquiries] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/inquiries ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = getClient();
    const body = await req.json();

    const required = ['business_id', 'customer_name', 'customer_email', 'message', 'inquiry_type'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const validTypes = ['general', 'order', 'booking', 'property_viewing'];
    if (!validTypes.includes(body.inquiry_type)) {
      return NextResponse.json({ error: `Invalid inquiry_type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, business_name, email')
      .eq('id', body.business_id)
      .eq('is_active', true)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found or inactive' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert([{
        business_id:    body.business_id,
        customer_name:  body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone ?? null,
        message:        body.message,
        inquiry_type:   body.inquiry_type,
        status:         'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/inquiries]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Inquiry submitted successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/inquiries] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
