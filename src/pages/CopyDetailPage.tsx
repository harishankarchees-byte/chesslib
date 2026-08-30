import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { fetchCopyByCode, fetchMovements } from '@/lib/queries';
import { useLocations } from '@/hooks/useLocations';
import { useRouter } from '@/lib/router';
import { LEVEL_LABELS, coverStyle } from '@/lib/constants';
import { BookSpine } from '@/components/BookSpine';
import { CopyActions } from '@/components/CopyActions';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

export function CopyDetailPage({ code }: { code: string }) {
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [copy, setCopy] = useState<
    Awaited<ReturnType<typeof fetchCopyByCode>> | null
  >(null);

  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof fetchMovements>>
  >([]);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  /*
   * Admin locations are only needed when the visitor is authenticated.
   */
  const { locations } = useLocations();

  /* =========================================================
     CHECK ADMIN LOGIN
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setIsAdmin(!!session);
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsAdmin(!!session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     LOAD COPY
     ========================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      /*
       * QR code contains unique_code, for example:
       * CC-00001
       */
      const c = await fetchCopyByCode(code);

      setCopy(c);

      /*
       * History is private to admin.
       */
      if (c && isAdmin) {
        const movements = await fetchMovements(c.id);
        setHistory(movements);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load copy:', error);

      setCopy(null);
      setHistory([]);

      toast('Failed to load copy');
    } finally {
      setLoading(false);
    }
  }, [code, toast, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  /* =========================================================
     COPY NOT FOUND
     ========================================================= */

  if (!copy) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <p className="text-slate-500">Copy not found.</p>

        <button
          onClick={() => navigate('/scan')}
          className="mt-3 text-sm font-semibold text-slate-900 underline"
        >
          Scan again
        </button>
      </div>
    );
  }

  /* =========================================================
     BOOK DATA
     ========================================================= */

  const book = copy.book as {
    id: string;
    title: string;
    author: string | null;
    price: number;
    level: string;
    cover_color: string | null;
    notes?: string | null;
  };

  const location = (
    copy as {
      location?: {
        id: string;
        name: string;
      } | null;
    }
  ).location;

  const style = coverStyle(book.cover_color);

  return (
    <div className="mx-auto max-w-md space-y-5">

      {/* =====================================================
          BACK BUTTON
          ===================================================== */}

      <button
        onClick={() => navigate(isAdmin ? '/books' : '/')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* =====================================================
          BOOK INFORMATION
          PUBLIC + ADMIN
          ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">

        <div className="flex items-center gap-4">

          <BookSpine book={book} size="lg" />

          <div className="min-w-0 flex-1">

            <h1 className="text-xl font-bold leading-tight text-slate-900">
              {book.title}
            </h1>

            {book.author && (
              <p className="text-sm text-slate-500">
                {book.author}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">

              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {LEVEL_LABELS[book.level]}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${style.bg}`}
              >
                ₹{Number(book.price).toLocaleString('en-IN')}
              </span>

            </div>
          </div>
        </div>

        {/* =================================================
            BOOK INFORMATION / NOTES
            ================================================= */}

        {book.notes && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Book Information
            </div>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {book.notes}
            </p>
          </div>
        )}

      </div>

      {/* =====================================================
          PUBLIC SOLD PRICE
          Only shown when the copy is sold.
          ===================================================== */}

      {copy.status === 'sold' && copy.sold_price != null && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">

          <div className="text-xs uppercase tracking-wide text-slate-400">
            Sold Price
          </div>

          <div className="mt-1 text-lg font-bold text-rose-700">
            ₹{Number(copy.sold_price).toLocaleString('en-IN')}
          </div>

        </div>
      )}

      {/* =====================================================
          ADMIN-ONLY COPY INFORMATION
          ===================================================== */}

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">

          <div className="mb-4 grid grid-cols-2 gap-4">

            {/* Copy ID */}

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Copy ID
              </div>

              <div className="font-mono text-lg font-bold text-slate-900">
                {copy.unique_code}
              </div>
            </div>

            {/* Status */}

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Status
              </div>

              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                  copy.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {copy.status === 'available' ? 'Available' : 'Sold'}
              </div>
            </div>

            {/* Location */}

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Location
              </div>

              <div className="text-sm font-semibold text-slate-800">
                {location?.name || '—'}
              </div>
            </div>

          </div>

          {/* =================================================
              ADMIN ACTIONS
              ================================================= */}

          <CopyActions
            copy={{
              ...copy,
              book: {
                title: book.title,
                author: book.author,
                price: Number(book.price),
              },
              location: location || null,
            }}
            locations={locations}
            onChanged={load}
          />

        </div>
      )}

      {/* =====================================================
          ADMIN-ONLY LOCATION HISTORY
          ===================================================== */}

      {isAdmin && history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">

          <h2 className="mb-3 font-semibold text-slate-900">
            Location History
          </h2>

          <div className="space-y-2">

            {history.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm"
              >
                <span className="text-slate-700">
                  {(m.from_loc as { name: string } | null)?.name || '—'}
                  {' → '}
                  {(m.to_loc as { name: string } | null)?.name || '—'}
                </span>

                <span className="text-xs text-slate-400">
                  {new Date(m.moved_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* =====================================================
          PUBLIC MESSAGE
          ===================================================== */}

      {!isAdmin && (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-400">
          Book information
        </div>
      )}

    </div>
  );
}
