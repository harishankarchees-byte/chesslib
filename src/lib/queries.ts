import { supabase } from './supabase';
import type { Book, BookCopy, CopyWithBook, InventoryMovement, Location } from './types';

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*, book_tags(tag)')
    .order('title');
  if (error) throw error;
  return data ?? [];
}

export async function fetchBook(id: string) {
  const { data, error } = await supabase
    .from('books')
    .select('*, book_tags(tag)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCopiesByBook(bookId: string) {
  const { data, error } = await supabase
    .from('book_copies')
    .select('*, location:locations!book_copies_location_id_fkey(name)')
    .eq('book_id', bookId)
    .order('unique_code');
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllCopies(): Promise<CopyWithBook[]> {
  const { data, error } = await supabase
    .from('book_copies')
    .select('*, book:books!book_copies_book_id_fkey(id,title,author,price,level,cover_color)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CopyWithBook[];
}

export async function fetchCopyByCode(code: string) {
  const { data, error } = await supabase
    .from('book_copies')
    .select(`
      *,
      book:books!book_copies_book_id_fkey(id,title,author,price,level,cover_color),
      location:locations!book_copies_location_id_fkey(id,name)
    `)
    .eq('unique_code', code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCopyById(id: string) {
  const { data, error } = await supabase
    .from('book_copies')
    .select(`
      *,
      book:books!book_copies_book_id_fkey(id,title,author,price,level,cover_color),
      location:locations!book_copies_location_id_fkey(id,name)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMovements(copyId: string) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select(`
      *,
      from_loc:locations!inventory_movements_from_location_id_fkey(name),
      to_loc:locations!inventory_movements_to_location_id_fkey(name)
    `)
    .eq('copy_id', copyId)
    .order('moved_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardStats() {
  const { count: totalTitles } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true });

  const { count: totalCopies } = await supabase
    .from('book_copies')
    .select('*', { count: 'exact', head: true });

  const { count: available } = await supabase
    .from('book_copies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available');

  const { count: sold } = await supabase
    .from('book_copies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  const { data: byLevel } = await supabase
    .from('books')
    .select('level');

  const { data: copiesWithLoc } = await supabase
    .from('book_copies')
    .select('status, location_id, book:books!book_copies_book_id_fkey(price)');

  const { data: tagsData } = await supabase
    .from('book_tags')
    .select('tag');

  const { data: soldData } = await supabase
    .from('book_copies')
    .select('sold_price')
    .eq('status', 'sold')
    .not('sold_price', 'is', null);

  return {
    totalTitles: totalTitles ?? 0,
    totalCopies: totalCopies ?? 0,
    available: available ?? 0,
    sold: sold ?? 0,
    byLevel: byLevel ?? [],
    copiesWithLoc: copiesWithLoc ?? [],
    tagsData: tagsData ?? [],
    soldData: soldData ?? [],
  };
}

export async function allocateCopyCode(): Promise<string> {
  const { data, error } = await supabase.rpc('next_copy_code');
  if (error) throw error;
  return data as string;
}

export async function createBook(
  input: {
    title: string;
    author: string;
    price: number;
    level: string;
    cover_color: string;
    notes?: string;
    tags: string[];
    copies: number;
    locationId: string;
  }
): Promise<Book> {
  const { data: book, error } = await supabase
    .from('books')
    .insert({
      title: input.title,
      author: input.author || null,
      price: input.price,
      level: input.level,
      cover_color: input.cover_color,
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.tags.length > 0) {
    const { error: tagError } = await supabase
      .from('book_tags')
      .insert(input.tags.map((tag) => ({ book_id: book.id, tag })));
    if (tagError) throw tagError;
  }

  for (let i = 0; i < input.copies; i++) {
    const code = await allocateCopyCode();
    const { error: copyError } = await supabase.from('book_copies').insert({
      book_id: book.id,
      unique_code: code,
      location_id: input.locationId,
      status: 'available',
    });
    if (copyError) throw copyError;
  }

  return book;
}

export async function updateBook(
  id: string,
  input: {
    title: string;
    author: string;
    price: number;
    level: string;
    cover_color: string;
    notes?: string;
    tags: string[];
  }
) {
  const { error } = await supabase
    .from('books')
    .update({
      title: input.title,
      author: input.author || null,
      price: input.price,
      level: input.level,
      cover_color: input.cover_color,
      notes: input.notes || null,
    })
    .eq('id', id);
  if (error) throw error;

  const { error: delError } = await supabase.from('book_tags').delete().eq('book_id', id);
  if (delError) throw delError;

  if (input.tags.length > 0) {
    const { error: tagError } = await supabase
      .from('book_tags')
      .insert(input.tags.map((tag) => ({ book_id: id, tag })));
    if (tagError) throw tagError;
  }
}

export async function moveCopy(
  copy: BookCopy,
  toLocationId: string
): Promise<void> {
  const { error } = await supabase
    .from('book_copies')
    .update({ location_id: toLocationId })
    .eq('id', copy.id);
  if (error) throw error;

  const { error: mErr } = await supabase.from('inventory_movements').insert({
    copy_id: copy.id,
    from_location_id: copy.location_id,
    to_location_id: toLocationId,
  });
  if (mErr) throw mErr;
}

export async function markSold(
  copy: BookCopy,
  soldPrice: number
): Promise<void> {
  const { error } = await supabase
    .from('book_copies')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString(),
      sold_price: soldPrice,
    })
    .eq('id', copy.id);
  if (error) throw error;
}

export async function addCopies(bookId: string, count: number, locationId: string) {
  for (let i = 0; i < count; i++) {
    const code = await allocateCopyCode();
    const { error } = await supabase.from('book_copies').insert({
      book_id: bookId,
      unique_code: code,
      location_id: locationId,
      status: 'available',
    });
    if (error) throw error;
  }
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}

export async function createLocation(name: string) {
  const { error } = await supabase.from('locations').insert({ name });
  if (error) throw error;
}

export async function deleteLocation(id: string) {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}
