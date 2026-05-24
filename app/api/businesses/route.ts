import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/businesses ──────────────────────────────────────────────────
// Query params: category, city, search, minRating, verified, limit, page, sort
export async function GET(req: NextRequest) {
  try {
    const supabase = getClient();
    const { searchParams } = new URL(req.url);

    const category  = searchParams.get('category');
    const city      = searchParams.get('city');
    const search    = searchParams.get('search');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const verified  = searchParams.get('verified');
    const limit     = parseInt(searchParams.get('limit') || '20');
    const page      = parseInt(searchParams.get('page')  || '1');
    const sort      = searchParams.get('sort') || 'rating';
    const offset    = (page - 1) * limit;

    let query = supabase
      .from('businesses')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (category)            query = query.eq('category', category);
    if (city)                query = query.ilike('city', city);
    if (minRating > 0)       query = query.gte('rating', minRating);
    if (verified === 'true') query = query.eq('is_verified', true);
    if (search)              query = query.or(`business_name.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`);

    if (sort === 'newest')       query = query.order('created_at',    { ascending: false });
    else if (sort === 'reviews') query = query.order('total_reviews', { ascending: false });
    else                         query = query.order('rating',        { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/businesses]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      meta: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (err: any) {
    console.error('[GET /api/businesses] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/businesses ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = getClient();
    const body = await req.json();

    const required = ['business_name', 'category', 'description', 'address', 'city', 'country', 'phone', 'email'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const validCategories = ['food_delivery', 'fashion', 'real_estate'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('businesses')
      .insert([{
        business_name:      body.business_name,
        category:           body.category,
        description:        body.description,
        address:            body.address,
        city:               body.city,
        country:            body.country,
        phone:              body.phone,
        email:              body.email,
        website:            body.website            ?? null,
        logo_url:           body.logo_url           ?? null,
        cover_image_url:    body.cover_image_url    ?? null,
        gallery_images:     body.gallery_images     ?? [],
        hours_of_operation: body.hours_of_operation ?? null,
        social_media:       body.social_media       ?? null,
        is_active:          true,
        is_verified:        false,
        rating:             0,
        total_reviews:      0,
      }])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/businesses]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/businesses] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
