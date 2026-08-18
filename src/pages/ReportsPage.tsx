import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchAllCopies } from '@/lib/queries';
import { useLocations } from '@/hooks/useLocations';
import { LEVEL_LABELS } from '@/lib/constants';

export function ReportsPage() {
  const { locations } = useLocations();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof fetchAllCopies>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchAllCopies()])
      .then(([s, c]) => { setStats(s); setCopies(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <div className="flex h-64 items-center justify-center text-slate-400">Loading reports…</div>;

  // Location breakdown
  const locStats: Record<string, { total: number; available: number; sold: number; value: number }> = {};
  locations.forEach((l) => { locStats[l.id] = { total: 0, available: 0, sold: 0, value: 0 }; });
  copies.forEach((c) => {
    const key = c.location_id || 'none';
    if (!locStats[key]) locStats[key] = { total: 0, available: 0, sold: 0, value: 0 };
    locStats[key].total++;
    if (c.status === 'available') {
      locStats[key].available++;
      locStats[key].value += Number(c.book.price);
    } else {
      locStats[key].sold++;
    }
  });

  // Top selling titles
  const soldByTitle: Record<string, { title: string; count: number; revenue: number }> = {};
  copies.filter((c) => c.status === 'sold').forEach((c) => {
    if (!soldByTitle[c.book.title]) soldByTitle[c.book.title] = { title: c.book.title, count: 0, revenue: 0 };
    soldByTitle[c.book.title].count++;
    soldByTitle[c.book.title].revenue += Number(c.sold_price || 0);
  });
  const topSold = Object.values(soldByTitle).sort((a, b) => b.count - a.count).slice(0, 10);

  // Level distribution of copies
  const levelCopies: Record<string, number> = {};
  copies.forEach((c) => {
    levelCopies[c.book.level] = (levelCopies[c.book.level] || 0) + 1;
  });

  const revenue = stats.soldData.reduce((s: number, d: { sold_price: number | null }) => s + Number(d.sold_price || 0), 0);
  const inventoryValue = copies.filter((c) => c.status === 'available').reduce((s, c) => s + Number(c.book.price), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Inventory and sales statistics</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: 'text-emerald-600' },
          { label: 'Inventory Value', value: `₹${inventoryValue.toLocaleString('en-IN')}`, color: 'text-blue-600' },
          { label: 'Books Sold', value: stats.sold, color: 'text-amber-600' },
          { label: 'Available Copies', value: stats.available, color: 'text-slate-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* By location */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">By Location</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Available</th>
              <th className="px-5 py-3 text-right">Sold</th>
              <th className="px-5 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(locStats).map(([id, s]) => {
              const loc = locations.find((l) => l.id === id);
              return (
                <tr key={id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{loc?.name || 'Unassigned'}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.total}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">{s.available}</td>
                  <td className="px-5 py-3 text-right text-rose-600">{s.sold}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-700">₹{s.value.toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By level */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Copies by Level</h2>
          <div className="space-y-3">
            {(['beginner', 'intermediate', 'advanced', 'all_levels'] as const).map((lvl) => {
              const count = levelCopies[lvl] || 0;
              const pct = copies.length > 0 ? (count / copies.length) * 100 : 0;
              return (
                <div key={lvl}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{LEVEL_LABELS[lvl]}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top sold */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Top Selling Titles</h2>
          {topSold.length === 0 ? (
            <p className="text-sm text-slate-500">No sales recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topSold.map((t, i) => (
                <div key={t.title} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-3 text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{i + 1}</span>
                    <span className="truncate">{t.title}</span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">
                    {t.count} sold · ₹{t.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
