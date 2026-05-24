import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── GET /api/inquiries ───────────────────────────────────────────────────
// Query params:
//   business_id = UUID  (required — a vendor only sees their own inquiries)
//   status      = pending | responded | closed
//   type        = general | order | booking | property_viewing
//   limit       = number (default 20)
//   page        = number (default 1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const business_id = searchParams.get('business_id');
    const status      = searchParams.get('status');
    const type        = searchParams.get('type');
    const limit       = parseInt(searchParams.get('limit') || '20');
    const page        = parseInt(searchParams.get('page') || '1');
    const offset      = (page - 1) * limit;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id query param is required' },
        { status: 400 }
      );
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

    // Group counts by status for dashboard badges
    const { data: statusCounts } = await supabase
      .from('inquiries')
      .select('status')
      .eq('business_id', business_id);

    const summary = { pending: 0, responded: 0, closed: 0, total: count ?? 0 };
    statusCounts?.forEach(row => {
      if (row.status in summary) summary[row.status as keyof typeof summary]++;
    });

    return NextResponse.json({ data, meta: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) }, summary });
  } catch (err: any) {
    console.error('[GET /api/inquiries] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/inquiries ──────────────────────────────────────────────────
// Called by the InquiryModal when a customer submits a contact form
// Body: { business_id, customer_name, customer_email, customer_phone?, message, inquiry_type }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const required = ['business_id', 'customer_name', 'customer_email', 'message', 'inquiry_type'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate inquiry_type
    const validTypes = ['general', 'order', 'booking', 'property_viewing'];
    if (!validTypes.includes(body.inquiry_type)) {
      return NextResponse.json(
        { error: `Invalid inquiry_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Confirm the business exists and is active
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, business_name, email')
      .eq('id', body.business_id)
      .eq('is_active', true)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found or inactive' }, { status: 404 });
    }

    // Insert the inquiry
    const { data, error } = await supabase
      .from('inquiries')
      .insert([{
        business_id:     body.business_id,
        customer_name:   body.customer_name,
        customer_email:  body.customer_email,
        customer_phone:  body.customer_phone ?? null,
        message:         body.message,
        inquiry_type:    body.inquiry_type,
        status:          'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/inquiries]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Optional: send notification email to the vendor ──────────────────
    // Uncomment and configure if you add an email provider (Resend, SendGrid, etc.)
    //
    // await sendEmail({
    //   to: business.email,
    //   subject: `New ${body.inquiry_type} inquiry from ${body.customer_name}`,
    //   html: `
    //     <h2>New Inquiry — AfriCart</h2>
    //     <p><strong>From:</strong> ${body.customer_name} (${body.customer_email})</p>
    //     <p><strong>Type:</strong> ${body.inquiry_type}</p>
    //     <p><strong>Message:</strong> ${body.message}</p>
    //   `
    // });

    return NextResponse.json({ data, message: 'Inquiry submitted successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/inquiries] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
