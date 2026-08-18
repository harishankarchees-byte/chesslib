import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Trash2, PlusCircle, QrCode, Printer } from 'lucide-react';
import { fetchBook, fetchCopiesByBook, addCopies, deleteBook } from '@/lib/queries';
import { useLocations } from '@/hooks/useLocations';
import { useRouter, Link } from '@/lib/router';
import { LEVEL_LABELS, coverStyle } from '@/lib/constants';
import { BookSpine } from '@/components/BookSpine';
import { CopyActions } from '@/components/CopyActions';
import { QrCodeLabel } from '@/components/QrCodeLabel';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import type { BookWithTags } from '@/lib/types';

export function BookDetailPage({ bookId }: { bookId: string }) {
  const { navigate } = useRouter();
  const { toast } = useToast();
  const { locations } = useLocations();
  const [book, setBook] = useState<BookWithTags | null>(null);
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof fetchCopiesByBook>>>([]);
  const [loading, setLoading] = useState(true);
  const [addCopiesOpen, setAddCopiesOpen] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newCopyCount, setNewCopyCount] = useState('1');
  const [newCopyLoc, setNewCopyLoc] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([fetchBook(bookId), fetchCopiesByBook(bookId)]);
      setBook(b);
      setCopies(c);
    } catch {
      toast('Failed to load book');
    } finally {
      setLoading(false);
    }
  }, [bookId, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Loading book…</div>;
  if (!book) return <div className="flex h-64 items-center justify-center text-slate-400">Book not found.</div>;

  const available = copies.filter((c) => c.status === 'available').length;
  const sold = copies.filter((c) => c.status === 'sold').length;

  const handleAddCopies = async () => {
    const n = Math.max(1, parseInt(newCopyCount) || 1);
    if (!newCopyLoc) return toast('Select a location');
    setAdding(true);
    try {
      await addCopies(bookId, n, newCopyLoc);
      setAddCopiesOpen(false);
      await load();
    } catch {
      toast('Failed to add copies');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBook(bookId);
      navigate('/books');
    } catch {
      toast('Failed to delete book');
    }
  };

  const printAllQr = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const labels = copies.map((c) => {
      const url = `${window.location.origin}${window.location.pathname}#/copy/${c.unique_code}`;
      return `<div class="label"><img src="${qrDataUrls[c.unique_code] || ''}" /><div class="code">${c.unique_code}</div><div class="title">${book.title}</div></div>`;
    }).join('');
    w.document.write(`<html><head><title>QR Labels - ${book.title}</title><style>
      @page { size: A4; margin: 10mm; }
      body { display:flex; flex-wrap:wrap; gap:8mm; font-family:sans-serif; }
      .label { text-align:center; padding:6mm; border:1px solid #ccc; border-radius:4px; width:55mm; }
      .code { font-size:12px; font-weight:bold; }
      .title { font-size:9px; color:#333; margin-top:2px; }
      img { width:40mm; height:40mm; }
    </style></head><body>${labels}<script>window.print();</script></body></html>`);
    w.document.close();
  };

  // pre-generate QR data URLs for print
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const QR = (await import('qrcode')).default;
      const map: Record<string, string> = {};
      for (const c of copies) {
        const url = `${window.location.origin}${window.location.pathname}#/copy/${c.unique_code}`;
        map[c.unique_code] = await QR.toDataURL(url, { width: 160, margin: 1 });
      }
      if (!cancelled) setQrDataUrls(map);
    })();
    return () => { cancelled = true; };
  }, [copies]);

  const style = coverStyle(book.cover_color);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/books')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={18} /> Back to Books
      </button>

      {/* Book header */}
      <div className="flex flex-col gap-5 sm:flex-row">
        <BookSpine book={book} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{book.title}</h1>
          {book.author && <p className="text-lg text-slate-500">{book.author}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{LEVEL_LABELS[book.level]}</span>
            {book.book_tags?.map((t) => (
              <span key={t.tag} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{t.tag}</span>
            ))}
            <span className={`rounded-full px-3 py-1 text-sm font-medium text-white ${style.bg}`}>₹{Number(book.price).toLocaleString('en-IN')}</span>
          </div>
          {book.notes && <p className="mt-3 text-sm text-slate-600">{book.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/edit/${book.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Pencil size={16} /> Edit
            </Link>
            <button onClick={() => setAddCopiesOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <PlusCircle size={16} /> Add Copies
            </button>
            <button onClick={() => setQrSheetOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <QrCode size={16} /> View QR Codes
            </button>
            <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Inventory summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{copies.length}</div>
          <div className="text-sm text-slate-500">Total Copies</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{available}</div>
          <div className="text-sm text-slate-500">Available</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-rose-600">{sold}</div>
          <div className="text-sm text-slate-500">Sold</div>
        </div>
      </div>

      {/* Copies table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Individual Copies</h2>
        </div>
        {copies.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No copies yet. Add some to get QR codes.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {copies.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Link to={`/copy/${c.unique_code}`} className="font-mono text-sm font-semibold text-slate-900 hover:underline">
                    {c.unique_code}
                  </Link>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {c.status === 'available' ? 'Available' : 'Sold'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {(c as { location?: { name?: string } | null }).location?.name || '—'}
                  </span>
                </div>
                <CopyActions
                  copy={{ ...c, book: { title: book.title, author: book.author, price: Number(book.price) }, location: (c as { location?: { id?: string; name?: string } | null }).location as { id: string; name: string } | null }}
                  locations={locations}
                  onChanged={load}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add copies modal */}
      <Modal open={addCopiesOpen} onClose={() => setAddCopiesOpen(false)} title="Add Copies">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Count</label>
              <input type="number" min="1" value={newCopyCount} onChange={(e) => setNewCopyCount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
              <select value={newCopyLoc} onChange={(e) => setNewCopyLoc(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400">
                <option value="">Select…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAddCopies} disabled={adding}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {adding ? 'Adding…' : 'Add Copies'}
          </button>
        </div>
      </Modal>

      {/* QR sheet modal */}
      <Modal open={qrSheetOpen} onClose={() => setQrSheetOpen(false)} title="QR Codes" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <button onClick={printAllQr} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <Printer size={16} /> Print All Labels
          </button>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {copies.map((c) => (
              <div key={c.id} className="flex flex-col items-center rounded-lg border border-slate-100 p-3">
                <QrCodeLabel copy={c} bookTitle={book.title} author={book.author} />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Book?"
        message={`This will permanently delete "${book.title}" and all its copies. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
