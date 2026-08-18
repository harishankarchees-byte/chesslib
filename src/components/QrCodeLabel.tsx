import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';

interface QrLabelProps {
  copy: { unique_code: string };
  bookTitle: string;
  author: string | null;
  showActions?: boolean;
}

export function QrCodeLabel({ copy, bookTitle, author, showActions }: QrLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  const url = `${window.location.origin}${window.location.pathname}#/copy/${copy.unique_code}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }, () => {
        if (canvasRef.current) {
          setDataUrl(canvasRef.current.toDataURL('image/png'));
        }
      });
    }
  }, [url]);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${copy.unique_code} - QR Label</title>
      <style>
        @page { size: 100mm 60mm; margin: 0; }
        body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; font-family: sans-serif; }
        .label { text-align:center; padding:8px; border:1px solid #ddd; border-radius:8px; }
        .code { font-size:14px; font-weight:bold; letter-spacing:1px; }
        .title { font-size:10px; max-width:180px; margin:2px auto; color:#333; }
        img { width:140px; height:140px; }
      </style></head><body>
      <div class="label">
        <img src="${dataUrl}" />
        <div class="code">${copy.unique_code}</div>
        <div class="title">${bookTitle}</div>
        ${author ? `<div class="title" style="color:#777;font-style:italic">${author}</div>` : ''}
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
        <canvas ref={canvasRef} className="hidden" />
        {dataUrl && <img src={dataUrl} alt={`QR for ${copy.unique_code}`} width={200} height={200} />}
        <div className="mt-2 font-mono text-lg font-bold tracking-wider text-slate-900">{copy.unique_code}</div>
        <div className="mt-0.5 text-sm font-medium text-slate-700">{bookTitle}</div>
        {author && <div className="text-xs italic text-slate-400">{author}</div>}
      </div>
      {showActions && (
        <button
          onClick={handlePrint}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Printer size={16} /> Print Label
        </button>
      )}
    </div>
  );
}
