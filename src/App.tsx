import { RouterProvider, useRouter } from '@/lib/router';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';

import { DashboardPage } from '@/pages/DashboardPage';
import { BooksPage } from '@/pages/BooksPage';
import { AddBookPage } from '@/pages/AddBookPage';
import { BookDetailPage } from '@/pages/BookDetailPage';
import { CopyDetailPage } from '@/pages/CopyDetailPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ScanPage } from '@/pages/ScanPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrintQrCodesPage } from '@/pages/PrintQrCodesPage';
import { LoginPage } from '@/pages/LoginPage';

import { fetchBook } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

import { useEffect, useState } from 'react';

import type { BookWithTags } from '@/lib/types';

/* =========================================================
   ROUTES
   ========================================================= */

function Routes() {
  const { path } = useRouter();

  /* -------------------------------------------------------
     DASHBOARD
     ------------------------------------------------------- */

  if (path === '/' || path === '') {
    return <DashboardPage />;
  }

  /* -------------------------------------------------------
     MAIN ADMIN PAGES
     ------------------------------------------------------- */

  if (path === '/books') {
    return <BooksPage />;
  }

  if (path === '/add') {
    return <AddBookPage />;
  }

  if (path === '/inventory') {
    return <InventoryPage />;
  }

  if (path === '/scan') {
    return <ScanPage />;
  }

  if (path === '/locations') {
    return <LocationsPage />;
  }

  if (path === '/reports') {
    return <ReportsPage />;
  }

  if (path === '/settings') {
    return <SettingsPage />;
  }

  /* -------------------------------------------------------
     PRINT QR CODES
     ------------------------------------------------------- */

  if (path === '/print-qr') {
    return <PrintQrCodesPage />;
  }

  /* -------------------------------------------------------
     BOOK DETAIL
     ------------------------------------------------------- */

  const bookMatch = path.match(/^\/book\/(.+)$/);

  if (bookMatch) {
    return <BookDetailPage bookId={bookMatch[1]} />;
  }

  /* -------------------------------------------------------
     PUBLIC QR COPY PAGE
     ------------------------------------------------------- */

  const copyMatch = path.match(/^\/copy\/(.+)$/);

  if (copyMatch) {
    return (
      <CopyDetailPage
        code={decodeURIComponent(copyMatch[1])}
      />
    );
  }

  /* -------------------------------------------------------
     EDIT BOOK
     ------------------------------------------------------- */

  const editMatch = path.match(/^\/edit\/(.+)$/);

  if (editMatch) {
    return (
      <EditBookLoader
        bookId={editMatch[1]}
      />
    );
  }

  /* -------------------------------------------------------
     UNKNOWN ROUTE
     ------------------------------------------------------- */

  return <DashboardPage />;
}

/* =========================================================
   EDIT BOOK LOADER
   ========================================================= */

function EditBookLoader({
  bookId,
}: {
  bookId: string;
}) {
  const [book, setBook] =
    useState<BookWithTags | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetchBook(bookId)
      .then(setBook)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Book not found.
      </div>
    );
  }

  return <AddBookPage editBook={book} />;
}

/* =========================================================
   AUTHENTICATED ADMIN AREA
   ========================================================= */

function AdminArea() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setAuthenticated(!!session);
      setChecking(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setAuthenticated(!!session);
        setChecking(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------------
     CHECKING AUTH
     ------------------------------------------------------- */

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">
          Checking login…
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     NOT LOGGED IN
     ------------------------------------------------------- */

  if (!authenticated) {
    return <LoginPage />;
  }

  /* -------------------------------------------------------
     AUTHENTICATED ADMIN
     ------------------------------------------------------- */

  return (
    <AppShell>
      <Routes />
    </AppShell>
  );
}

/* =========================================================
   PUBLIC / ADMIN ROUTER
   ========================================================= */

function AppContent() {
  const { path } = useRouter();

  /*
   * QR COPY PAGES ARE PUBLIC.
   *
   * Example:
   *
   * #/copy/CC-00001
   *
   * These pages bypass AdminArea and AppShell.
   */

  const isPublicCopyPage =
    /^\/copy\/.+$/.test(path);

  if (isPublicCopyPage) {
    return <Routes />;
  }

  /*
   * Everything else requires authentication.
   */

  return <AdminArea />;
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  return (
    <ToastProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </ToastProvider>
  );
}

export default App;
