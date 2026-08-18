/*
# Chess Book Inventory Schema

1. Purpose
   Single-tenant inventory system for tracking physical chess books, individual
   copies, their locations (Home / Academy / etc.), sale status, and movement
   history. Each physical copy gets a unique code (e.g. CC-00001) and a QR code.

2. New Tables
   - books                one row per title (title, author, price, level)
   - book_tags            many tags per book (Opening, Endgame, etc.)
   - locations            physical locations (Home, Academy, Storage...)
   - book_copies          one row per physical copy (unique_code, location, status)
   - inventory_movements  movement history per copy (from_location -> to_location)

3. Security
   Single-tenant, no auth screen. RLS enabled on all tables with
   TO anon, authenticated CRUD policies (intentionally shared data).

4. Notes
   - A trigger updates books.updated_at on row change.
   - A SEQUENCE generates the numeric portion of unique_code; the app calls next_copy_code().
*/

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'all_levels'
    CHECK (level IN ('beginner','intermediate','advanced','all_levels')),
  cover_color text DEFAULT 'amber',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE (book_id, tag)
);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unique_code text NOT NULL UNIQUE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','sold')),
  sold_at timestamptz,
  sold_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id uuid NOT NULL REFERENCES book_copies(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  moved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON book_copies(status);
CREATE INDEX IF NOT EXISTS idx_book_copies_location ON book_copies(location_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_movements_copy_id ON inventory_movements(copy_id);
CREATE INDEX IF NOT EXISTS idx_movements_moved_at ON inventory_movements(moved_at DESC);

CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS books_bump_updated_at ON books;
CREATE TRIGGER books_bump_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

INSERT INTO locations (name, is_default)
VALUES
  ('Home', true),
  ('Academy', true),
  ('Storage', false)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- books policies
DROP POLICY IF EXISTS "read_books" ON books;
CREATE POLICY "read_books" ON books FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_books" ON books;
CREATE POLICY "insert_books" ON books FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_books" ON books;
CREATE POLICY "update_books" ON books FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_books" ON books;
CREATE POLICY "delete_books" ON books FOR DELETE TO anon, authenticated USING (true);

-- book_tags policies
DROP POLICY IF EXISTS "read_book_tags" ON book_tags;
CREATE POLICY "read_book_tags" ON book_tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_book_tags" ON book_tags;
CREATE POLICY "insert_book_tags" ON book_tags FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_book_tags" ON book_tags;
CREATE POLICY "update_book_tags" ON book_tags FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_book_tags" ON book_tags;
CREATE POLICY "delete_book_tags" ON book_tags FOR DELETE TO anon, authenticated USING (true);

-- locations policies
DROP POLICY IF EXISTS "read_locations" ON locations;
CREATE POLICY "read_locations" ON locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_locations" ON locations;
CREATE POLICY "insert_locations" ON locations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_locations" ON locations;
CREATE POLICY "update_locations" ON locations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_locations" ON locations;
CREATE POLICY "delete_locations" ON locations FOR DELETE TO anon, authenticated USING (true);

-- book_copies policies
DROP POLICY IF EXISTS "read_book_copies" ON book_copies;
CREATE POLICY "read_book_copies" ON book_copies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_book_copies" ON book_copies;
CREATE POLICY "insert_book_copies" ON book_copies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_book_copies" ON book_copies;
CREATE POLICY "update_book_copies" ON book_copies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_book_copies" ON book_copies;
CREATE POLICY "delete_book_copies" ON book_copies FOR DELETE TO anon, authenticated USING (true);

-- inventory_movements policies
DROP POLICY IF EXISTS "read_movements" ON inventory_movements;
CREATE POLICY "read_movements" ON inventory_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_movements" ON inventory_movements;
CREATE POLICY "insert_movements" ON inventory_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_movements" ON inventory_movements;
CREATE POLICY "update_movements" ON inventory_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_movements" ON inventory_movements;
CREATE POLICY "delete_movements" ON inventory_movements FOR DELETE TO anon, authenticated USING (true);

CREATE SEQUENCE IF NOT EXISTS book_copy_seq;

CREATE OR REPLACE FUNCTION next_copy_code() RETURNS text AS $$
DECLARE
  next_val bigint;
BEGIN
  next_val := nextval('book_copy_seq');
  RETURN 'CC-' || lpad(next_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;