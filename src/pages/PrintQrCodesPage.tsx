import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Printer, Search, Square } from 'lucide-react';
import { fetchAllCopies } from '@/lib/queries';
import { useRouter } from '@/lib/router';
import { useToast } from '@/components/Toast';

type Copy = Awaited<ReturnType<typeof fetchAllCopies>>[number];

type QrMap = Record<string, string>;

export function PrintQrCodesPage() {
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [copies, setCopies] = useState<Copy[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [qrDataUrls, setQrDataUrls] = useState<QrMap>({});
  const [loading, setLoading] = useState(true);
  const [generatingQr, setGeneratingQr] = useState(false);

  /*
   * Load physical copies.
   *
   * IMPORTANT:
   * Only AVAILABLE copies are loaded for printing.
   * SOLD copies are completely excluded.
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchAllCopies();

      // Only keep copies that are currently available.
      const availableCopies = data.filter(
        (copy) => copy.status === 'available'
      );

      setCopies(availableCopies);

      // Initially select every available copy.
      setSelected(
        new Set(availableCopies.map((copy) => copy.id))
      );
    } catch (error) {
      console.error('Failed to load copies:', error);
      toast('Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Unique book list.
   *
   * Because copies already contain only AVAILABLE copies,
   * sold-out books/copies will not appear here.
   */
  const books = useMemo(() => {
    const map = new Map<string, string>();

    for (const copy of copies) {
      const book = copy.book as
        | {
            id: string;
            title: string;
          }
        | null
        | undefined;

      if (book?.id) {
        map.set(book.id, book.title);
      }
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [copies]);

  /*
   * Unique location list.
   */
  const locations = useMemo(() => {
    const map = new Map<string, string>();

    for (const copy of copies) {
      const location = (
        copy as {
          location?: {
            id: string;
            name: string;
          } | null;
        }
      ).location;

      if (location?.id) {
        map.set(location.id, location.name);
      }
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [copies]);

  /*
   * Filter copies.
   *
   * copies already contains ONLY available copies.
   */
  const filteredCopies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return copies.filter((copy) => {
      const book = copy.book as
        | {
            id: string;
            title: string;
            author: string | null;
          }
        | null
        | undefined;

      const location = (
        copy as {
          location?: {
            id: string;
            name: string;
          } | null;
        }
      ).location;

      const matchesSearch =
        !query ||
        copy.unique_code.toLowerCase().includes(query) ||
        book?.title?.toLowerCase().includes(query) ||
        book?.author?.toLowerCase().includes(query);

      const matchesBook =
        bookFilter === 'all' || book?.id === bookFilter;

      const matchesLocation =
        locationFilter === 'all' ||
        location?.id === locationFilter;

      return matchesSearch && matchesBook && matchesLocation;
    });
  }, [copies, search, bookFilter, locationFilter]);

  /*
   * Generate QR images.
   *
   * Every QR points to:
   *
   * #/copy/CC-00001
   *
   * This matches the working CopyDetailPage flow.
   */
  useEffect(() => {
    let cancelled = false;

    async function generateQrs() {
      if (copies.length === 0) {
        setQrDataUrls({});
        setGeneratingQr(false);
        return;
      }

      setGeneratingQr(true);

      try {
        const QR = (await import('qrcode')).default;

        const map: QrMap = {};

        for (const copy of copies) {
          const url =
            `${window.location.origin}` +
            `${window.location.pathname}` +
            `#/copy/${encodeURIComponent(copy.unique_code)}`;

          map[copy.id] = await QR.toDataURL(url, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
        }

        if (!cancelled) {
          setQrDataUrls(map);
        }
      } catch (error) {
        console.error('QR generation failed:', error);

        if (!cancelled) {
          toast('Failed to generate QR codes');
        }
      } finally {
        if (!cancelled) {
          setGeneratingQr(false);
        }
      }
    }

    generateQrs();

    return () => {
      cancelled = true;
    };
  }, [copies, toast]);

  /*
   * Selection helpers.
   */
  const selectedFilteredCopies = filteredCopies.filter((copy) =>
    selected.has(copy.id)
  );

  const allFilteredSelected =
    filteredCopies.length > 0 &&
    filteredCopies.every((copy) => selected.has(copy.id));

  const toggleCopy = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((previous) => {
      const next = new Set(previous);

      if (allFilteredSelected) {
        for (const copy of filteredCopies) {
          next.delete(copy.id);
        }
      } else {
        for (const copy of filteredCopies) {
          next.add(copy.id);
        }
      }

      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(copies.map((copy) => copy.id)));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  /*
   * Print only selected AVAILABLE copies.
   */
  const printSelected = () => {
    const printableCopies = copies.filter(
      (copy) =>
        copy.status === 'available' &&
        selected.has(copy.id)
    );

    if (printableCopies.length === 0) {
      toast('Select at least one available QR code');
      return;
    }

    const missingQr = printableCopies.some(
      (copy) => !qrDataUrls[copy.id]
    );

    if (missingQr) {
      toast('QR codes are still generating. Please wait.');
      return;
    }

    /*
     * Make the selected labels visible for printing.
     */
    document.body.classList.add('printing-qr');

    setTimeout(() => {
      window.print();

      /*
       * Give the browser a moment to finish print preparation.
       */
      setTimeout(() => {
        document.body.classList.remove('printing-qr');
      }, 500);
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading QR codes…
      </div>
    );
  }

  return (
    <>
      {/* ============================
          NORMAL SCREEN UI
      ============================= */}
      <div className="qr-screen mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate('/books')}
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={18} />
              Back to Books
            </button>

            <h1 className="text-2xl font-bold text-slate-900">
              Print QR Codes
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Print QR labels for available physical book copies.
            </p>
          </div>

          <button
            onClick={printSelected}
            disabled={
              selectedFilteredCopies.length === 0 ||
              generatingQr
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={18} />

            {generatingQr
              ? 'Generating QR Codes…'
              : `Print ${selectedFilteredCopies.length} QR${
                  selectedFilteredCopies.length === 1
                    ? ''
                    : ' Codes'
                }`}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-slate-900">
              {copies.length}
            </div>

            <div className="text-sm text-slate-500">
              Available Copies
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-slate-900">
              {selected.size}
            </div>

            <div className="text-sm text-slate-500">
              Selected
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-slate-900">
              {filteredCopies.length}
            </div>

            <div className="text-sm text-slate-500">
              Showing
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {generatingQr ? '…' : '✓'}
            </div>

            <div className="text-sm text-slate-500">
              QR Ready
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, book, author…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Book */}
            <select
              value={bookFilter}
              onChange={(e) => setBookFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All Available Books</option>

              {books.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>

            {/* Location */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All Locations</option>

              {locations.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Selection controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={toggleAllFiltered}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              {allFilteredSelected ? (
                <Check size={17} />
              ) : (
                <Square size={17} />
              )}

              {allFilteredSelected
                ? 'Unselect Showing'
                : 'Select Showing'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Select All
              </button>

              <button
                onClick={clearAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Copy list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Available Book Copies
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sold copies are automatically excluded.
            </p>
          </div>

          {filteredCopies.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No available copies match your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCopies.map((copy) => {
                const book = copy.book as {
                  id: string;
                  title: string;
                  author: string | null;
                  price: number;
                  level: string;
                  cover_color: string | null;
                };

                const location = (
                  copy as {
                    location?: {
                      id: string;
                      name: string;
                    } | null;
                  }
                ).location;

                const isSelected = selected.has(copy.id);

                return (
                  <button
                    key={copy.id}
                    type="button"
                    onClick={() => toggleCopy(copy.id)}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                      isSelected
                        ? 'bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                    </div>

                    {/* QR preview */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white">
                      {qrDataUrls[copy.id] ? (
                        <img
                          src={qrDataUrls[copy.id]}
                          alt={`QR ${copy.unique_code}`}
                          className="h-12 w-12"
                        />
                      ) : (
                        <span className="text-[9px] text-slate-400">
                          QR…
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {copy.unique_code}
                      </div>

                      <div className="truncate text-sm font-medium text-slate-700">
                        {book?.title || 'Unknown book'}
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                        {book?.author && (
                          <span>{book.author}</span>
                        )}

                        <span>
                          {location?.name || 'No location'}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                      Available
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Print information */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <strong className="text-slate-800">
            Printing:
          </strong>{' '}
          A4 paper, 12 labels per page (3 columns × 4 rows).
          Sold copies are not included. Each QR code contains the
          unique copy URL, for example{' '}
          <span className="font-mono font-semibold">
            CC-00001
          </span>
          .
        </div>
      </div>

      {/* ============================
          PRINT-ONLY UI
      ============================= */}
      <div className="qr-print-sheet" aria-hidden="true">
        {copies
          .filter(
            (copy) =>
              copy.status === 'available' &&
              selected.has(copy.id)
          )
          .map((copy) => {
            const book = copy.book as {
              title: string;
              author: string | null;
            };

            return (
              <div
                key={copy.id}
                className="qr-print-label"
              >
                <img
                  src={qrDataUrls[copy.id] || ''}
                  alt=""
                  className="qr-print-image"
                />

                <div className="qr-print-code">
                  {copy.unique_code}
                </div>

                <div className="qr-print-title">
                  {book?.title || 'Book'}
                </div>

                {book?.author && (
                  <div className="qr-print-author">
                    {book.author}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}
