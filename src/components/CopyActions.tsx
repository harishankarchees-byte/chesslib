import { useState } from 'react';
import { MapPin, DollarSign, History, QrCode } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useLocations } from '@/hooks/useLocations';
import { moveCopy, markSold, fetchMovements } from '@/lib/queries';
import type { BookCopy, Location } from '@/lib/types';import { useToast } from '@/components/Toast';
import { QrCodeLabel } from '@/components/QrCodeLabel';


interface CopyActionsProps {
  copy: BookCopy & { book: { title: string; author: string | null; price: number }; location: { id: string; name: string } | null };
  locations: Location[];
  onChanged: () => void;
  compact?: boolean;
}

export function CopyActions({ copy, locations, onChanged, compact }: CopyActionsProps) {
  const { toast } = useToast();
  const [moveOpen, setMoveOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState('');
  const [soldPrice, setSoldPrice] = useState(String(copy.book.price));
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchMovements>>>([]);
  const [busy, setBusy] = useState(false);

  const availableLocations = locations.filter((l) => l.id !== copy.location_id);

  const doMove = async () => {
    if (!selectedLoc) return toast('Choose a destination');
    setBusy(true);
    try {
      await moveCopy(copy, selectedLoc);
      setMoveOpen(false);
      onChanged();
    } catch {
      toast('Failed to move copy');
    } finally {
      setBusy(false);
    }
  };

  const doSell = async () => {
    const priceNum = Number(soldPrice);
    if (isNaN(priceNum) || priceNum < 0) return toast('Enter a valid price');
    setBusy(true);
    try {
      await markSold(copy, priceNum);
      setSellOpen(false);
      onChanged();
    } catch {
      toast('Failed to mark as sold');
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      setHistory(await fetchMovements(copy.id));
    } catch {
      toast('Failed to load history');
    }
  };

  const btnBase = compact
    ? 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition'
    : 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition w-full justify-center';

  return (
    <>
      {copy.status === 'available' ? (
        <div className={compact ? 'flex gap-2' : 'space-y-2'}>
          <button
            onClick={() => { setSelectedLoc(''); setMoveOpen(true); }}
            className={`${btnBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
          >
            <MapPin size={compact ? 14 : 16} /> Move
          </button>
          <button
            onClick={() => setSellOpen(true)}
            className={`${btnBase} bg-rose-100 text-rose-700 hover:bg-rose-200`}
          >
            <DollarSign size={compact ? 14 : 16} /> Mark Sold
          </button>
          {!compact && (
            <button
              onClick={() => setQrOpen(true)}
              className={`${btnBase} border border-slate-200 text-slate-700 hover:bg-slate-50`}
            >
              <QrCode size={16} /> Show QR
            </button>
          )}
          {!compact && (
            <button
              onClick={openHistory}
              className={`${btnBase} border border-slate-200 text-slate-700 hover:bg-slate-50`}
            >
              <History size={16} /> History
            </button>
          )}
        </div>
      ) : (
        <div className={compact ? 'flex gap-2' : 'space-y-2'}>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            Sold {copy.sold_price != null && `· ₹${Number(copy.sold_price).toLocaleString('en-IN')}`}
          </span>
          {!compact && (
            <button
              onClick={() => setQrOpen(true)}
              className={`${btnBase} border border-slate-200 text-slate-700 hover:bg-slate-50`}
            >
              <QrCode size={16} /> Show QR
            </button>
          )}
          {!compact && (
            <button
              onClick={openHistory}
              className={`${btnBase} border border-slate-200 text-slate-700 hover:bg-slate-50`}
            >
              <History size={16} /> History
            </button>
          )}
        </div>
      )}

      {/* Move modal */}
      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title="Move Copy">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Copy <span className="font-mono font-semibold text-slate-800">{copy.unique_code}</span></p>
            <p className="text-sm text-slate-700">{copy.book.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              Currently at: <span className="font-medium text-slate-700">{copy.location?.name || '—'}</span>
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Move to</label>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Select destination…</option>
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={doMove}
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Moving…' : 'Confirm Move'}
          </button>
        </div>
      </Modal>

      {/* Sell modal */}
      <Modal open={sellOpen} onClose={() => setSellOpen(false)} title="Mark as Sold">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Copy <span className="font-mono font-semibold text-slate-800">{copy.unique_code}</span></p>
            <p className="text-sm text-slate-700">{copy.book.title}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sold Price (₹)</label>
            <input
              type="number"
              min="0"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button
            onClick={doSell}
            disabled={busy}
            className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Confirm Sale'}
          </button>
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Movement History">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No movements recorded for this copy.</p>
        ) : (
          <div className="space-y-2">
            {history.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <span className="text-slate-700">
                  {(m.from_loc as { name: string } | null)?.name || '—'} → {(m.to_loc as { name: string } | null)?.name || '—'}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(m.moved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* QR modal */}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code Label" maxWidth="max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <QrCodeLabel copy={copy} bookTitle={copy.book.title} author={copy.book.author} />
          <p className="text-center text-xs text-slate-500">
            Scan this with your phone camera to open this copy's page.
          </p>
        </div>
      </Modal>
    </>
  );
}

