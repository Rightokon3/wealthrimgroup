-- ============================================================
-- AfriCart Auth Migration
-- Run this in Supabase SQL Editor AFTER your existing schema
-- ============================================================

-- 1. PROFILES TABLE
--    Created automatically for every new Supabase auth user via trigger.
--    role = 'customer' | 'vendor'
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor')),
  phone       TEXT,
  city        TEXT,
  country     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. ADD user_id TO REVIEWS (so we know who left it + prevent duplicates)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- One review per user per business
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_business_unique
  ON reviews (user_id, business_id)
  WHERE user_id IS NOT NULL;

-- 3. ADD user_id TO INQUIRIES (link inquiry to logged-in customer)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. RLS — PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Allow reading other profiles for vendor pages (full_name, avatar, role only exposed via API)
CREATE POLICY "Public can read vendor profiles"
  ON profiles FOR SELECT USING (role = 'vendor');

-- 5. RLS — BUSINESSES (tighten up: only owner can insert/update)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON businesses;
DROP POLICY IF EXISTS "Enable update for business owners" ON businesses;

CREATE POLICY "Vendors can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor'
    )
  );

CREATE POLICY "Vendors can update their own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can delete their own businesses"
  ON businesses FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS — REVIEWS (authenticated customers only; one per business)
DROP POLICY IF EXISTS "Enable insert for all users" ON reviews;

CREATE POLICY "Authenticated users can leave reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS — INQUIRIES (authenticated customers only)
DROP POLICY IF EXISTS "Enable insert for all users" ON inquiries;

CREATE POLICY "Authenticated users can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read their own inquiries"
  ON inquiries FOR SELECT
  USING (auth.uid() = user_id);

-- Vendors can see inquiries for their businesses
CREATE POLICY "Vendors can read inquiries for their businesses"
  ON inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = inquiries.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- 8. INDEX
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
