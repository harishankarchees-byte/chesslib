import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Printer, Search, Square } from 'lucide-react';

import { fetchAllCopies } from '@/lib/queries';
import { useRouter } from '@/lib/router';
import { useToast } from '@/components/Toast';

type Copy = Awaited<ReturnType<typeof fetchAllCopies>>[number];

type QrDataUrls = Record<string, string>;

export function PrintQrCodesPage() {
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [copies, setCopies] = useState<Copy[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [qrDataUrls, setQrDataUrls] = useState<QrDataUrls>({});
  const [loading, setLoading] = useState(true);
  const [generatingQr, setGeneratingQr] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD AVAILABLE COPIES
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * We use the existing copy records.
   * We DO NOT create new copy codes.
   *
   * Sold copies are excluded from this page.
   */
  const loadCopies = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchAllCopies();

      const availableCopies = data.filter(
        (copy) => copy.status === 'available'
      );

      setCopies(availableCopies);

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
    loadCopies();
  }, [loadCopies]);

  /*
   * ---------------------------------------------------------
   * BOOKS LIST
   * ---------------------------------------------------------
   */
  const books = useMemo(() => {
    const map = new Map<string, string>();

    for (const copy of copies) {
      const book = (copy as any).book;

      if (book?.id && book?.title) {
        map.set(book.id, book.title);
      }
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [copies]);

  /*
   * ---------------------------------------------------------
   * LOCATIONS LIST
   * ---------------------------------------------------------
   */
  const locations = useMemo(() => {
    const map = new Map<string, string>();

    for (const copy of copies) {
      const location = (copy as any).location;

      if (location?.id && location?.name) {
        map.set(location.id, location.name);
      }
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [copies]);

  /*
   * ---------------------------------------------------------
   * FILTERED COPIES
   * ---------------------------------------------------------
   */
  const filteredCopies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return copies.filter((copy) => {
      const book = (copy as any).book;
      const location = (copy as any).location;

      const matchesSearch =
        !query ||
        String(copy.unique_code ?? '')
          .toLowerCase()
          .includes(query) ||
        String(book?.title ?? '')
          .toLowerCase()
          .includes(query) ||
        String(book?.author ?? '')
          .toLowerCase()
          .includes(query);

      const matchesBook =
        bookFilter === 'all' ||
        book?.id === bookFilter;

      const matchesLocation =
        locationFilter === 'all' ||
        location?.id === locationFilter;

      return (
        matchesSearch &&
        matchesBook &&
        matchesLocation
      );
    });
  }, [
    copies,
    search,
    bookFilter,
    locationFilter,
  ]);

  /*
   * ---------------------------------------------------------
   * GENERATE QR CODES
   * ---------------------------------------------------------
   *
   * QR points to:
   *
   * #/copy/CC-00001
   *
   * Existing unique_code is used.
   */
  useEffect(() => {
    let cancelled = false;

    async function generateQrs() {
      if (copies.length === 0) {
        setQrDataUrls({});
        return;
      }

      setGeneratingQr(true);

      try {
        const QR = (await import('qrcode')).default;

        const urls: QrDataUrls = {};

        for (const copy of copies) {
          const url =
            `${window.location.origin}` +
            `${window.location.pathname}` +
            `#/copy/${encodeURIComponent(copy.unique_code)}`;

          urls[copy.id] = await QR.toDataURL(url, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
        }

        if (!cancelled) {
          setQrDataUrls(urls);
        }
      } catch (error) {
        console.error('Failed to generate QR codes:', error);

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
   * ---------------------------------------------------------
   * SELECTION
   * ---------------------------------------------------------
   */
  const selectedFilteredCopies = filteredCopies.filter(
    (copy) => selected.has(copy.id)
  );

  const allFilteredSelected =
    filteredCopies.length > 0 &&
    filteredCopies.every((copy) =>
      selected.has(copy.id)
    );

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
    setSelected(
      new Set(copies.map((copy) => copy.id))
    );
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  /*
   * ---------------------------------------------------------
   * PRINT
   * ---------------------------------------------------------
   */
  const printSelected = () => {
    const printableCopies = copies.filter((copy) =>
      selected.has(copy.id)
    );

    if (printableCopies.length === 0) {
      toast('Select at least one QR code');
      return;
    }

    const missingQr = printableCopies.some(
      (copy) => !qrDataUrls[copy.id]
    );

    if (missingQr) {
      toast('QR codes are still generating. Please wait.');
      return;
    }

    document.body.classList.add('printing-qr');

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        document.body.classList.remove(
          'printing-qr'
        );
      }, 500);
    }, 100);
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading QR codes…
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * SCREEN UI
   * ---------------------------------------------------------
   */
  return (
    <>
      <div className="qr-screen mx-auto max-w-6xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <button
              type="button"
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
              Print QR labels for your available book copies.
            </p>
          </div>

          <button
            type="button"
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
              : selected.size === copies.length &&
                copies.length > 0
              ? 'Print All QR Codes'
              : `Print ${selectedFilteredCopies.length} QR ${
                  selectedFilteredCopies.length === 1
                    ? 'Code'
                    : 'Codes'
                }`}
          </button>

        </div>

        {/* SUMMARY */}
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

        {/* FILTERS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">

          <div className="grid gap-3 md:grid-cols-3">

            {/* SEARCH */}
            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search code, book, author…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400"
              />

            </div>

            {/* BOOK FILTER */}
            <select
              value={bookFilter}
              onChange={(event) =>
                setBookFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                All Books
              </option>

              {books.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>

            {/* LOCATION FILTER */}
            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                All Locations
              </option>

              {locations.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

          </div>

          {/* SELECTION CONTROLS */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

            <button
              type="button"
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
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear All
              </button>

            </div>

          </div>

        </div>

        {/* COPY LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

          <div className="border-b border-slate-100 px-5 py-4">

            <h2 className="font-semibold text-slate-900">
              Available Book Copies
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sold copies are excluded from QR printing.
            </p>

          </div>

          {filteredCopies.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No available copies match your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {filteredCopies.map((copy) => {
                const book = (copy as any).book;
                const location = (copy as any).location;

                const isSelected =
                  selected.has(copy.id);

                return (
                  <button
                    key={copy.id}
                    type="button"
                    onClick={() =>
                      toggleCopy(copy.id)
                    }
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                      isSelected
                        ? 'bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >

                    {/* CHECKBOX */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Check size={14} />
                      )}
                    </div>

                    {/* QR PREVIEW */}
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

                    {/* DETAILS */}
                    <div className="min-w-0 flex-1">

                      <div className="font-mono text-sm font-bold text-slate-900">
                        {copy.unique_code}
                      </div>

                      <div className="truncate text-sm font-medium text-slate-700">
                        {book?.title ||
                          'Unknown book'}
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">

                        {book?.author && (
                          <span>
                            {book.author}
                          </span>
                        )}

                        <span>
                          {location?.name ||
                            'No location'}
                        </span>

                      </div>

                    </div>

                    {/* STATUS */}
                    <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                      Available
                    </span>

                  </button>
                );
              })}

            </div>
          )}

        </div>

        {/* PRINT INFORMATION */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">

          <strong className="text-slate-800">
            Printing:
          </strong>{' '}

          A4 paper, 12 labels per page
          (3 columns × 4 rows).

          Each QR code uses the existing copy
          code, for example{' '}

          <span className="font-mono font-semibold">
            CC-00001
          </span>

          .

        </div>

      </div>

      {/* =====================================================
          PRINT-ONLY QR SHEET
          ===================================================== */}

      <div
        className="qr-print-sheet"
        aria-hidden="true"
      >

        {copies
          .filter((copy) =>
            selected.has(copy.id)
          )
          .map((copy) => {
            const book = (copy as any).book;

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
