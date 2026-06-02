import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarIcon, ChevronLeftIcon, LocationIcon, PlusIcon, TagIcon } from '../components/Icons';
import MobileLayout from '../components/MobileLayout';
import { useAuth } from '../context/AuthContext';
import { getMockPost } from '../data/mockPosts';
import {
  buildingsByArea,
  composeLocation,
  DEFAULT_CATEGORY_OPTIONS,
  findAreaForBuilding,
  getLocationDetails,
  parseLocationParts,
  toCategoryOptions,
} from '../data/postOptions';
import api from '../services/api';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const todayValue = new Date().toISOString().slice(0, 10);
const nextStatuses = {
  open: [],
  hidden: [],
  claimed: ['pending_resolution'],
  pending_resolution: [],
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
    claim_requests: data.claim_requests || [],
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
  const steps = ['open', 'claimed', 'resolved'];
  const displayStatus = status === 'pending_resolution' ? 'claimed' : status === 'hidden' ? 'open' : status;
  const activeIndex = Math.max(steps.indexOf(displayStatus), 0);

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
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-semibold text-slate-500">
        <span className="text-left">Open</span>
        <span className="text-center">Claimed</span>
        <span className="text-right">Resolved</span>
      </div>
    </div>
  );
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

function LocationSelector({ label, location, onChange }) {
  const initialLocation = useMemo(() => parseLocationParts(location), [location]);
  const [area, setArea] = useState(initialLocation.area);
  const [building, setBuilding] = useState(initialLocation.building);
  const [locationDetail, setLocationDetail] = useState(initialLocation.detail);
  const [isOpen, setIsOpen] = useState(false);
  const locationDetailOptions = useMemo(() => getLocationDetails(building), [building]);

  function applyLocation(nextArea, nextBuilding, nextLocationDetail) {
    onChange(composeLocation(nextArea, nextBuilding, nextLocationDetail));
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

  return (
    <FieldShell label={label} icon={LocationIcon}>
      <div>
        <button
          className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-base outline-none transition ${
            isOpen || location
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="min-w-0 flex-1 truncate">
            {location || 'Choose campus location'}
          </span>
          <span className="shrink-0 text-xs font-semibold text-blue-600">
            {isOpen ? 'Close' : 'Detail'}
          </span>
        </button>

        {isOpen && (
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
  );
}

function EditForm({ categories, form, error, onCancel, onChange, onImageChange, onImageRemove, onSubmit }) {
  return (
    <MobileLayout showHeader={false}>
      <form className="flex min-h-full flex-col bg-white" onSubmit={onSubmit}>
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

        <section className="space-y-5 px-5 pb-28 pt-5">
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

          <FieldShell label="Title">
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-blue-500"
              required
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
            />
          </FieldShell>

          <FieldShell label="Description">
            <textarea
              className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
            />
          </FieldShell>

          <FieldShell label="Category" icon={TagIcon}>
            <select
              className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500"
              required
              value={form.category_id}
              onChange={(event) => onChange('category_id', event.target.value)}
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </FieldShell>

          <LocationSelector
            label={form.type === 'lost' ? 'Lost location' : 'Found location'}
            location={form.location}
            onChange={(value) => onChange('location', value)}
          />

          <FieldShell label={form.type === 'lost' ? 'Lost date' : 'Found date'} icon={CalendarIcon}>
            <input
              className="h-[52px] w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
              type="date"
              max={todayValue}
              value={form.date_occurred}
              onChange={(event) => onChange('date_occurred', event.target.value)}
            />
          </FieldShell>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Photos</p>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                const image = form.images?.[index];
                return (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
                  >
                    <label className="flex h-full w-full cursor-pointer items-center justify-center">
                      {image ? (
                        <>
                          <img className="h-full w-full object-cover" src={image} alt="Selected upload preview" />
                          <span className="absolute inset-x-2 bottom-2 rounded-xl bg-white/90 px-2 py-1 text-center text-xs font-bold text-blue-600 shadow">
                            Replace
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <PlusIcon className="h-6 w-6" />
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>
                      )}
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => onImageChange(event, index)} />
                    </label>
                    {image && (
                      <button
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-lg font-bold leading-none text-red-500 shadow-sm"
                        type="button"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => onImageRemove(index)}
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </section>

        <div className="sticky bottom-0 z-20 mt-auto border-t border-slate-100 bg-white px-5 pb-6 pt-4">
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
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORY_OPTIONS);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [claimForm, setClaimForm] = useState({
    message: '',
    found_location: '',
    found_date: '',
    proof_images: [],
  });
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  useEffect(() => {
    api.get('/posts/categories')
      .then(({ data }) => setCategories(toCategoryOptions(data)))
      .catch(() => {});
  }, []);

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
  const isPostOwner = Boolean(user && post && Number(user.id) === Number(post.user_id));
  const isAdmin = user?.role === 'admin';
  const canEditPost = isPostOwner && post?.status === 'open';
  const visibleClaims = post?.claim_requests || [];
  const ownActiveClaim = visibleClaims.find((claim) => (
    Number(claim.claimant_user_id) === Number(user?.id)
    && ['pending', 'accepted'].includes(claim.status)
  ));
  const canSubmitClaim = Boolean(user && post && !isPostOwner && post.status === 'open' && !ownActiveClaim);
  const canReviewClaims = Boolean(post && (isPostOwner || isAdmin));
  const selectedCategoryId = form?.category_id || categories.find((category) => category.label === post?.category_name)?.id || '';
  const isClaimingLostPost = post?.type === 'lost';
  const claimDateLabel = isClaimingLostPost ? 'Found date' : 'Lost date';
  const claimMessagePlaceholder = isClaimingLostPost
    ? 'Message for the owner: identifying details, pickup plan, or proof.'
    : 'Message for the finder: identifying details that prove this item is yours.';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function changeImage(event, index) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Each image must be 15MB or less.');
      event.target.value = '';
      return;
    }

    setError('');
    const image = await readFileAsDataUrl(file);
    const nextImages = [...(form.images || [])];
    nextImages[index] = image;
    updateField('images', nextImages);
    event.target.value = '';
  }

  function removeImage(index) {
    const nextImages = [...(form.images || [])];
    nextImages[index] = undefined;
    updateField('images', nextImages);
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!canEditPost) {
      setError('Only open posts can be edited by the owner.');
      setEditMode(false);
      return;
    }
    if (form.date_occurred && form.date_occurred > todayValue) {
      setError('You cannot choose a future date.');
      return;
    }
    setError('');
    try {
      const { data } = await api.put(`/posts/${id}`, {
        ...form,
        category_id: form.category_id || selectedCategoryId || null,
        images: (form.images || []).filter(Boolean),
      });
      setPost(normalizePost(data));
      setEditMode(false);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to save post changes.');
    }
  }

  async function deletePost() {
    if (!isPostOwner) {
      setError('Only the owner can delete this post.');
      return;
    }
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
    } catch {
      // Local mock mode has no persistent backend detail store.
    }
    navigate('/');
  }

  async function changeStatus(status) {
    if (!isPostOwner) {
      setError('Only the owner can change this status.');
      return;
    }
    setError('');
    try {
      const { data } = await api.patch(`/posts/${id}/status`, { status });
      const normalized = normalizePost(data);
      setPost(normalized);
      setForm((current) => ({ ...current, ...normalized }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to update status.');
    }
  }

  async function handleClaimProofImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Proof image must be 15MB or less.');
      event.target.value = '';
      return;
    }

    setError('');
    const image = await readFileAsDataUrl(file);
    setClaimForm((current) => ({ ...current, proof_images: [image] }));
    event.target.value = '';
  }

  function updateClaimField(field, value) {
    setClaimForm((current) => ({ ...current, [field]: value }));
  }

  async function submitClaim(event) {
    event.preventDefault();
    if (!canSubmitClaim) return;
    if (isClaimingLostPost && !claimForm.found_location.trim()) {
      setError('Add where you found the item.');
      return;
    }
    if (!claimForm.found_date || !claimForm.message.trim()) {
      setError(`Add ${claimDateLabel.toLowerCase()} and a message.`);
      return;
    }
    if (claimForm.found_date > todayValue) {
      setError(`${claimDateLabel} cannot be in the future.`);
      return;
    }

    setClaimSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/posts/${id}/claims`, {
        message: claimForm.message.trim(),
        found_location: isClaimingLostPost ? claimForm.found_location.trim() : '',
        found_date: claimForm.found_date,
        proof_images: claimForm.proof_images,
      });
      setPost(normalizePost({
        ...post,
        ...data.post,
        claim_requests: [data.claim, ...(post.claim_requests || [])],
      }));
      setClaimForm({ message: '', found_location: '', found_date: '', proof_images: [] });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to submit claim.');
    } finally {
      setClaimSubmitting(false);
    }
  }

  async function reviewClaim(claim, status) {
    if (!canReviewClaims) return;
    setError('');

    try {
      const { data } = await api.patch(`/posts/${id}/claims/${claim.id}`, { status });
      setPost((current) => normalizePost({
        ...current,
        ...data.post,
        claim_requests: (current.claim_requests || []).map((item) => {
          if (item.id === claim.id) return { ...item, ...data.claim };
          if (status === 'accepted' && item.status === 'pending') return { ...item, status: 'rejected' };
          return item;
        }),
      }));
      setForm((current) => ({ ...current, ...data.post }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to update claim request.');
    }
  }

  async function resolveAsAdmin() {
    if (!isAdmin || post.status !== 'pending_resolution') return;
    setError('');
    try {
      const { data } = await api.patch(`/admin/posts/${id}/resolve`);
      setPost((current) => normalizePost({ ...current, ...data.post }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to resolve post.');
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
        categories={categories}
        form={{ ...form, category_id: selectedCategoryId }}
        error={error}
        onCancel={() => setEditMode(false)}
        onChange={updateField}
        onImageChange={changeImage}
        onImageRemove={removeImage}
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
            {(canEditPost || isPostOwner) && (
              <div className="flex gap-2">
                {canEditPost && (
                  <IconButton label="Edit post" onClick={() => setEditMode(true)}>
                    <EditIcon />
                  </IconButton>
                )}
                <IconButton label="Delete post" tone="bg-white/90 text-red-600" onClick={deletePost}>
                  <TrashIcon />
                </IconButton>
              </div>
            )}
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

          {canSubmitClaim && (
            <form className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4" onSubmit={submitClaim}>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  {post.type === 'lost' ? 'I found this' : 'Claim this item'}
                </h2>
              </div>
              {isClaimingLostPost && (
                <input
                  className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm outline-none focus:border-blue-500"
                  placeholder="Found location"
                  required
                  value={claimForm.found_location}
                  onChange={(event) => updateClaimField('found_location', event.target.value)}
                />
              )}
              <input
                className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm outline-none focus:border-blue-500"
                required
                aria-label={claimDateLabel}
                type="date"
                max={todayValue}
                value={claimForm.found_date}
                onChange={(event) => updateClaimField('found_date', event.target.value)}
              />
              <textarea
                className="min-h-24 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder={claimMessagePlaceholder}
                required
                value={claimForm.message}
                onChange={(event) => updateClaimField('message', event.target.value)}
              />
              <label className="block rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-4 text-center text-sm font-bold text-blue-600">
                {claimForm.proof_images.length ? 'Replace proof image' : 'Add optional proof image'}
                <input className="sr-only" type="file" accept="image/*" onChange={handleClaimProofImage} />
              </label>
              {claimForm.proof_images[0] && (
                <img className="h-24 w-24 rounded-2xl object-cover" src={claimForm.proof_images[0]} alt="Proof preview" />
              )}
              <button
                className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={claimSubmitting}
                type="submit"
              >
                {claimSubmitting ? 'Submitting...' : 'Submit Claim Request'}
              </button>
            </form>
          )}

          {ownActiveClaim && !canSubmitClaim && !canReviewClaims && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-bold text-slate-950">Your claim request is {ownActiveClaim.status}.</p>
              <p className="mt-1">{ownActiveClaim.message || ownActiveClaim.details}</p>
            </div>
          )}

          {canReviewClaims && visibleClaims.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-slate-950">Claim requests</h2>
              {visibleClaims.map((claim) => (
                <div key={claim.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {claim.claimant_name || claim.claimant_email || `User #${claim.claimant_user_id}`}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{claim.status}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      claim.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : claim.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {claim.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                    {post.type === 'lost' && (
                      <p><span className="font-semibold text-slate-900">Found location:</span> {claim.found_location || 'Not provided'}</p>
                    )}
                    <p><span className="font-semibold text-slate-900">{post.type === 'lost' ? 'Found date' : 'Lost date'}:</span> {formatDate(claim.found_date)}</p>
                    <p className="whitespace-pre-wrap">{claim.message || claim.details}</p>
                  </div>
                  {claim.proof_images?.[0] && (
                    <img className="mt-3 h-24 w-24 rounded-2xl object-cover" src={claim.proof_images[0]} alt="Claim proof" />
                  )}
                  {claim.status === 'pending' && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        className="h-11 rounded-2xl bg-blue-600 text-sm font-bold text-white"
                        type="button"
                        onClick={() => reviewClaim(claim, 'accepted')}
                      >
                        Accept
                      </button>
                      <button
                        className="h-11 rounded-2xl bg-red-50 text-sm font-bold text-red-600"
                        type="button"
                        onClick={() => reviewClaim(claim, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {isPostOwner && availableNextStatuses.length > 0 && (
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

          {isAdmin && post.status === 'pending_resolution' && (
            <button
              className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white shadow-sm"
              type="button"
              onClick={resolveAsAdmin}
            >
              Resolve as Admin
            </button>
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
