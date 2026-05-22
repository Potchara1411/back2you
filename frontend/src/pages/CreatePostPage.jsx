import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ChevronLeftIcon, LocationIcon, PlusIcon, TagIcon } from '../components/Icons';
import MobileLayout from '../components/MobileLayout';
import api from '../services/api';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DEFAULT_CATEGORIES = [
  { id: 1, label: 'Electronics' }, { id: 2, label: 'Clothing' },
  { id: 3, label: 'Books' }, { id: 4, label: 'Accessories' },
  { id: 5, label: 'Keys' }, { id: 6, label: 'Wallet' },
  { id: 7, label: 'ID Card' }, { id: 8, label: 'Other' },
];

const initialForm = {
  type: 'lost',
  title: '',
  description: '',
  category_id: '',
  location: '',
  date_occurred: '',
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FieldShell({ icon: FieldIcon, label, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {FieldIcon && <FieldIcon className="h-4 w-4 text-blue-600" />}
        {label}
      </span>
      {children}
    </label>
  );
}

export default function CreatePostPage() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/posts/categories')
      .then(({ data }) => setCategories(data.map(c => ({ id: c.id, label: c.name }))))
      .catch(() => {});
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(form.category_id)),
    [form.category_id],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleImages(event) {
    const files = Array.from(event.target.files || []);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (files.length > MAX_IMAGES) {
      setError('You can upload up to 3 images.');
      event.target.value = '';
      return;
    }

    if (totalBytes > MAX_IMAGE_BYTES) {
      setError('Images must be 15MB or less in total.');
      event.target.value = '';
      return;
    }

    setError('');
    setImages(await Promise.all(files.map(readFileAsDataUrl)));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data } = await api.post('/posts', {
        ...form,
        category_id: form.category_id || null,
        images,
      });
      navigate(`/posts/${data.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MobileLayout showHeader={false}>
      <form className="flex min-h-full flex-col bg-white" onSubmit={submit}>
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <button
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              type="button"
              onClick={() => navigate(-1)}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-400">KAIST Lost & Found</p>
              <h1 className="text-2xl font-bold text-slate-950">Create Post</h1>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 py-5">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {['lost', 'found'].map((type) => (
              <button
                key={type}
                className={`rounded-xl px-4 py-3 text-sm font-bold capitalize transition ${
                  form.type === type ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
                }`}
                type="button"
                onClick={() => updateField('type', type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">Photos</span>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                const image = images[index];
                return (
                  <label
                    key={index}
                    className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
                  >
                    {image ? (
                      <img alt="Selected upload preview" className="h-full w-full object-cover" src={image} />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <PlusIcon className="h-6 w-6" />
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                    )}
                    {index === 0 && (
                      <input className="sr-only" type="file" accept="image/*" multiple onChange={handleImages} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <FieldShell label="Title">
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-950 outline-none focus:border-blue-500"
              placeholder="What item is it?"
              required
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </FieldShell>

          <FieldShell label="Category" icon={TagIcon}>
            <select
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500"
              value={form.category_id}
              onChange={(event) => updateField('category_id', event.target.value)}
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label={form.type === 'lost' ? 'Lost location' : 'Found location'} icon={LocationIcon}>
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500"
              placeholder="Building, floor, or nearby place"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
            />
          </FieldShell>

          <FieldShell label={form.type === 'lost' ? 'Lost date' : 'Found date'} icon={CalendarIcon}>
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500"
              type="date"
              value={form.date_occurred}
              onChange={(event) => updateField('date_occurred', event.target.value)}
            />
          </FieldShell>

          <FieldShell label="Description">
            <textarea
              className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-blue-500"
              placeholder="Add color, brand, unique marks, or where it was last seen."
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </FieldShell>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-700">
              {selectedCategory?.label || 'Item'} post
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {images.length}/{MAX_IMAGES} photos selected. Total upload limit is 15MB.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </section>

        <div className="sticky bottom-24 mt-auto border-t border-slate-100 bg-white px-5 py-4 sm:bottom-24">
          <button
            className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Posting...' : 'Post Item'}
          </button>
        </div>
      </form>
    </MobileLayout>
  );
}
