import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarIcon, ChevronLeftIcon, LocationIcon, TagIcon } from '../components/Icons';
import MobileLayout from '../components/MobileLayout';
import { getMockPost } from '../data/mockPosts';
import api from '../services/api';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const nextStatuses = {
  open: ['hidden', 'claimed'],
  hidden: [],
  claimed: ['pending_resolution'],
  pending_resolution: ['resolved'],
  resolved: [],
};

const statusCopy = {
  open: 'Open',
  hidden: 'Hidden',
  claimed: 'Claimed',
  pending_resolution: 'Pending Resolution',
  resolved: 'Resolved',
};

const statusStyles = {
  open: 'bg-green-100 text-green-700',
  hidden: 'bg-slate-100 text-slate-600',
  claimed: 'bg-amber-100 text-amber-700',
  pending_resolution: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  if (!value) return 'Not specified';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function normalizePost(data) {
  return {
    ...data,
    category_name: data.category_name || data.category || 'Item',
    author_name: data.author_name || data.owner_name || (data.type === 'found' ? 'Finder' : 'Owner'),
    images: data.images || [],
  };
}

function IconButton({ label, children, onClick, tone = 'bg-white/90 text-slate-900' }) {
  return (
    <button
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur ${tone}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
    </svg>
  );
}

function DetailRow({ icon: RowIcon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <RowIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function StatusStepper({ status }) {
  const steps = ['open', 'claimed', 'pending_resolution', 'resolved'];
  const activeIndex = Math.max(steps.indexOf(status), 0);

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className={`h-3 w-3 rounded-full ${index <= activeIndex ? 'bg-blue-600' : 'bg-slate-300'}`} />
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${index < activeIndex ? 'bg-blue-600' : 'bg-slate-300'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-[10px] font-semibold text-slate-500">
        <span>Open</span>
        <span>Claimed</span>
        <span>Pending</span>
        <span>Resolved</span>
      </div>
    </div>
  );
}

function EditForm({ form, error, onCancel, onChange, onImages, onSubmit }) {
  return (
    <MobileLayout showHeader={false}>
      <form className="min-h-full bg-white" onSubmit={onSubmit}>
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <button
              aria-label="Cancel edit"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              type="button"
              onClick={onCancel}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-medium text-slate-400">Post Details</p>
              <h1 className="text-2xl font-bold text-slate-950">Edit Post</h1>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {['lost', 'found'].map((type) => (
              <button
                key={type}
                className={`rounded-xl px-4 py-3 text-sm font-bold capitalize ${
                  form.type === type ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
                }`}
                type="button"
                onClick={() => onChange('type', type)}
              >
                {type}
              </button>
            ))}
          </div>

          <input
            className="h-[52px] w-full rounded-2xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-blue-500"
            required
            value={form.title}
            onChange={(event) => onChange('title', event.target.value)}
          />
          <textarea
            className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500"
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
          />
          <input
            className="h-[52px] w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
            value={form.location}
            onChange={(event) => onChange('location', event.target.value)}
          />
          <input
            className="h-[52px] w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
            type="date"
            value={form.date_occurred}
            onChange={(event) => onChange('date_occurred', event.target.value)}
          />
          <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-blue-600">
            Replace Photos
            <input className="sr-only" type="file" accept="image/*" multiple onChange={onImages} />
          </label>
          {form.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {form.images.map((image) => (
                <img key={image} className="aspect-square rounded-2xl object-cover" src={image} alt="Selected upload preview" />
              ))}
            </div>
          )}
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </section>

        <div className="sticky bottom-24 mt-auto border-t border-slate-100 bg-white px-5 py-4">
          <button className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </MobileLayout>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let isActive = true;

    api.get(`/posts/${id}`)
      .then(({ data }) => {
        if (!isActive) return;
        const normalized = normalizePost(data);
        setPost(normalized);
        setForm({
          type: normalized.type,
          title: normalized.title,
          description: normalized.description || '',
          category_id: normalized.category_id || '',
          location: normalized.location || '',
          date_occurred: normalized.date_occurred ? normalized.date_occurred.slice(0, 10) : '',
          images: normalized.images || [],
        });
      })
      .catch((requestError) => {
        if (!isActive) return;
        const fallback = getMockPost(id);
        if (fallback) {
          const normalized = normalizePost(fallback);
          setPost(normalized);
          setForm({
            type: normalized.type,
            title: normalized.title,
            description: normalized.description || '',
            category_id: normalized.category_id || '',
            location: normalized.location || '',
            date_occurred: normalized.date_occurred || '',
            images: normalized.images || [],
          });
          setError('');
          return;
        }
        setError(requestError.response?.data?.error || 'Failed to load post.');
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const heroImage = useMemo(() => post?.images?.[activeImage] || post?.images?.[0], [activeImage, post]);
  const availableNextStatuses = nextStatuses[post?.status] || [];

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
    updateField('images', await Promise.all(files.map(readFileAsDataUrl)));
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.put(`/posts/${id}`, {
        ...form,
        category_id: form.category_id || null,
      });
      setPost(normalizePost(data));
      setEditMode(false);
    } catch {
      setPost((current) => normalizePost({ ...current, ...form }));
      setEditMode(false);
    }
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
    } catch {
      // Local mock mode has no persistent backend detail store.
    }
    navigate('/');
  }

  async function changeStatus(status) {
    setError('');
    try {
      const { data } = await api.patch(`/posts/${id}/status`, { status });
      const normalized = normalizePost(data);
      setPost(normalized);
      setForm((current) => ({ ...current, ...normalized }));
    } catch {
      setPost((current) => normalizePost({ ...current, status }));
      setForm((current) => ({ ...current, status }));
    }
  }

  if (error && !post) {
    return (
      <MobileLayout>
        <main className="px-5 py-10 text-sm font-medium text-red-600">{error}</main>
      </MobileLayout>
    );
  }

  if (!post || !form) {
    return (
      <MobileLayout>
        <main className="px-5 py-10 text-sm font-medium text-slate-500">Loading...</main>
      </MobileLayout>
    );
  }

  if (editMode) {
    return (
      <EditForm
        form={form}
        error={error}
        onCancel={() => setEditMode(false)}
        onChange={updateField}
        onImages={handleImages}
        onSubmit={saveEdit}
      />
    );
  }

  return (
    <MobileLayout showHeader={false}>
      <article className="min-h-full bg-white">
        <section className="relative h-[360px] overflow-hidden bg-slate-100">
          {heroImage ? (
            <img className="h-full w-full object-cover" src={heroImage} alt={post.title} />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-400">
              No image
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
            <IconButton label="Go back" onClick={() => navigate(-1)}>
              <ChevronLeftIcon className="h-5 w-5" />
            </IconButton>
            <div className="flex gap-2">
              <IconButton label="Edit post" onClick={() => setEditMode(true)}>
                <EditIcon />
              </IconButton>
              <IconButton label="Delete post" tone="bg-white/90 text-red-600" onClick={deletePost}>
                <TrashIcon />
              </IconButton>
            </div>
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold capitalize text-slate-950 shadow-sm">
                {post.type}
              </span>
              <span className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm ${statusStyles[post.status] || statusStyles.open}`}>
                {statusCopy[post.status] || post.status}
              </span>
            </div>
          </div>
        </section>

        {post.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-5 py-4">
            {post.images.map((image, index) => (
              <button
                key={image}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 ${
                  activeImage === index ? 'border-blue-600' : 'border-transparent'
                }`}
                type="button"
                onClick={() => setActiveImage(index)}
              >
                <img className="h-full w-full object-cover" src={image} alt="" />
              </button>
            ))}
          </div>
        )}

        <section className="space-y-5 px-5 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">{post.category_name}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-950">{post.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-600">
              {post.description || 'No description.'}
            </p>
          </div>

          <div className="grid gap-3">
            <DetailRow icon={LocationIcon} label="Location" value={post.location || 'Not specified'} />
            <DetailRow icon={CalendarIcon} label={post.type === 'found' ? 'Found date' : 'Lost date'} value={formatDate(post.date_occurred)} />
            <DetailRow icon={TagIcon} label={post.type === 'found' ? 'Finder' : 'Owner'} value={post.author_name || `User #${post.user_id}`} />
          </div>

          <StatusStepper status={post.status} />

          {availableNextStatuses.length > 0 && (
            <div className="space-y-3">
              {availableNextStatuses.map((status) => (
                <button
                  key={status}
                  className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white shadow-sm"
                  type="button"
                  onClick={() => changeStatus(status)}
                >
                  Mark as {statusCopy[status] || status.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {post.status === 'resolved' && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
              This post has been resolved.
            </div>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </section>
      </article>
    </MobileLayout>
  );
}
