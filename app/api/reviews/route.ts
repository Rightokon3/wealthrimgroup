import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/reviews ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getClient();
    const { searchParams } = new URL(req.url);
    const business_id = searchParams.get('business_id');
    const limit  = parseInt(searchParams.get('limit') || '10');
    const page   = parseInt(searchParams.get('page')  || '1');
    const offset = (page - 1) * limit;

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const { data, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('business_id', business_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const breakdown = [1, 2, 3, 4, 5].map(star => ({
      star,
      count: data?.filter(r => r.rating === star).length ?? 0,
    }));

    return NextResponse.json({
      data,
      meta: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) },
      breakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/reviews ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = getClient();
    const body = await req.json();

    const required = ['business_id', 'customer_name', 'rating'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
    }

    const rating = parseInt(body.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert([{
        business_id:   body.business_id,
        customer_name: body.customer_name,
        rating,
        comment:       body.comment ?? null,
      }])
      .select()
      .single();

    if (reviewError) {
      console.error('[POST /api/reviews]', reviewError);
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    // Recalculate aggregate rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', body.business_id);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('businesses')
        .update({ rating: parseFloat(avg.toFixed(1)), total_reviews: allReviews.length, updated_at: new Date().toISOString() })
        .eq('id', body.business_id);
    }

    return NextResponse.json({ data: review, message: 'Review submitted' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/reviews] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
