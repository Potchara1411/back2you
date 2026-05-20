import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_LABEL = {
  open: { text: 'Open', cls: 'bg-green-100 text-green-700' },
  claimed: { text: 'Claimed', cls: 'bg-yellow-100 text-yellow-700' },
  closed: { text: 'Closed', cls: 'bg-gray-100 text-gray-500' },
};

export default function ProfilePage() {
  const { user: authUser, login, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, postsRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/users/me/posts'),
        ]);
        setProfile(profileRes.data);
        setEditName(profileRes.data.name || '');
        setPosts(postsRes.data);
      } catch {
        setError('Failed to load profile. Please refresh.');
      }
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/users/me', { name: editName.trim() });
      setProfile(res.data);
      login(token, res.data);
      setEditing(false);
      setSuccess('Name updated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        {error || 'Loading...'}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {(profile.name || profile.email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{profile.name || '(no name set)'}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            {profile.role === 'admin' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
            )}
          </div>
        </div>

        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Your name"
              maxLength={80}
              autoFocus
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditName(profile.name || ''); setError(''); }}
              className="px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-300"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => { setEditing(true); setSuccess(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit name
          </button>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-3">My Posts</h2>
      {posts.length === 0 ? (
        <p className="text-gray-400 text-sm">You haven't posted anything yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map(post => {
            const badge = STATUS_LABEL[post.status] || STATUS_LABEL.open;
            return (
              <li key={post.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm leading-snug">{post.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>
                  {badge.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
