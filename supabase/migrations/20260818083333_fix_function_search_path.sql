/*
# Fix function search_path warnings

Sets an explicit search_path on the two helper functions to resolve
the Supabase linter's function_search_path_mutable warning.
*/

CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION next_copy_code() RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val bigint;
BEGIN
  next_val := nextval('book_copy_seq');
  RETURN 'CC-' || lpad(next_val::text, 5, '0');
END;
$$;