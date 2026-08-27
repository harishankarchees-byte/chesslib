import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { createLocation, deleteLocation, fetchAllCopies } from '@/lib/queries';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

export function LocationsPage() {
  const { locations, loading, error, reload } = useLocations();
  const { toast } = useToast();
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof fetchAllCopies>>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCopies().then(setCopies).catch(console.error);
  }, [locations]);

  const counts: Record<string, { total: number; available: number }> = {};
  copies.forEach((c) => {
    const key = c.location_id || 'none';
    if (!counts[key]) counts[key] = { total: 0, available: 0 };
    counts[key].total++;
    if (c.status === 'available') counts[key].available++;
  });

  const handleAdd = async () => {
    if (!newName.trim()) return toast('Enter a name');
    try {
      await createLocation(newName.trim());
      setNewName('');
      setAddOpen(false);
      reload();
    } catch {
      toast('Failed to add location');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLocation(deleteId);
      setDeleteId(null);
      reload();
    } catch {
      toast('Failed to delete location');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-500">Where your books are stored</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          <Plus size={16} /> Add Location
        </button>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading locations…</div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Could not load locations</p>
          <p className="mt-1 text-xs">{error}</p>
          <button onClick={reload} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && locations.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <p className="text-slate-500">No locations yet.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => {
          const c = counts[loc.id] || { total: 0, available: 0 };
          return (
            <div key={loc.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{loc.name}</h3>
                    {loc.is_default && <span className="text-xs text-slate-400">Default</span>}
                  </div>
                </div>
                {!loc.is_default && (
                  <button onClick={() => setDeleteId(loc.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="flex gap-6">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{c.total}</div>
                  <div className="text-xs text-slate-500">Total copies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{c.available}</div>
                  <div className="text-xs text-slate-500">Available</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Location">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Tournament, Storage"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button onClick={handleAdd} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Add Location
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Location?"
        message="Copies at this location will have no location set. You can reassign them individually."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
