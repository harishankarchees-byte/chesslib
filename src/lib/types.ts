export type Level = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type CopyStatus = 'available' | 'sold';

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced', 'all_levels'];
export const ALL_TAGS = ['Opening', 'Middlegame', 'Endgame', 'General', 'Tactics', 'Strategy', 'Puzzle', 'Other'] as const;
export type Tag = (typeof ALL_TAGS)[number];

export interface Book {
  id: string;
  title: string;
  author: string | null;
  price: number;
  level: Level;
  cover_color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookTag {
  id: string;
  book_id: string;
  tag: string;
}

export interface Location {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface BookCopy {
  id: string;
  book_id: string;
  unique_code: string;
  location_id: string | null;
  status: CopyStatus;
  sold_at: string | null;
  sold_price: number | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  copy_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  moved_at: string;
}

export interface BookWithTags extends Book {
  book_tags: { tag: string }[];
}

export interface CopyWithRelations extends BookCopy {
  book: Pick<Book, 'id' | 'title' | 'author' | 'price' | 'level' | 'cover_color'>;
  location: Pick<Location, 'id' | 'name'> | null;
}

export interface CopyWithBook extends BookCopy {
  book: Pick<Book, 'id' | 'title' | 'author' | 'price' | 'level' | 'cover_color'>;
}
