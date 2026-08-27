/*
# Update default locations to Nemom House + Academy

1. Changes
   - Rename "Home" to "Nemom House"
   - Remove "Storage" location (no copies are assigned to it)
2. Notes
   - Academy stays as-is.
   - Any book_copies referencing the old Storage location_id will have location_id set to NULL.
*/

UPDATE locations SET name = 'Nemom House' WHERE name = 'Home';

DELETE FROM locations WHERE name = 'Storage';
