import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchAllCopies } from '@/lib/queries';
import { useLocations } from '@/hooks/useLocations';
import { Link } from '@/lib/router';
import { coverStyle } from '@/lib/constants';

export function InventoryPage() {
  const { locations } = useLocations();
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof fetchAllCopies>>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locFilter, setLocFilter] = useState('all');

  useEffect(() => {
    fetchAllCopies()
      .then(setCopies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return copies.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (locFilter !== 'all' && c.location_id !== locFilter) return false;
      if (!q) return true;
      return (
        c.unique_code.toLowerCase().includes(q) ||
        c.book.title.toLowerCase().includes(q) ||
        (c.book.author || '').toLowerCase().includes(q)
      );
    });
  }, [copies, query, statusFilter, locFilter]);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Loading inventory…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500">{copies.length} physical copies across all titles</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by copy ID, title, or author…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-slate-400">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
        </select>
        <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-slate-400">
          <option value="all">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">No copies found.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const style = coverStyle(c.book.cover_color);
              return (
                <Link key={c.id} to={`/copy/${c.unique_code}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50">
                  <div className={`flex h-10 w-7 items-center justify-center rounded ${style.bg}`}>
                    <span className="rotate-90 text-[7px] font-bold text-white [writing-mode:vertical-rl] line-clamp-1">{c.book.title}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">{c.unique_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="truncate text-sm text-slate-600">{c.book.title}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-slate-700">{locations.find((l) => l.id === c.location_id)?.name || '—'}</div>
                    <div className="text-xs text-slate-400">₹{Number(c.book.price).toLocaleString('en-IN')}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
