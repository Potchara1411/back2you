import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const nextStatuses = {
  open: ['hidden', 'claimed'],
  hidden: ['open'],
  claimed: ['pending_resolution'],
  pending_resolution: ['resolved'],
  resolved: [],
};

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(({ data }) => {
        setPost(data);
        setForm({
          type: data.type,
          title: data.title,
          description: data.description || '',
          category_id: data.category_id || '',
          location: data.location || '',
          date_occurred: data.date_occurred ? data.date_occurred.slice(0, 10) : '',
          images: data.images || [],
        });
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.error || 'Failed to load post.');
      });
  }, [id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.put(`/posts/${id}`, {
        ...form,
        category_id: form.category_id || null,
      });
      setPost(data);
      setEditMode(false);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to update post.');
    }
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to delete post.');
    }
  }

  async function changeStatus(status) {
    setError('');
    try {
      const { data } = await api.patch(`/posts/${id}/status`, { status });
      setPost(data);
      setForm((current) => ({ ...current, ...data }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to change status.');
    }
  }

  if (error && !post) return <main className="p-6 text-red-600">{error}</main>;
  if (!post || !form) return <main className="p-6 text-gray-500">Loading...</main>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      {!editMode ? (
        <section className="rounded border bg-white p-6">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{post.type}</span>
            <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">{post.status}</span>
            {post.category_name && <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">{post.category_name}</span>}
          </div>

          <h1 className="mt-4 text-3xl font-bold">{post.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-gray-700">{post.description || 'No description.'}</p>

          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="font-semibold">Location</dt>
              <dd>{post.location || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Date</dt>
              <dd>{post.date_occurred ? post.date_occurred.slice(0, 10) : 'Not specified'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Author</dt>
              <dd>{post.author_name || `User #${post.user_id}`}</dd>
            </div>
          </dl>

          {post.images?.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {post.images.map((image) => (
                <img key={image} className="h-48 w-full rounded object-cover" src={image} alt="Uploaded item" />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button className="rounded border px-3 py-2" onClick={() => setEditMode(true)}>Edit</button>
            <button className="rounded border border-red-300 px-3 py-2 text-red-700" onClick={deletePost}>Delete</button>
            {(nextStatuses[post.status] || []).map((status) => (
              <button key={status} className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => changeStatus(status)}>
                Mark {status}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <form className="rounded border bg-white p-6" onSubmit={saveEdit}>
          <h1 className="text-2xl font-bold">Edit post</h1>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="font-medium">Type</span>
              <select className="mt-1 w-full border p-2" value={form.type} onChange={(event) => updateField('type', event.target.value)}>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </label>
            <label className="block">
              <span className="font-medium">Title</span>
              <input className="mt-1 w-full border p-2" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
            </label>
            <label className="block">
              <span className="font-medium">Description</span>
              <textarea className="mt-1 w-full border p-2" rows="5" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="font-medium">Category ID</span>
                <input className="mt-1 w-full border p-2" value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)} />
              </label>
              <label className="block">
                <span className="font-medium">Location</span>
                <input className="mt-1 w-full border p-2" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
              </label>
              <label className="block">
                <span className="font-medium">Date</span>
                <input className="mt-1 w-full border p-2" type="date" value={form.date_occurred} onChange={(event) => updateField('date_occurred', event.target.value)} />
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Save</button>
            <button type="button" className="rounded border px-4 py-2" onClick={() => setEditMode(false)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
