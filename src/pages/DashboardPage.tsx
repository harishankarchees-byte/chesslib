import { useEffect, useState } from 'react';
import { BookOpen, Package, CheckCircle2, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { fetchDashboardStats } from '@/lib/queries';
import { Link } from '@/lib/router';
import { LEVEL_LABELS } from '@/lib/constants';

export function DashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard…</div>;
  }

  const levelCounts: Record<string, number> = {};
  stats.byLevel.forEach((b: { level: string }) => {
    levelCounts[b.level] = (levelCounts[b.level] || 0) + 1;
  });

  const tagCounts: Record<string, number> = {};
  stats.tagsData.forEach((t: { tag: string }) => {
    tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1;
  });
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  const locCounts: Record<string, { total: number; available: number }> = {};
  (stats.copiesWithLoc as { status: string; location_id: string | null }[]).forEach((c) => {
    const key = c.location_id || 'unknown';
    if (!locCounts[key]) locCounts[key] = { total: 0, available: 0 };
    locCounts[key].total++;
    if (c.status === 'available') locCounts[key].available++;
  });

  const revenue = stats.soldData.reduce(
    (sum: number, s: { sold_price: number | null }) => sum + Number(s.sold_price || 0),
    0
  );

  const inventoryValue = (stats.copiesWithLoc as { status: string; book: { price: number }[] }[])
    .filter((c) => c.status === 'available')
    .reduce((sum, c) => sum + Number(c.book?.[0]?.price || 0), 0);

  const statCards = [
    { label: 'Total Titles', value: stats.totalTitles, icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Total Copies', value: stats.totalCopies, icon: Package, color: 'bg-slate-700' },
    { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Sold', value: stats.sold, icon: DollarSign, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your chess book inventory</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-3 inline-flex rounded-lg ${s.color} p-2.5 text-white`}>
                <Icon size={20} />
              </div>
              <div className="text-3xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue + value */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <TrendingUp size={18} className="text-emerald-600" />
            <h2 className="font-semibold">Financial Overview</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-800">Sales Revenue</span>
              <span className="text-xl font-bold text-emerald-700">₹{revenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <span className="text-sm text-blue-800">Inventory Value (available)</span>
              <span className="text-xl font-bold text-blue-700">₹{inventoryValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-700">Avg. Price / Sold Copy</span>
              <span className="text-xl font-bold text-slate-800">
                ₹{stats.sold > 0 ? Math.round(revenue / stats.sold).toLocaleString('en-IN') : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* By level */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Books by Level</h2>
          <div className="space-y-3">
            {(['beginner', 'intermediate', 'advanced', 'all_levels'] as const).map((lvl) => {
              const count = levelCounts[lvl] || 0;
              const pct = stats.totalTitles > 0 ? (count / stats.totalTitles) * 100 : 0;
              return (
                <div key={lvl}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{LEVEL_LABELS[lvl]}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* By tag */}
      {sortedTags.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Books by Topic</h2>
          <div className="flex flex-wrap gap-2">
            {sortedTags.map(([tag, count]) => (
              <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                {tag}
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/add" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          Add New Book
          <ArrowRight size={16} />
        </Link>
        <Link to="/scan" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Scan a Book
          <ArrowRight size={16} />
        </Link>
        <Link to="/books" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Browse All Books
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
