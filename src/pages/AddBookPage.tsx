import { useState } from 'react';
import { useLocations } from '@/hooks/useLocations';
import { createBook, updateBook } from '@/lib/queries';
import { ALL_TAGS, LEVELS, type Level } from '@/lib/types';
import { LEVEL_LABELS, COVER_COLORS, COVER_COLOR_NAMES } from '@/lib/constants';
import { useRouter } from '@/lib/router';
import { useToast } from '@/components/Toast';
import { BookSpine } from '@/components/BookSpine';
import { Check, ArrowLeft } from 'lucide-react';
import type { BookWithTags } from '@/lib/types';

interface AddBookPageProps {
  editBook?: BookWithTags;
}

export function AddBookPage({ editBook }: AddBookPageProps) {
  const { locations } = useLocations();
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState(editBook?.title || '');
  const [author, setAuthor] = useState(editBook?.author || '');
  const [price, setPrice] = useState(editBook ? String(editBook.price) : '');
  const [level, setLevel] = useState<Level>(editBook?.level || 'all_levels');
  const [coverColor, setCoverColor] = useState(editBook?.cover_color || 'amber');
  const [notes, setNotes] = useState(editBook?.notes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editBook?.book_tags?.map((t) => t.tag) || []);
  const [copies, setCopies] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast('Title is required');
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) return toast('Enter a valid price');

    setSaving(true);
    try {
      if (editBook) {
        await updateBook(editBook.id, {
          title: title.trim(),
          author: author.trim(),
          price: priceNum,
          level,
          cover_color: coverColor,
          notes: notes.trim(),
          tags: selectedTags,
        });
        navigate(`/book/${editBook.id}`);
      } else {
        const copiesNum = Math.max(1, parseInt(copies) || 1);
        if (!locationId) return toast('Select an initial location');
        const book = await createBook({
          title: title.trim(),
          author: author.trim(),
          price: priceNum,
          level,
          cover_color: coverColor,
          notes: notes.trim(),
          tags: selectedTags,
          copies: copiesNum,
          locationId,
        });
        navigate(`/book/${book.id}`);
      }
    } catch (err) {
      console.error(err);
      toast(editBook ? 'Failed to update book' : 'Failed to add book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(editBook ? `/book/${editBook.id}` : '/books')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{editBook ? 'Edit Book' : 'Add a Book'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <BookSpine book={{ title: title || 'Book Title', author, cover_color: coverColor }} size="lg" />
          <div className="text-sm text-slate-500">
            <p className="font-medium text-slate-700">Live preview</p>
            <p>This shows how the book spine will appear in lists.</p>
          </div>
        </div>

        {/* Required fields */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Details</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. Chess Fundamentals"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. José Capablanca"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Price (₹) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Cover Color</label>
            <div className="flex flex-wrap gap-2">
              {COVER_COLOR_NAMES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCoverColor(c)}
                  className={`h-9 w-9 rounded-lg ${COVER_COLORS[c].bg} transition ${
                    coverColor === c ? 'ring-2 ring-offset-2 ring-slate-900' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {coverColor === c && <Check size={16} className="mx-auto text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Topics</h2>
          <p className="text-sm text-slate-500">Select one or more topics this book covers.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  selectedTags.includes(tag)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory (only for new books) */}
        {!editBook && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Inventory</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Number of Copies</label>
                <input
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) => setCopies(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Initial Location</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Select location…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Each copy will get its own unique ID and QR code automatically.
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Notes (optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Any extra notes about this book…"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(editBook ? `/book/${editBook.id}` : '/books')}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editBook ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </form>
    </div>
  );
}
