import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { fetchBooks, fetchAllCopies } from '@/lib/queries';
import { BookCard } from '@/components/BookSpine';
import { LEVEL_LABELS } from '@/lib/constants';
import type { BookWithTags } from '@/lib/types';
import { Link } from '@/lib/router';

export function BooksPage() {
  const [books, setBooks] = useState<BookWithTags[]>([]);
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof fetchAllCopies>>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  useEffect(() => {
    Promise.all([fetchBooks(), fetchAllCopies()])
      .then(([b, c]) => {
        setBooks(b);
        setCopies(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyCounts = useMemo(() => {
    const map: Record<string, { total: number; available: number }> = {};
    copies.forEach((c) => {
      if (!map[c.book_id]) map[c.book_id] = { total: 0, available: 0 };
      map[c.book_id].total++;
      if (c.status === 'available') map[c.book_id].available++;
    });
    return map;
  }, [copies]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    books.forEach((b) => b.book_tags?.forEach((t) => s.add(t.tag)));
    return Array.from(s).sort();
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (levelFilter !== 'all' && b.level !== levelFilter) return false;
      if (tagFilter !== 'all' && !b.book_tags?.some((t) => t.tag === tagFilter)) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q)
      );
    });
  }, [books, query, levelFilter, tagFilter]);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Loading books…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Books</h1>
          <p className="text-sm text-slate-500">{books.length} titles in your collection</p>
        </div>
        <Link
          to="/add"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Book
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All Levels</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All Topics</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-slate-500">No books match your filters.</p>
          <Link to="/add" className="mt-3 text-sm font-semibold text-slate-900 underline">Add your first book</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((book) => {
            const counts = copyCounts[book.id] || { total: 0, available: 0 };
            return (
              <BookCard
                key={book.id}
                book={book}
                copies={counts.total}
                available={counts.available}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
