import { coverStyle, LEVEL_LABELS } from '@/lib/constants';
import type { BookWithTags } from '@/lib/types';

export function BookSpine({ book, size = 'md' }: { book: { cover_color?: string | null; title: string; author?: string | null }; size?: 'sm' | 'md' | 'lg' }) {
  const style = coverStyle(book.cover_color);
  const dims = {
    sm: 'h-16 w-12 text-[7px]',
    md: 'h-24 w-16 text-[9px]',
    lg: 'h-40 w-28 text-xs',
  }[size];
  return (
    <div
      className={`relative flex ${dims} shrink-0 flex-col justify-between overflow-hidden rounded-md ${style.bg} p-1.5 shadow-md ring-1 ${style.ring}/40`}
    >
      <div className="absolute left-1 top-0 h-full w-1 bg-black/15" />
      <div className={`ml-1 line-clamp-3 font-bold leading-tight ${style.text}`}>{book.title}</div>
      {book.author && (
        <div className={`ml-1 line-clamp-1 italic opacity-80 ${style.text}`}>{book.author}</div>
      )}
    </div>
  );
}

export function BookCard({ book, copies, available }: { book: BookWithTags; copies: number; available: number }) {
  return (
    <a
      href={`#/book/${book.id}`}
      className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md"
    >
      <BookSpine book={book} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-900 group-hover:text-slate-700">{book.title}</h3>
        {book.author && <p className="truncate text-sm text-slate-500">{book.author}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {LEVEL_LABELS[book.level] || book.level}
          </span>
          {book.book_tags?.map((t) => (
            <span key={t.tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              {t.tag}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>{copies} copies</span>
          <span className="text-emerald-600">{available} available</span>
          <span className="font-medium text-slate-700">₹{Number(book.price).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </a>
  );
}
