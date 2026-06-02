import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ChevronLeftIcon, LocationIcon, PlusIcon, TagIcon } from '../components/Icons';
import MobileLayout from '../components/MobileLayout';
import {
  buildingsByArea,
  composeLocation,
  DEFAULT_CATEGORY_OPTIONS,
  findAreaForBuilding,
  getLocationDetails,
  toCategoryOptions,
} from '../data/postOptions';
import api from '../services/api';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const todayValue = new Date().toISOString().slice(0, 10);

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
  const [categories, setCategories] = useState(DEFAULT_CATEGORY_OPTIONS);
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/posts/categories')
      .then(({ data }) => setCategories(toCategoryOptions(data)))
      .catch(() => {});
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(form.category_id)),
    [categories, form.category_id],
  );
  const selectedImages = useMemo(() => images.filter(Boolean), [images]);
  const locationDetailOptions = useMemo(() => getLocationDetails(building), [building]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyLocation(nextArea, nextBuilding, nextLocationDetail) {
    setForm((current) => ({ ...current, location: composeLocation(nextArea, nextBuilding, nextLocationDetail) }));
  }

  function handleBuildingChange(value) {
    const nextArea = findAreaForBuilding(value);
    setArea(nextArea);
    setBuilding(value);
    setLocationDetail('');
    applyLocation(nextArea, value, '');
  }

  function handleLocationDetailChange(value) {
    setLocationDetail(value);
    applyLocation(area, building, value);
  }

  async function handleImages(event, index) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Each image must be 15MB or less.');
      event.target.value = '';
      return;
    }

    setError('');
    const dataUrl = await readFileAsDataUrl(file);
    setImages((current) => {
      const next = [...current];
      next[index] = dataUrl;
      return next;
    });
    event.target.value = '';
  }

  function removeImage(index) {
    setImages((current) => {
      const next = [...current];
      next[index] = undefined;
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (form.date_occurred && form.date_occurred > todayValue) {
      setError('You cannot choose a future date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post('/posts', {
        ...form,
        category_id: form.category_id || null,
        images: selectedImages,
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

        <section className="space-y-6 px-5 pb-28 pt-5">
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
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
                  >
                    <label className="flex h-full w-full cursor-pointer items-center justify-center">
                      {image ? (
                        <img alt="Selected upload preview" className="h-full w-full object-cover" src={image} />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <PlusIcon className="h-6 w-6" />
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>
                      )}
                      <input className="sr-only" type="file" accept="image/*" onChange={(e) => handleImages(e, index)} />
                    </label>
                    {image && (
                      <button
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-lg font-bold leading-none text-red-500 shadow-sm"
                        type="button"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => removeImage(index)}
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-700">
              {selectedCategory?.label || 'Item'} post
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {selectedImages.length}/{MAX_IMAGES} photos selected. Total upload limit is 15MB.
            </p>
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
              required
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
            <div>
              <button
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-base outline-none transition ${
                  isLocationOpen || form.location
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
                type="button"
                onClick={() => setIsLocationOpen((current) => !current)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {form.location || 'Choose campus location'}
                </span>
                <span className="shrink-0 text-xs font-semibold text-blue-600">
                  {isLocationOpen ? 'Close' : 'Detail'}
                </span>
              </button>

              {isLocationOpen && (
                <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                    value={building}
                    onChange={(event) => handleBuildingChange(event.target.value)}
                  >
                    <option value="">Choose KAIST building</option>
                    {Object.entries(buildingsByArea).map(([areaName, buildingNames]) => (
                      <optgroup key={areaName} label={areaName}>
                        {buildingNames.map((buildingName) => (
                          <option key={buildingName} value={buildingName}>{buildingName}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {building && (
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                      value={locationDetail}
                      onChange={(event) => handleLocationDetailChange(event.target.value)}
                    >
                      <option value="">Any floor / entrance</option>
                      {locationDetailOptions.map((detail) => (
                        <option key={detail} value={detail}>{detail}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </FieldShell>

          <FieldShell label={form.type === 'lost' ? 'Lost date' : 'Found date'} icon={CalendarIcon}>
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500"
              required
              type="date"
              max={todayValue}
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

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </section>

        <div className="sticky bottom-0 z-20 mt-auto border-t border-slate-100 bg-white px-5 pb-6 pt-4">
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
