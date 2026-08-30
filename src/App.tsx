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

import { fetchBook } from '@/lib/queries';
import { useEffect, useState } from 'react';

import type { BookWithTags } from '@/lib/types';

/* =========================================================
   ROUTES
   ========================================================= */

function Routes() {
  const { path } = useRouter();

  /* Dashboard */
  if (path === '/' || path === '') {
    return <DashboardPage />;
  }

  /* Main admin pages */
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

  /* Book detail */
  const bookMatch = path.match(/^\/book\/(.+)$/);

  if (bookMatch) {
    return <BookDetailPage bookId={bookMatch[1]} />;
  }

  /* Public QR copy page */
  const copyMatch = path.match(/^\/copy\/(.+)$/);

  if (copyMatch) {
    return (
      <CopyDetailPage
        code={decodeURIComponent(copyMatch[1])}
      />
    );
  }

  /* Edit book */
  const editMatch = path.match(/^\/edit\/(.+)$/);

  if (editMatch) {
    return (
      <EditBookLoader
        bookId={editMatch[1]}
      />
    );
  }

  /* Unknown route */
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
   ROUTER CONTENT
   ========================================================= */

function AppContent() {
  const { path } = useRouter();

  /*
   * QR CODE PAGES ARE PUBLIC.
   *
   * Example:
   * /copy/CC-00001
   *
   * These pages intentionally bypass AppShell.
   */

  const isPublicCopyPage =
    /^\/copy\/.+$/.test(path);

  if (isPublicCopyPage) {
    return <Routes />;
  }

  /* Everything else uses the admin shell */
  return (
    <AppShell>
      <Routes />
    </AppShell>
  );
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
