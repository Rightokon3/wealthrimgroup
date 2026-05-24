import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Client is created inside each handler so env vars are
// resolved at request time, not at build time.
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/businesses/[id] ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const [productsRes, propertiesRes, reviewsRes] = await Promise.all([
      supabase.from('products').select('*').eq('business_id', id).eq('is_available', true).order('created_at', { ascending: false }),
      supabase.from('properties').select('*').eq('business_id', id).eq('is_available', true).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('business_id', id).order('created_at', { ascending: false }).limit(20),
    ]);

    return NextResponse.json({
      data: {
        ...business,
        products:   productsRes.data   ?? [],
        properties: propertiesRes.data ?? [],
        reviews:    reviewsRes.data    ?? [],
      },
    });
  } catch (err: any) {
    console.error('[GET /api/businesses/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/businesses/[id] ───────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;
    const body = await req.json();

    const BLOCKED = ['id', 'rating', 'total_reviews', 'is_verified', 'created_at', 'updated_at'];
    BLOCKED.forEach(f => delete body[f]);

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (body.category) {
      const validCategories = ['food_delivery', 'fashion', 'real_estate'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('businesses')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/businesses/[id]]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[PATCH /api/businesses/[id]] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/businesses/[id] ──────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getClient();
    const { id } = await params;
    const hard = new URL(req.url).searchParams.get('hard') === 'true';

    if (hard) {
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) {
        console.error('[DELETE /api/businesses/[id]] hard delete', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Business permanently deleted' });
    }

    const { data, error } = await supabase
      .from('businesses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DELETE /api/businesses/[id]] soft delete', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Business deactivated', data });
  } catch (err: any) {
    console.error('[DELETE /api/businesses/[id]] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
