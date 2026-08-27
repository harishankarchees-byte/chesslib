import { Settings as SettingsIcon, Info } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your inventory system</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Info size={20} />
          </div>
          <h2 className="font-semibold text-slate-900">About</h2>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p>Chess Book Inventory Manager helps you track every physical copy of your chess books with unique QR codes.</p>
          <p>Each copy has its own ID (e.g. CC-00001) and QR label. Scan a book to instantly see its details, move it between locations, or mark it sold.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <SettingsIcon size={20} />
          </div>
          <h2 className="font-semibold text-slate-900">How to use</h2>
        </div>
        <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600">
          <li>Add a book with its title, author, price, level, and topics.</li>
          <li>Set how many copies you have and where they are. Each copy gets a unique ID automatically.</li>
          <li>Print QR labels from the book's page and stick them inside each book.</li>
          <li>Scan a book's QR code with your phone to quickly move it or mark it sold.</li>
          <li>Use the Dashboard and Reports to see your inventory value and sales.</li>
        </ol>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Locations</h2>
        <p className="text-sm text-slate-600">
          Manage your storage locations from the <a href="#/locations" className="font-semibold text-slate-900 underline">Locations page</a>.
          You can add custom locations like "Tournament" or "Storage" beyond the defaults.
        </p>
      </div>
    </div>
  );
}
