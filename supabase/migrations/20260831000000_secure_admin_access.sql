/*
  =========================================================
  CHESS BOOK INVENTORY - ADMIN SECURITY
  =========================================================

  QR visitors:
    - Can read book/copy information needed by QR pages
    - Cannot insert, update, or delete anything

  Admin:
    - Authenticated Supabase user
    - Can manage the inventory

  IMPORTANT:
    This assumes the single admin user you just created
    in Supabase Authentication.
*/

/* =========================================================
   BOOKS
   ========================================================= */

DROP POLICY IF EXISTS "insert_books" ON books;
DROP POLICY IF EXISTS "update_books" ON books;
DROP POLICY IF EXISTS "delete_books" ON books;

CREATE POLICY "admin_insert_books"
ON books
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_update_books"
ON books
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_delete_books"
ON books
FOR DELETE
TO authenticated
USING (true);


/* =========================================================
   BOOK TAGS
   ========================================================= */

DROP POLICY IF EXISTS "insert_book_tags" ON book_tags;
DROP POLICY IF EXISTS "update_book_tags" ON book_tags;
DROP POLICY IF EXISTS "delete_book_tags" ON book_tags;

CREATE POLICY "admin_insert_book_tags"
ON book_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_update_book_tags"
ON book_tags
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_delete_book_tags"
ON book_tags
FOR DELETE
TO authenticated
USING (true);


/* =========================================================
   LOCATIONS
   ========================================================= */

DROP POLICY IF EXISTS "insert_locations" ON locations;
DROP POLICY IF EXISTS "update_locations" ON locations;
DROP POLICY IF EXISTS "delete_locations" ON locations;

CREATE POLICY "admin_insert_locations"
ON locations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_update_locations"
ON locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_delete_locations"
ON locations
FOR DELETE
TO authenticated
USING (true);


/* =========================================================
   BOOK COPIES
   ========================================================= */

DROP POLICY IF EXISTS "insert_book_copies" ON book_copies;
DROP POLICY IF EXISTS "update_book_copies" ON book_copies;
DROP POLICY IF EXISTS "delete_book_copies" ON book_copies;

CREATE POLICY "admin_insert_book_copies"
ON book_copies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_update_book_copies"
ON book_copies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_delete_book_copies"
ON book_copies
FOR DELETE
TO authenticated
USING (true);


/* =========================================================
   INVENTORY MOVEMENTS
   ========================================================= */

DROP POLICY IF EXISTS "insert_movements" ON inventory_movements;
DROP POLICY IF EXISTS "update_movements" ON inventory_movements;
DROP POLICY IF EXISTS "delete_movements" ON inventory_movements;

CREATE POLICY "admin_insert_movements"
ON inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "admin_update_movements"
ON inventory_movements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_delete_movements"
ON inventory_movements
FOR DELETE
TO authenticated
USING (true);


/* =========================================================
   KEEP PUBLIC READ ACCESS
   =========================================================

   These existing SELECT policies allow the QR page to
   retrieve book/copy information without logging in.

   We intentionally leave SELECT alone for now.
*/
