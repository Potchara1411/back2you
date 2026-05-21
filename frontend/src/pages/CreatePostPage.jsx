import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

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

export default function CreatePostPage() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

    try {
      const { data } = await api.post('/posts', {
        ...form,
        category_id: form.category_id || null,
        images,
      });
      navigate(`/posts/${data.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to create post.');
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Create Lost/Found Post</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
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

        <label className="block">
          <span className="font-medium">Images</span>
          <input className="mt-1 w-full border p-2" type="file" accept="image/*" multiple onChange={handleImages} />
          <span className="mt-1 block text-sm text-gray-500">Max 3 images, 15MB total.</span>
        </label>

        {images.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {images.map((image) => (
              <img key={image} className="h-36 w-full rounded object-cover" src={image} alt="Selected upload preview" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Create post</button>
      </form>
    </main>
  );
}
