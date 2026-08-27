import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanLine, Camera, Keyboard, X, AlertCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from '@/lib/router';
import { fetchCopyByCode } from '@/lib/queries';

export function ScanPage() {
  const { navigate } = useRouter();
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch { /* ignore */ }
      try {
        await scanner.clear();
      } catch { /* ignore */ }
    }
    setScanning(false);
  }, []);

  const handleDecoded = useCallback((text: string) => {
    let code = text.trim();
    const match = code.match(/CC-\d{5}/i);
    if (match) code = match[0];
    stopScanner().then(() => navigate(`/copy/${code.toUpperCase()}`));
  }, [stopScanner, navigate]);

  const startScanner = useCallback(async () => {
    setError('');
    setStarting(true);

    // Wait for the DOM element to be present
    const el = document.getElementById(containerId);
    if (!el) {
      setError('Scanner container not found. Try refreshing the page.');
      setStarting(false);
      return;
    }

    // Clean up any previous scanner instance
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }

    try {
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      // Try back camera first, fall back to any camera
      let started = false;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => handleDecoded(decoded),
          () => { /* per-frame decode error, ignore */ }
        );
        started = true;
      } catch {
        // Fallback: try without facingMode constraint
        try {
          await scanner.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decoded) => handleDecoded(decoded),
            () => { /* ignore */ }
          );
          started = true;
        } catch {
          // Final fallback: enumerate cameras and use the first one
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            await scanner.start(
              cameras[0].id,
              { fps: 10, qrbox: { width: 220, height: 220 } },
              (decoded) => handleDecoded(decoded),
              () => { /* ignore */ }
            );
            started = true;
          }
        }
      }

      if (started) {
        setScanning(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        setError('Camera permission was denied. Please allow camera access in your browser settings, or use Manual entry.');
      } else if (msg.includes('NotFound') || msg.includes('device') || msg.includes('No camera')) {
        setError('No camera found on this device. Use Manual entry to type a copy code.');
      } else {
        setError('Could not start camera. Try Manual entry instead.');
      }
      setScanning(false);
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  }, [handleDecoded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // Stop scanner when switching to manual mode
  const switchToManual = () => {
    stopScanner();
    setMode('manual');
    setError('');
  };

  const switchToCamera = () => {
    setMode('camera');
    setError('');
  };

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
          onClick={switchToCamera}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            mode === 'camera' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Camera size={16} /> Camera
        </button>
        <button
          onClick={switchToManual}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Keyboard size={16} /> Manual
        </button>
      </div>

      {mode === 'camera' && (
        <div className="space-y-4">
          {/* The QR reader container is ALWAYS rendered when in camera mode */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900" style={{ minHeight: '300px' }}>
            <div id={containerId} className="w-full" style={{ minHeight: '300px' }} />

            {!scanning && !starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Camera size={40} className="opacity-50" />
                <p className="text-sm">Camera is off</p>
                <p className="text-xs text-slate-500">Tap "Start Scanning" to begin</p>
              </div>
            )}

            {starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm">Starting camera…</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!scanning && !starting ? (
            <button
              onClick={startScanner}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ScanLine size={18} /> Start Scanning
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
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
