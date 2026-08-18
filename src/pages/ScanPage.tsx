import { useEffect, useRef, useState } from 'react';
import { ScanLine, Camera, Keyboard, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from '@/lib/router';
import { fetchCopyByCode } from '@/lib/queries';

export function ScanPage() {
  const { navigate } = useRouter();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (s.isScanning) {
          await s.stop();
        }
        await s.clear();
      } catch { /* ignore */ }
    }
    setScanning(false);
  };

  const handleDecoded = (text: string) => {
    let code = text.trim();
    const match = code.match(/CC-\d{5}/i);
    if (match) code = match[0];
    stopScanner().then(() => navigate(`/copy/${code.toUpperCase()}`));
  };

  const startScanner = async () => {
    setError('');
    try {
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleDecoded(decoded),
        () => { /* per-frame decode error, ignore */ }
      );
      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        setError('Camera permission was denied. Please allow camera access in your browser settings, or use Manual entry.');
      } else if (msg.includes('NotFound') || msg.includes('device')) {
        setError('No camera found on this device. Use Manual entry to type a copy code.');
      } else {
        setError('Could not start camera. Try Manual entry instead.');
      }
      setScanning(false);
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    try {
      const copy = await fetchCopyByCode(code);
      if (!copy) {
        setError(`No copy found with code ${code}`);
        return;
      }
      navigate(`/copy/${code}`);
    } catch {
      setError('Could not search for that code. Check your connection.');
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scan a Book</h1>
        <p className="text-sm text-slate-500">Point your camera at a QR code label inside a book.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => { setMode('camera'); setError(''); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            mode === 'camera' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Camera size={16} /> Camera
        </button>
        <button
          onClick={() => { stopScanner(); setMode('manual'); setError(''); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Keyboard size={16} /> Manual
        </button>
      </div>

      {mode === 'camera' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900" style={{ minHeight: '300px' }}>
            {/* The QR reader container — only mount when scanning to avoid empty video elements */}
            {scanning && <div id={containerId} className="w-full" />}

            {!scanning && (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
                <Camera size={40} className="opacity-50" />
                <p className="text-sm">Camera is off</p>
                <p className="text-xs text-slate-500">Tap "Start Scanning" to begin</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!scanning ? (
            <button onClick={startScanner} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <ScanLine size={18} /> Start Scanning
            </button>
          ) : (
            <button onClick={stopScanner} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <X size={18} /> Stop Camera
            </button>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleSubmitManual} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Enter Copy Code</label>
            <input
              value={manualCode}
              onChange={(e) => { setManualCode(e.target.value); setError(''); }}
              placeholder="e.g. CC-00001"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-xs text-slate-400">Type the code printed on the QR label inside the book.</p>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Find Copy
          </button>
        </form>
      )}
    </div>
  );
}
